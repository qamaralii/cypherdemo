import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { config } from '../../src/config';
import { CHANNELS, derive, type Card, type ChannelId, type GateView, type Msg } from './derive';
import { useCompanionSession } from './session';
import { mockStage, useMockSession } from './mock';
import { buzz, keepAwake, playAlarm, playKnock, unlockAudio } from './alerts';
import { channelOptions, compensationOptions, orchestratorPlan, regionOptions, storesForRegions, workflowStages, type Region } from '../../shared/workflow';
import { AGENT_CHANNEL, type DemoState, type GateStage, type PhoneAction } from '../../shared/protocol';

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
    <p className="join-lede">Join <b>#{AGENT_CHANNEL}</b> as the incident owner. Intugle’s AI agents will ask you to approve every critical decision.</p>
    <form onSubmit={submit}>
      <label htmlFor="name">What should the agents call you?</label>
      <input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your first name (optional)" autoComplete="given-name" maxLength={32} enterKeyHint="go" />
      <button type="submit" disabled={busy}>{busy ? 'Joining…' : 'Join the channel'}</button>
    </form>
    <p className="join-foot">Part of the Intugle live demo at Cypher 2026. Fictional incident.</p>
  </main>;
}

/** The workspace gets this long to settle before any alert can fire, and alerts always trail their trigger slightly. */
const SETTLE_MS = 4000;
const ALERT_MIN_DELAY_MS = 1500;

// Alerts already delivered on this phone for this run, so a reload doesn't replay the alarm.
const alertsKey = `cypher-companion:alerts:${new URLSearchParams(location.search).get('s') ?? 'mock'}`;
function readShownAlerts(): string[] { try { return JSON.parse(localStorage.getItem(alertsKey) ?? '[]'); } catch { return []; } }
function saveShownAlerts(ids: string[]) { try { localStorage.setItem(alertsKey, JSON.stringify(ids)); } catch { /* private mode */ } }

type SessionApi = Pick<ReturnType<typeof useCompanionSession>, 'state' | 'status' | 'me' | 'connected' | 'send'>;

