import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { config } from '../../src/config';
import { CHANNELS, derive, type Card, type ChannelId, type GateView, type IncidentReport, type Msg } from './derive';
import hamperImg from './assets/hamper.jpg';
import voucherImg from './assets/voucher.jpg';
import intugleLogo from './assets/intugle-icon.svg';
import { useCompanionSession } from './session';
import { mockStage, useMockSession } from './mock';
import { buzz, keepAwake, playAlarm, playKnock, unlockAudio } from './alerts';
import { channelOptions, compensationOptions, defaultCustomerDraft, defaultPublicDraft, orchestratorPlan, regionOptions, storesForRegions, workflowStages, type Region } from '../../shared/workflow';
import { AGENT_CHANNEL, DRAFT_FOR_GATE, type DemoState, type DraftField, type GateStage, type PhoneAction } from '../../shared/protocol';

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

const REPORT_DELAY_MS = 2500;
const reportKey = `cypher-companion:report:${new URLSearchParams(location.search).get('s') ?? 'mock'}`;
const emailKey = `cypher-companion:email-step:${new URLSearchParams(location.search).get('s') ?? 'mock'}`;
function readFlag(key: string) { try { return localStorage.getItem(key) === '1'; } catch { return false; } }
function saveFlag(key: string) { try { localStorage.setItem(key, '1'); } catch { /* private mode */ } }

type SessionApi = Pick<ReturnType<typeof useCompanionSession>, 'state' | 'status' | 'me' | 'connected' | 'send' | 'submitEmail'>;

