import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { config } from '../../src/config';
import { CHANNELS, derive, type Card, type ChannelId, type GateView, type Msg } from './derive';
import { useCompanionSession } from './session';
import { mockStage, useMockSession } from './mock';
import { buzz, keepAwake, playKnock, unlockAudio } from './alerts';
import { channelOptions, compensationOptions, orchestratorPlan, regionOptions, storesForRegions, workflowStages, type Region } from '../../shared/workflow';
import type { DemoState, GateStage, PhoneAction } from '../../shared/protocol';

const WORKSPACE = 'YummChips';

export default function App() {
  return mockStage ? <MockApp /> : <LiveApp />;
}

function MockApp() {
  return <Workspace {...useMockSession()} />;
}

function LiveApp() {
  const session = useCompanionSession();
  const { phase } = session;

  if (phase.kind === 'misconfigured') return <Notice title="Not configured" body="This companion app is missing its Supabase settings." />;
  if (phase.kind === 'no-session') return <Notice title="Scan the QR code at the booth" body="Find the Intugle stand and scan the code on the big screen to join the incident channel." />;
  if (phase.kind === 'checking') return <Notice title="Reconnecting…" body="" />;
  if (phase.kind === 'refused') {
    const copy = {
      taken: ['This demo already has a decision-maker', 'Someone else scanned this run first. Catch the next one: a fresh QR code appears when the walkthrough restarts.'],
      ended: ['This demo has finished', 'Scan the new QR code on the big screen to join the next run.'],
      not_found: ['We couldn’t find this demo', 'Scan the QR code on the big screen again.'],
      error: ['Couldn’t connect', 'Check your mobile data and scan the QR code again.'],
    }[phase.reason];
    return <Notice title={copy[0]} body={copy[1]} />;
  }
  if (phase.kind === 'join' || phase.kind === 'joining') return <JoinScreen busy={phase.kind === 'joining'} onJoin={(name) => { unlockAudio(); void session.join(name); }} />;
  return <Workspace {...session} />;
}

function Notice({ title, body }: { title: string; body: string }) {
  return <main className="notice"><WorkspaceIcon /><h1>{title}</h1>{body && <p>{body}</p>}</main>;
}

function WorkspaceIcon({ small = false }: { small?: boolean }) {
  return <span className={`ws-icon${small ? ' small' : ''}`} aria-hidden="true">Y</span>;
}

function JoinScreen({ busy, onJoin }: { busy: boolean; onJoin: (name: string) => void }) {
  const [name, setName] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); if (!busy) onJoin(name); };
  return <main className="join">
    <WorkspaceIcon />
    <p className="join-eyebrow">You’ve been invited to</p>
    <h1>{WORKSPACE}</h1>
    <p className="join-lede">Join <b>#incident-hld-2407-a</b> as the incident owner. AI agents will ask you to approve every critical decision.</p>
    <form onSubmit={submit}>
      <label htmlFor="name">What should the agents call you?</label>
      <input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your first name (optional)" autoComplete="given-name" maxLength={32} enterKeyHint="go" />
      <button type="submit" disabled={busy}>{busy ? 'Joining…' : 'Join the channel'}</button>
    </form>
    <p className="join-foot">Part of the Intugle live demo at Cypher 2026. Fictional incident.</p>
  </main>;
}

type SessionApi = Pick<ReturnType<typeof useCompanionSession>, 'state' | 'status' | 'me' | 'connected' | 'send'>;