function Workspace({ state, status, me, connected, send }: SessionApi) {
  const view = useMemo(() => derive(state, me, status), [state, me, status]);
  // The phone lives in the incident channel; #general is only background.
  const [active, setActive] = useState<ChannelId>('agents');
  const [drawer, setDrawer] = useState(false);
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const [seen, setSeen] = useState<Record<ChannelId, number>>(() => ({ general: view.channels.general.messages.length, agents: 0 }));
  const [approving, setApproving] = useState<GateStage | null>(null);
  const feed = useRef<HTMLDivElement>(null);
  const lastAlert = useRef<GateStage | null>(null);
  const mountedAt = useRef(Date.now());
  const [shownAlerts, setShownAlerts] = useState<string[]>(readShownAlerts);

  useEffect(() => keepAwake(), []);

  // Agent alerts arrive like a push notification: banner, alarm, vibration, then the agents channel opens.
  // They never fire the instant the app opens: the workspace gets a few seconds to settle first.
  const alertId = view.alert?.id;
  const alertRef = useRef(view.alert);
  alertRef.current = view.alert;
  const alertPending = Boolean(alertId && !shownAlerts.includes(alertId));
  useEffect(() => {
    if (!alertId || shownAlerts.includes(alertId)) return;
    const delay = Math.max(ALERT_MIN_DELAY_MS, mountedAt.current + SETTLE_MS - Date.now());
    const timer = window.setTimeout(() => {
      const incoming = alertRef.current;
      if (!incoming) return;
      setShownAlerts((current) => { const next = [...current, incoming.id]; saveShownAlerts(next); return next; });
      setNotice({ title: incoming.title, body: incoming.body });
      setDrawer(false);
      playAlarm();
      buzz([220, 90, 220, 90, 220]);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [alertId, shownAlerts]);

  // Re-arm alerts when the laptop steps back before them (to the Social Media run or the human summary),
  // so running forward again shows the banner again. A plain reload during the gate still doesn't replay it.
  const beforeAlert = state.stage === null || state.stage === 'socialMedia';
  useEffect(() => {
    if (!beforeAlert || shownAlerts.length === 0) return;
    setShownAlerts([]);
    saveShownAlerts([]);
  }, [beforeAlert, shownAlerts.length]);

  const channels = view.channels;

  useEffect(() => {
    if (!notice) return;
    const open = window.setTimeout(() => setActive('agents'), 1200);
    const hide = window.setTimeout(() => setNotice(null), 6000);
    return () => { window.clearTimeout(open); window.clearTimeout(hide); };
  }, [notice]);

  // Approval requests: sound, vibration, and jump to the agents channel.
  useEffect(() => {
    if (view.activeGate && view.activeGate !== lastAlert.current) {
      // The Start-investigation gate arrives with the incident alert, which has its own sound and reveal;
      // after a reload (alert already shown) just open the channel quietly.
      if (view.activeGate === 'socialMediaApproval') {
        if (!alertPending) setActive('agents');
      } else {
        playKnock();
        buzz();
        setActive('agents');
        setDrawer(false);
      }
    }
    lastAlert.current = view.activeGate;
    if (!view.activeGate) setApproving(null);
  }, [view.activeGate, alertPending]);

  const current = channels[active].visible ? channels[active] : channels.general;
  const messageCount = current.messages.length;

  useEffect(() => {
    setSeen((value) => value[current.id] === messageCount ? value : { ...value, [current.id]: messageCount });
  }, [current.id, messageCount]);

  useEffect(() => {
    const el = feed.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [current.id, messageCount, current.typing, view.activeGate]);

  const unread = (id: ChannelId) => channels[id].visible && id !== current.id ? Math.max(0, channels[id].messages.length - seen[id]) : 0;
  const anyUnread = (['general', 'agents'] as ChannelId[]).some((id) => unread(id) > 0);

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

    {notice && <button className="sl-notice" role="alert" onClick={() => { setActive('agents'); setNotice(null); }}>
      <span className="sl-notice-icon" aria-hidden="true">Y</span>
      <span className="sl-notice-text"><span className="sl-notice-meta"><b>{WORKSPACE}</b> · #{AGENT_CHANNEL} · now</span><b>{notice.title}</b><span>{rich(notice.body, me)}</span></span>
    </button>}

    <main ref={feed} className="sl-feed" aria-live="polite">
      <ChannelIntro id={current.id} />
      {current.id === 'agents' && current.messages.length === 0 && view.start && <div className="sl-empty">
        <button className="sl-btn primary big" disabled={status !== 'live'} onClick={() => act({ type: 'start' })}>▶ {view.start.label}</button>
      </div>}
      {current.messages.map((msg) => <Message key={msg.id} msg={msg} me={me}>
        {msg.card && <CardView card={msg.card} />}
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
        {(['general', 'agents'] as ChannelId[]).filter((id) => channels[id].visible).map((id) => <button key={id} className={`${id === current.id ? 'active' : ''}${unread(id) ? ' unread' : ''}`} onClick={() => { setActive(id); setDrawer(false); }}>
          <span># {CHANNELS[id].name}</span>{unread(id) > 0 && <em>{unread(id)}</em>}
        </button>)}
        <h2>Apps</h2>
        {workflowStages.map((item) => <div key={item.id} className="sl-app-row"><span className="sl-avatar tiny" style={{ background: item.color }}>{item.initials}</span>{item.name}<i className="sl-presence" /></div>)}
      </nav>
    </aside>
  </div>;
}

/** The top of a Slack channel with no history yet: name, who created it, the description, and the usual action chips. */
function ChannelIntro({ id }: { id: ChannelId }) {
  const { name, topic } = CHANNELS[id];
  const creator = id === 'agents' ? 'Planner Agent' : 'Intugle';
  return <section className="sl-intro">
    <h2><span aria-hidden="true">#</span> {name}</h2>
    <p><b className="sl-intro-mention">@{creator}</b> created this channel today. This is the very beginning of the <b>#{name}</b> channel.</p>
    <p className="sl-intro-desc"><span>Description</span>{topic}</p>
    <div className="sl-intro-chips" aria-hidden="true"><span>＋ Add people</span><span>✎ Edit description</span><span>🔔 Notifications on</span></div>
  </section>;
}

function Message({ msg, me, children }: { msg: Msg; me: string; children?: ReactNode }) {
  return <article className={`sl-msg${msg.urgent ? ' urgent' : ''}`}>
    <span className="sl-avatar" style={{ background: msg.author.color }}>{msg.author.initials}</span>
    <div className="sl-msg-body">
      <div className="sl-msg-head"><b>{msg.author.name}</b>{msg.author.app && <em>APP</em>}<time>{msg.time}</time></div>
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

function CardView({ card }: { card: Card }) {
  switch (card.kind) {
    case 'alert': return <div className="sl-alert-card"><div className="sl-alert-head"><span className="sl-avatar tiny" style={{ background: '#8f342f' }}>S</span><b>@{card.handle}</b><em>Instagram</em></div><p>{card.caption}</p><small>{card.stats}</small></div>;
    case 'result': return <div className="sl-attach" style={{ borderColor: card.color }}><b>{card.title}</b>{card.lines.map((line) => <small key={line}>{line}</small>)}</div>;
    case 'outcome': return <div className={`sl-attach outcome ${card.tone}`}><b>{card.title}</b>{card.lines.map((line) => <small key={line}>{line}</small>)}</div>;
  }
}

function GateBlock({ gate, state, approving, act }: { gate: GateView; state: DemoState; approving: boolean; act: (action: PhoneAction) => void }) {
  const disabled = !gate.interactive || approving;
  const footer = gate.resolvedText ? <div className="sl-resolved">{gate.resolvedText}</div> : null;
  const approve = (label: string, extra: Partial<Extract<PhoneAction, { type: 'approve' }>> = {}, blocked = false) => gate.resolvedText ? footer : <div className="sl-actions"><button className="sl-btn primary" disabled={disabled || blocked} onClick={() => act({ type: 'approve', stage: gate.stage, ...extra })}>{approving ? 'Sending…' : label}</button></div>;

  switch (gate.stage) {
    case 'socialMediaApproval':
      return <div className="sl-blocks">{approve('🔍 Start investigation')}</div>;

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