function Workspace({ state, status, me, connected, send, submitEmail }: SessionApi) {
  const view = useMemo(() => derive(state, me, status), [state, me, status]);
  // The phone lives in the incident channel; #general is only background.
  const [active, setActive] = useState<ChannelId>('agents');
  const [drawer, setDrawer] = useState(false);
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const [seen, setSeen] = useState<Record<ChannelId, number>>(() => ({ general: view.channels.general.messages.length, agents: 0 }));
  const [approving, setApproving] = useState<GateStage | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  // Optional email step shown once, just before the report first opens.
  const [emailStep, setEmailStep] = useState(false);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const openReport = () => {
    setDrawer(false);
    if (readFlag(emailKey)) setReportOpen(true);
    else setEmailStep(true);
  };
  const finishEmail = (email: string | null) => {
    saveFlag(emailKey);
    if (email) setSavedEmail(email);
    setEmailStep(false);
    setReportOpen(true);
  };

  // The incident report opens by itself once per run, shortly after the outcome lands; the outcome message can reopen it.
  const hasReport = Boolean(view.report);
  useEffect(() => {
    if (!hasReport) return;
    if (readFlag(reportKey)) return;
    const timer = window.setTimeout(() => { saveFlag(reportKey); openReport(); }, REPORT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [hasReport]);
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
        <button className="sl-btn sl-decline" disabled={status !== 'live'} onClick={() => act({ type: 'stayHuman' })}>{view.start.decline}</button>
      </div>}
      {current.messages.map((msg) => <Message key={msg.id} msg={msg} me={me}>
        {msg.card && <CardView card={msg.card} onReport={openReport} />}
        {msg.gate && view.gates[msg.gate] && <GateBlock gate={view.gates[msg.gate]!} state={state} approving={approving === msg.gate} act={act} />}
      </Message>)}
      {status === 'ended' && current.id !== 'general' && <p className="sl-ended">This demo run has ended. Thanks for being the human in the loop.</p>}
    </main>

    <div className="sl-typing" aria-live="polite">{current.typing ? <><span className="sl-typing-dots"><i /><i /><i /></span><b>{current.typing}</b> is typing…</> : ' '}</div>
    <footer className="sl-composer"><div>Message #{CHANNELS[current.id].name}</div><span aria-hidden="true">＋</span></footer>

    {emailStep && view.report && <EmailStep me={me} submit={submitEmail} onDone={finishEmail} />}
    {reportOpen && view.report && <ReportSheet report={view.report} me={me} email={savedEmail} onClose={() => setReportOpen(false)} />}

    {drawer && <div className="sl-scrim" onClick={() => setDrawer(false)} />}
    <aside className={`sl-drawer${drawer ? ' open' : ''}`} aria-hidden={!drawer}>
      <header><WorkspaceIcon small /><div><strong>{WORKSPACE}</strong><small>Cypher 2026 · Intugle demo</small></div></header>
      <nav>
        <h2>Channels</h2>
        {(['general', 'agents'] as ChannelId[]).filter((id) => channels[id].visible).map((id) => <button key={id} className={`${id === current.id ? 'active' : ''}${unread(id) ? ' unread' : ''}`} onClick={() => { setActive(id); setDrawer(false); }}>
          <span># {CHANNELS[id].name}</span>{unread(id) > 0 && <em>{unread(id)}</em>}
        </button>)}
        <h2>Apps</h2>
        {workflowStages.map((item) => <div key={item.id} className="sl-app-row"><IntugleAvatar size="tiny" />{item.name}<i className="sl-presence" /></div>)}
      </nav>
    </aside>
  </div>;
}

/** The top of a Slack channel with no history yet: name, who created it, and the description. */
function ChannelIntro({ id }: { id: ChannelId }) {
  const { name, topic } = CHANNELS[id];
  const creator = id === 'agents' ? 'Planner Agent' : 'Intugle';
  return <section className="sl-intro">
    <h2><span aria-hidden="true">#</span> {name}</h2>
    <p><b className="sl-intro-mention">@{creator}</b> created this channel today. This is the very beginning of the <b>#{name}</b> channel.</p>
    <p className="sl-intro-desc"><span>Description</span>{topic}</p>
  </section>;
}

/** Every Intugle agent (and the Intugle bot) uses the Intugle logo as its display picture. */
function IntugleAvatar({ size }: { size?: 'tiny' }) {
  return <span className={`sl-avatar logo${size ? ` ${size}` : ''}`} aria-hidden="true"><img src={intugleLogo} alt="" /></span>;
}

function Message({ msg, me, children }: { msg: Msg; me: string; children?: ReactNode }) {
  return <article className={`sl-msg${msg.urgent ? ' urgent' : ''}`}>
    {msg.author.logo ? <IntugleAvatar /> : <span className="sl-avatar" style={{ background: msg.author.color }}>{msg.author.initials}</span>}
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

function CardView({ card, onReport }: { card: Card; onReport: () => void }) {
  switch (card.kind) {
    case 'alert': return <div className="sl-alert-card"><div className="sl-alert-head"><span className="sl-avatar tiny" style={{ background: '#8f342f' }}>S</span><b>@{card.handle}</b><em>Instagram</em></div><p>{card.caption}</p><small>{card.stats}</small></div>;
    case 'result': return <div className="sl-attach" style={{ borderColor: card.color }}><b>{card.title}</b>{card.lines.map((line) => <small key={line}>{line}</small>)}</div>;
    case 'outcome': return <>
      <div className={`sl-attach outcome ${card.tone}`}><b>{card.title}</b>{card.lines.map((line) => <small key={line}>{line}</small>)}</div>
      {card.report && <div className="sl-actions sl-report-open"><button className="sl-btn" onClick={onReport}>📄 View your incident report</button></div>}
    </>;
  }
}

function GateBlock({ gate, state, approving, act }: { gate: GateView; state: DemoState; approving: boolean; act: (action: PhoneAction) => void }) {
  const [editing, setEditing] = useState<GateStage | null>(null);
  const editRule = editing ? DRAFT_FOR_GATE[editing] : undefined;
  const sheet = editRule && editing === gate.stage && gate.interactive && !approving
    ? <DraftEditor
        title={editRule.field === 'publicDraft' ? 'Edit public statement' : 'Edit reply to Sarah'}
        initial={state[editRule.field]}
        max={editRule.max}
        onLive={(text) => act({ type: 'setDraft', field: editRule.field as DraftField, text })}
        onCancel={() => { act({ type: 'setDraft', field: editRule.field as DraftField, text: originalDraft.current ?? state[editRule.field] }); setEditing(null); }}
        onDone={(text) => { act({ type: 'setDraft', field: editRule.field as DraftField, text }); setEditing(null); }}
      />
    : null;
  const originalDraft = useRef<string | null>(null);
  useEffect(() => {
    if (editRule) originalDraft.current = state[editRule.field];
    else originalDraft.current = null;
    // Only capture the text when the sheet opens.
  }, [editing]);
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
          {regionOptions.map((region) => <Check key={region.name} checked={state.regions.includes(region.name)} disabled={disabled} onClick={() => act({ type: 'toggleRegion', region: region.name })} label={region.name} detail={`${region.stores} stores affected`} />)}
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
        <Quote text={state.publicDraft} onEdit={gate.interactive && !approving ? () => setEditing('comms') : undefined} edited={state.publicDraft !== defaultPublicDraft} />
        <div className="sl-field-label">Publish on · {state.channels.length} selected</div>
        <div className="sl-checks">
          {channelOptions.map((channel) => <Check key={channel} checked={state.channels.includes(channel)} disabled={disabled} onClick={() => act({ type: 'toggleChannel', channel })} label={channel} />)}
        </div>
        {approve('Publish statement', { channels: state.channels, draft: state.publicDraft }, state.channels.length === 0 || !state.publicDraft.trim())}
        {sheet}
      </div>;

    case 'support':
      return <div className="sl-blocks">
        <Quote text={state.customerDraft} onEdit={gate.interactive && !approving ? () => setEditing('support') : undefined} edited={state.customerDraft !== defaultCustomerDraft} />
        <div className="sl-field-label">Make it right with</div>
        <div className="sl-options" role="radiogroup">
          {compensationOptions.map((item) => <button key={item.id} role="radio" aria-checked={state.compensation === item.id} className={`sl-option${state.compensation === item.id ? ' selected' : ''}`} disabled={disabled} onClick={() => act({ type: 'setCompensation', compensation: item.id })}>
            <i className="sl-radio" /><span><b>{item.id}</b><small>{item.detail}</small></span>
          </button>)}
        </div>
        {approve('Send to Sarah', { compensation: state.compensation, draft: state.customerDraft }, !state.customerDraft.trim())}
        {sheet}
      </div>;
  }
}

function Check({ checked, disabled, onClick, label, detail }: { checked: boolean; disabled: boolean; onClick: () => void; label: string; detail?: string }) {
  return <button role="checkbox" aria-checked={checked} className={`sl-check${checked ? ' checked' : ''}`} disabled={disabled} onClick={onClick}>
    <i>{checked && <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3 7-7" /></svg>}</i>
    <b>{label}</b>{detail && <small>{detail}</small>}
  </button>;
}

function Quote({ text, onEdit, edited = false }: { text: string; onEdit?: () => void; edited?: boolean }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 220;
  return <blockquote className={`sl-quote${long && !open ? ' clamped' : ''}`}>
    <p>{text}</p>
    <div className="sl-quote-actions">
      {long && <button onClick={() => setOpen((value) => !value)}>{open ? 'Show less' : 'Show more'}</button>}
      {edited && <span className="sl-edited">(edited)</span>}
      {onEdit && <button className="sl-edit-btn" onClick={onEdit}>✎ Edit</button>}
    </div>
  </blockquote>;
}

/** Bottom sheet for editing an agent's draft. Typing updates the laptop's draft box live; Cancel restores the original. */
function DraftEditor({ title, initial, max, onLive, onCancel, onDone }: { title: string; initial: string; max: number; onLive: (text: string) => void; onCancel: () => void; onDone: (text: string) => void }) {
  const [text, setText] = useState(initial);
  const timer = useRef<number | undefined>(undefined);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { area.current?.focus(); return () => window.clearTimeout(timer.current); }, []);
  const change = (value: string) => {
    setText(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onLive(value), 300);
  };
  return <>
    <div className="sl-scrim" onClick={onCancel} />
    <section className="sl-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <header><button onClick={onCancel}>Cancel</button><strong>{title}</strong><button className="primary" disabled={!text.trim()} onClick={() => { window.clearTimeout(timer.current); onDone(text); }}>Done</button></header>
      <textarea ref={area} value={text} maxLength={max} onChange={(event) => change(event.target.value)} />
      <footer><span>Shows live on the big screen</span><span>{text.length}/{max}</span></footer>
    </section>
  </>;
}

/** Full-screen incident report: the visitor's takeaway from the run. */
function ReportSheet({ report, me, email, onClose }: { report: IncidentReport; me: string; email: string | null; onClose: () => void }) {
  return <div className="sl-report" role="dialog" aria-modal="true" aria-label="Incident report">
    <header className="sl-report-bar">
      <button onClick={onClose} aria-label="Close report">✕</button>
      <strong>Incident report</strong>
      <span />
    </header>
    <div className="sl-report-body">
      <section className={`sl-report-hero ${report.tone}`}>
        <span>{report.tone === 'good' ? 'RESOLVED' : report.tone === 'partial' ? 'PARTIALLY RESOLVED' : 'NOT RESOLVED'} · YUMMCHIPS · SARAH’S COMPLAINT</span>
        <h1>{report.title}</h1>
        <p>Human in the loop: <b>{me}</b></p>
      </section>

      <section className="sl-report-times">
        <div className="agents"><small>Intugle agents</small><b>{report.agentMinutes !== null ? `${report.agentMinutes.toFixed(1)} min` : report.decisions[0]?.label === 'Agents' ? 'Not used' : '—'}</b><span>{report.findings.length ? 'Cause and exposure confirmed' : '—'}</span></div>
        <div className="humans"><small>Human team</small><b>13 hrs 40 min</b><span>Root cause still unconfirmed</span></div>
      </section>

      <section className="sl-report-section">
        <h2>Your decisions</h2>
        <ol className="sl-report-decisions">
          {report.decisions.map((item) => <li key={item.label}><b>{item.label}</b><span>{item.value}</span><small>{item.by}</small></li>)}
        </ol>
      </section>

      {report.findings.length > 0 && <section className="sl-report-section">
        <h2>What the agents found</h2>
        <ul className="sl-report-list">{report.findings.map((line) => <li key={line}>{line}</li>)}</ul>
      </section>}

      <section className="sl-report-section">
        <h2>Outcome</h2>
        <ul className={`sl-report-list ${report.tone}`}>{report.outcome.map((line) => <li key={line}>{line}</li>)}</ul>
      </section>

      {report.sarah && <section className="sl-report-section">
        <h2>Sarah’s update</h2>
        <article className="sl-ig">
          <header><span className="sl-avatar tiny" style={{ background: '#8f342f' }}>S</span><b>sarah_mitchell</b><small>just now</small></header>
          <img src={report.sarah.image === 'voucher' ? voucherImg : hamperImg} alt={report.sarah.image === 'voucher' ? 'A £40 YummChips voucher with an apology note' : 'A YummChips apology hamper'} />
          <div className="sl-ig-body">
            <b>♥ {report.sarah.likes.toLocaleString('en-GB')} likes</b>
            <p><b>sarah_mitchell</b> {report.sarah.caption}</p>
            {report.sarah.comments.map((comment) => <p key={comment.handle} className="sl-ig-comment"><b>{comment.handle}</b> {comment.text}</p>)}
          </div>
        </article>
      </section>}

      <footer className="sl-report-foot">
        <p>Every critical decision in this incident was made by a person. The agents connected the evidence and did the work.</p>
        {email && <p className="sl-report-thanks">Thanks, {me}. The Intugle team will be in touch at <b>{email}</b>.</p>}
        <a href="https://intugle.ai" target="_blank" rel="noreferrer">Built with Intugle · intugle.ai</a>
      </footer>
    </div>
  </div>;
}

/** Optional work email, asked once just before the report. Stored in Supabase; nothing is sent to the visitor. */
function EmailStep({ me, submit, onDone }: { me: string; submit: (email: string) => Promise<'ok' | 'invalid' | 'error'>; onDone: (email: string | null) => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!value) { onDone(null); return; }
    setBusy(true);
    setProblem(null);
    const result = await submit(value);
    setBusy(false);
    if (result === 'ok') onDone(value.toLowerCase());
    else setProblem(result === 'invalid' ? 'That doesn’t look like an email address.' : 'Couldn’t save that just now. You can skip and still see your report.');
  };
  return <div className="sl-report sl-email" role="dialog" aria-modal="true" aria-label="Stay in touch">
    <form onSubmit={save} noValidate>
      <span className="sl-email-icon" aria-hidden="true">📄</span>
      <h1>Your incident report is ready</h1>
      <p>Nice work, {me}. Want to talk about agents like these for your team? Leave your work email and the Intugle team will get in touch.</p>
      <label htmlFor="visitor-email">Work email <small>(optional)</small></label>
      <input id="visitor-email" type="email" inputMode="email" autoComplete="email" enterKeyHint="done" placeholder="you@company.com" maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setProblem(null); }} />
      {problem && <p className="sl-email-error" role="alert">{problem}</p>}
      <button type="submit" className="sl-btn primary big" disabled={busy}>{busy ? 'Saving…' : email.trim() ? 'Continue to report' : 'See my report'}</button>
      <button type="button" className="sl-btn sl-decline" disabled={busy} onClick={() => onDone(null)}>Skip</button>
      <small className="sl-email-note">We’ll only use this to contact you about Intugle. We won’t email you the report or add you to a newsletter.</small>
    </form>
  </div>;
}