function Workspace({ state, status, me, connected, send }: SessionApi) {
  const view = useMemo(() => derive(state, me, status), [state, me, status]);
  const [active, setActive] = useState<ChannelId>('general');
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [seen, setSeen] = useState<Record<ChannelId, number>>({ general: 0, incident: 0, agents: 0 });
  const [approving, setApproving] = useState<GateStage | null>(null);
  const feed = useRef<HTMLDivElement>(null);
  const announced = useRef<{ incident: boolean; agents: boolean }>({ incident: false, agents: false });
  const lastAlert = useRef<GateStage | null>(null);

  useEffect(() => keepAwake(), []);

  // Follow the story: open the human channel when it starts, then announce the agent channel.
  useEffect(() => {
    if (view.channels.incident.visible && !announced.current.incident) {
      announced.current.incident = true;
      setActive('incident');
    }
    if (!view.channels.incident.visible) announced.current.incident = false;
    if (view.channels.agents.visible && !announced.current.agents) {
      announced.current.agents = true;
      setToast(`Orchestrator Agent added you to #${CHANNELS.agents.name}`);
    }
    if (!view.channels.agents.visible) {
      announced.current.agents = false;
      setActive((current) => current === 'agents' ? (view.channels.incident.visible ? 'incident' : 'general') : current);
    }
  }, [view.channels.incident.visible, view.channels.agents.visible]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => { setActive('agents'); setToast(null); }, 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Approval requests: sound, vibration, and jump to the agents channel.
  useEffect(() => {
    if (view.activeGate && view.activeGate !== lastAlert.current) {
      playKnock();
      buzz();
      setActive('agents');
      setDrawer(false);
    }
    lastAlert.current = view.activeGate;
    if (!view.activeGate) setApproving(null);
  }, [view.activeGate]);

  const current = view.channels[active].visible ? view.channels[active] : view.channels.general;
  const messageCount = current.messages.length;

  useEffect(() => {
    setSeen((value) => value[current.id] === messageCount ? value : { ...value, [current.id]: messageCount });
  }, [current.id, messageCount]);

  useEffect(() => {
    const el = feed.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [current.id, messageCount, current.typing, view.activeGate]);

  const unread = (id: ChannelId) => view.channels[id].visible && id !== current.id ? Math.max(0, view.channels[id].messages.length - seen[id]) : 0;
  const anyUnread = (['general', 'incident', 'agents'] as ChannelId[]).some((id) => unread(id) > 0);

  const act = (action: PhoneAction) => {
    if (action.type === 'approve') setApproving(action.stage);
    if (action.type === 'start') unlockAudio();
    send(action);
  };

  return <div className="slack">
    <header className="sl-top">
      <button className="sl-menu" onClick={() => setDrawer(true)} aria-label="Open channel list">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
        {anyUnread && <i className="sl-dot" />}
      </button>
      <div className="sl-title">
        <strong># {CHANNELS[current.id].name}</strong>
        <small>{current.id === 'agents' ? `${workflowStages.length + 1} members · ${workflowStages.length} agents` : CHANNELS[current.id].topic}</small>
      </div>
      <span className={`sl-conn${connected ? ' on' : ''}`} title={connected ? 'Connected' : 'Reconnecting'} />
    </header>

    {toast && <div className="sl-toast" role="status" onClick={() => { setActive('agents'); setToast(null); }}><b>#</b>{toast}</div>}
    {view.bannerScene && <div className="sl-scene" role="status"><span aria-hidden="true">👀</span> Watch the big screen · {view.bannerScene}</div>}

    <main ref={feed} className="sl-feed" aria-live="polite">
      <ChannelIntro id={current.id} me={me} />
      {current.messages.map((msg) => <Message key={msg.id} msg={msg} me={current.id === 'incident' ? '\u0000' : me}>
        {msg.card && <CardView card={msg.card} onStart={() => act({ type: 'start' })} disabled={status !== 'live'} />}
        {msg.gate && view.gates[msg.gate] && <GateBlock gate={view.gates[msg.gate]!} state={state} approving={approving === msg.gate} act={act} />}
      </Message>)}
      {status === 'ended' && current.id !== 'general' && <p className="sl-ended">This demo run has ended. Thanks for being the human in the loop.</p>}
    </main>

    <div className="sl-typing" aria-live="polite">{current.typing ? <><span className="sl-typing-dots"><i /><i /><i /></span><b>{current.typing}</b> is typing…</> : ' '}</div>
    <footer className="sl-composer"><div>Message #{CHANNELS[current.id].name}</div><span aria-hidden="true">＋</span></footer>

    {drawer && <div className="sl-scrim" onClick={() => setDrawer(false)} />}
    <aside className={`sl-drawer${drawer ? ' open' : ''}`} aria-hidden={!drawer}>
      <header><WorkspaceIcon small /><div><strong>{WORKSPACE}</strong><small>Cypher 2026 · Intugle demo</small></div></header>
      <nav>
        <h2>Channels</h2>
        {(['general', 'incident', 'agents'] as ChannelId[]).filter((id) => view.channels[id].visible).map((id) => <button key={id} className={`${id === current.id ? 'active' : ''}${unread(id) ? ' unread' : ''}`} onClick={() => { setActive(id); setDrawer(false); }}>
          <span># {CHANNELS[id].name}</span>{unread(id) > 0 && <em>{unread(id)}</em>}
        </button>)}
        <h2>Apps</h2>
        {workflowStages.map((item) => <div key={item.id} className="sl-app-row"><span className="sl-avatar tiny" style={{ background: item.color }}>{item.initials}</span>{item.name}<i className="sl-presence" /></div>)}
      </nav>
    </aside>
  </div>;
}

function ChannelIntro({ id, me }: { id: ChannelId; me: string }) {
  if (id === 'agents') return <section className="sl-intro">
    <div className="sl-intro-avatars">{workflowStages.map((item) => <span key={item.id} className="sl-avatar small" style={{ background: item.color }}>{item.initials}</span>)}</div>
    <h2># {CHANNELS.agents.name}</h2>
    <p>Orchestrator Agent created this channel for the HLD-2407-A response and added you, {me}, as the approver. Same incident, starting from Sarah’s post at 09:00.</p>
  </section>;
  return <section className="sl-intro"><h2># {CHANNELS[id].name}</h2><p>This is the very beginning of the <b>#{CHANNELS[id].name}</b> channel. {CHANNELS[id].topic}.</p></section>;
}

function Message({ msg, me, children }: { msg: Msg; me: string; children?: ReactNode }) {
  return <article className="sl-msg">
    <span className="sl-avatar" style={{ background: msg.author.color }}>{msg.author.initials}</span>
    <div className="sl-msg-body">
      <div className="sl-msg-head"><b>{msg.author.name}</b>{msg.author.app && <em>APP</em>}<time>{msg.time}</time></div>
      {msg.author.role && <div className="sl-role">{msg.author.role}</div>}
      <p>{rich(msg.text, me)}</p>
      {children}
    </div>
  </article>;
}

function rich(text: string, me: string) {
  const escaped = me.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(@${escaped}(?![\\w])|@\\w+|\\*[^*]+\\*)`, 'g');
  return text.split(pattern).map((part, i) => {
    if (part.startsWith('@')) return <span key={i} className={`sl-mention${part === `@${me}` ? ' me' : ''}`}>{part}</span>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <b key={i}>{part.slice(1, -1)}</b>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function CardView({ card, onStart, disabled }: { card: Card; onStart: () => void; disabled: boolean }) {
  switch (card.kind) {
    case 'start': return <div className="sl-blocks"><button className="sl-btn primary big" disabled={disabled} onClick={onStart}>▶ Start the investigation</button><small className="sl-hint">The walkthrough starts on the big screen.</small></div>;
    case 'attachment': return <div className="sl-file"><span>XLS</span><div><b>{card.title}</b><small>{card.status}</small></div></div>;
    case 'result': return <div className="sl-attach" style={{ borderColor: card.color }}><b>{card.title}</b>{card.lines.map((line) => <small key={line}>{line}</small>)}</div>;
    case 'outcome': return <div className={`sl-attach outcome ${card.tone}`}><b>{card.title}</b>{card.lines.map((line) => <small key={line}>{line}</small>)}</div>;
    case 'plan': return null;
  }
}

function GateBlock({ gate, state, approving, act }: { gate: GateView; state: DemoState; approving: boolean; act: (action: PhoneAction) => void }) {
  const disabled = !gate.interactive || approving;
  const footer = gate.resolvedText ? <div className="sl-resolved">{gate.resolvedText}</div> : null;
  const approve = (label: string, extra: Partial<Extract<PhoneAction, { type: 'approve' }>> = {}, blocked = false) => gate.resolvedText ? footer : <div className="sl-actions"><button className="sl-btn primary" disabled={disabled || blocked} onClick={() => act({ type: 'approve', stage: gate.stage, ...extra })}>{approving ? 'Sending…' : label}</button></div>;

  switch (gate.stage) {
    case 'orchestratorApproval':
      return <div className="sl-blocks">
        <ol className="sl-plan">{orchestratorPlan.map(([title, detail]) => <li key={title}><b>{title}</b><small>{detail}</small></li>)}</ol>
        {approve('Approve plan')}
      </div>;

    case 'resolution':
      return <div className="sl-blocks">
        <div className="sl-evidence"><span>✓ Batch identified</span><span>✓ Root cause confirmed</span><span>✓ 40-store exposure linked</span></div>
        <div className="sl-options" role="radiogroup">
          {config.agentRace.decisions.map((item) => <button key={item.id} role="radio" aria-checked={state.decisionId === item.id} className={`sl-option risk-${item.risk}${state.decisionId === item.id ? ' selected' : ''}`} disabled={disabled} onClick={() => act({ type: 'chooseDecision', decisionId: item.id })}>
            <i className="sl-radio" /><span><b>{item.title}</b>{item.badge && <em>{item.badge}</em>}<small>{item.description}</small></span>
          </button>)}
        </div>
        {approve('Confirm response', { decisionId: state.decisionId ?? 'full' })}
      </div>;

    case 'recall': {
      const stores = storesForRegions(state.regions);
      return <div className="sl-blocks">
        <div className="sl-field-label">{stores} of 40 stores selected</div>
        <div className="sl-checks">
          {regionOptions.map((region) => <Check key={region.name} checked={state.regions.includes(region.name)} disabled={disabled} onClick={() => act({ type: 'toggleRegion', region: region.name })} label={region.name} detail={`${region.stores} stores`} />)}
        </div>
        {!gate.resolvedText && <div className="sl-actions">
          <button className="sl-btn" disabled={disabled} onClick={() => act({ type: 'setRegions', regions: regionOptions.map((item) => item.name) as Region[] })}>Select all 40</button>
          <button className="sl-btn primary" disabled={disabled || state.regions.length === 0} onClick={() => act({ type: 'approve', stage: 'recall', regions: state.regions })}>{approving ? 'Sending…' : 'Issue withdrawal orders'}</button>
        </div>}
        {footer}
      </div>;
    }

    case 'comms':
      return <div className="sl-blocks">
        <Quote text={state.publicDraft} />
        <div className="sl-field-label">Publish on · {state.channels.length} selected</div>
        <div className="sl-checks">
          {channelOptions.map((channel) => <Check key={channel} checked={state.channels.includes(channel)} disabled={disabled} onClick={() => act({ type: 'toggleChannel', channel })} label={channel} />)}
        </div>
        {approve('Publish statement', { channels: state.channels }, state.channels.length === 0)}
      </div>;

    case 'support':
      return <div className="sl-blocks">
        <Quote text={state.customerDraft} />
        <div className="sl-field-label">Make it right with</div>
        <div className="sl-options" role="radiogroup">
          {compensationOptions.map((item) => <button key={item.id} role="radio" aria-checked={state.compensation === item.id} className={`sl-option${state.compensation === item.id ? ' selected' : ''}`} disabled={disabled} onClick={() => act({ type: 'setCompensation', compensation: item.id })}>
            <i className="sl-radio" /><span><b>{item.id}</b><small>{item.detail}</small></span>
          </button>)}
        </div>
        {approve('Send to Sarah', { compensation: state.compensation })}
      </div>;
  }
}

function Check({ checked, disabled, onClick, label, detail }: { checked: boolean; disabled: boolean; onClick: () => void; label: string; detail?: string }) {
  return <button role="checkbox" aria-checked={checked} className={`sl-check${checked ? ' checked' : ''}`} disabled={disabled} onClick={onClick}>
    <i>{checked && <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3 7-7" /></svg>}</i>
    <b>{label}</b>{detail && <small>{detail}</small>}
  </button>;
}

function Quote({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 220;
  return <blockquote className={`sl-quote${long && !open ? ' clamped' : ''}`}>
    <p>{text}</p>
    {long && <button onClick={() => setOpen((value) => !value)}>{open ? 'Show less' : 'Show more'}</button>}
  </blockquote>;
}
