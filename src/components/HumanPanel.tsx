import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { config } from '../config';

function formatElapsed(hms: string): string {
  const [h, m] = hms.split(':').map(Number);
  if (!h && !m) return '0 mins';
  if (!h) return `${m} mins`;
  if (!m) return `${h} hrs`;
  return `${h} hrs ${m} mins`;
}

interface HumanMessage {
  initials: string;
  name: string;
  role: string;
  timestamp: string;
  delay: string;
  cumulative: string;
  message: string;
  status: string;
  attachment?: string;
  attachmentStatus?: string;
  threaded?: boolean;
}

const messages: HumanMessage[] = [
  { initials: 'AV', name: 'Ava Reid', role: 'Social Media Intern', timestamp: '12:00', delay: '3 hrs', cumulative: '03:00:00', message: '@Maya, I have flagged @sarah_mitchell’s mould complaint. It is gaining attention and names our product.', status: 'Escalated from social monitoring' },
  { initials: 'MC', name: 'Maya Collins', role: 'Customer Care Lead', timestamp: '12:20', delay: '20 min', cumulative: '03:20:00', message: '@Priya, I have reviewed Ava’s escalation. Please confirm the batch and whether this needs immediate quality action.', status: 'Senior review started', threaded: true },
  { initials: 'PS', name: 'Priya Shah', role: 'Quality Lead', timestamp: '13:05', delay: '45 min', cumulative: '04:05:00', message: '@Marcus, batch HLD-2407-A is involved. Can you confirm the Line 4 sealing logs and production shift?', status: 'Production review requested' },
  { initials: 'ML', name: 'Marcus Lee', role: 'Plant Manager', timestamp: '14:30', delay: '1 hr 25 min', cumulative: '05:30:00', message: '@Elena, the batch ran on Line 4. Please trace which stores received the released cartons.', status: 'Dispatch trace requested', threaded: true },
  { initials: 'ER', name: 'Elena Ruiz', role: 'Supply Chain Manager', timestamp: '16:15', delay: '1 hr 45 min', cumulative: '07:15:00', message: '@Noah, I need the store-level dispatch export analysed. IT says the detailed file needs another access request.', status: 'Awaiting store data' },
  { initials: 'NB', name: 'Noah Bennett', role: 'Analytics Lead', timestamp: '18:40', delay: '2 hrs 25 min', cumulative: '09:40:00', message: '@Maya, the export headers do not match our model. I cannot complete the exposure analysis without a corrected file.', status: 'Analysis blocked', attachment: 'store_dispatch_export.xlsx', attachmentStatus: 'Rejected by Analytics', threaded: true },
  { initials: 'MC', name: 'Maya Collins', role: 'Customer Care Lead', timestamp: '20:55', delay: '2 hrs 15 min', cumulative: '11:55:00', message: '@Priya, customers are still asking for an answer. What can the social team safely say while the investigation continues?', status: 'Public response on hold' },
  { initials: 'PS', name: 'Priya Shah', role: 'Quality Lead', timestamp: '22:40', delay: '1 hr 45 min', cumulative: '13:40:00', message: '@Marcus, @Elena, @Noah, we still cannot confirm the sealing failure or the full list of affected stores.', status: 'Escalated · unresolved', threaded: true },
];
export const HUMAN_MESSAGE_COUNT = messages.length;

const people = [
  ['AV', 'Ava'], ['PS', 'Priya'], ['ML', 'Marcus'], ['ER', 'Elena'], ['NB', 'Noah'], ['MC', 'Maya'],
];

interface Props {
  paused: boolean;
  guided?: boolean;
  onComplete: () => void;
  collapsed?: boolean;
  drawerOpen?: boolean;
  onToggleCollapsed?: () => void;
  onCloseDrawer?: () => void;
  showAgentChoice?: boolean;
  onUnleashAgents?: () => void;
  onStayHuman?: () => void;
  showSummary?: boolean;
  jumpToStart?: number;
  jumpToEnd?: number;
  jumpToMessage?: { step: number; id: number };
  onStepChange?: (step: number) => void;
}

export function HumanPanel({ paused, guided = false, onComplete, collapsed = false, drawerOpen = false, onToggleCollapsed, onCloseDrawer, showAgentChoice = false, onUnleashAgents, onStayHuman, showSummary = true, jumpToStart, jumpToEnd, jumpToMessage, onStepChange }: Props) {
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const pausedRef = useRef(paused);
  const dingContext = useRef<AudioContext | null>(null);
  const manuallyPaused = useRef(false);
  const previousPaused = useRef(paused);
  const onCompleteRef = useRef(onComplete);
  pausedRef.current = paused;
  onCompleteRef.current = onComplete;

  const playMessageDing = useCallback(() => {
    if (pausedRef.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      const context = dingContext.current ?? new AudioContext();
      dingContext.current = context;
      context.resume().catch(() => {});
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(740, now);
      oscillator.frequency.exponentialRampToValueAtTime(1_080, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.23);
    } catch {
      // A notification tone must never interrupt the visual incident simulation.
    }
  }, []);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const interval = reduced ? 0.9 : 4.5;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        paused: true,
        onComplete: () => {
          setComplete(true);
          onCompleteRef.current();
        },
      });
      messages.forEach((_, i) => {
        tl.call(() => {
          setStep(i);
          onStepChange?.(i);
          if (i > 0) playMessageDing();
        }, [], i * interval);
        if (!reduced) {
          tl.fromTo('.channel-typing-dot', { opacity: 0.2 }, { opacity: 1, stagger: 0.12, repeat: 2, yoyo: true, duration: 0.22 }, i * interval);
        }
      });
      tl.to({}, { duration: reduced ? 0.5 : 3 });
      timeline.current = tl;
    }, root);
    return () => ctx.revert();
  }, [onStepChange, playMessageDing]);

  useEffect(() => {
    if (!timeline.current) return;
    if (paused) {
      timeline.current.pause();
    } else if (previousPaused.current) {
      manuallyPaused.current = false;
      timeline.current.play();
    } else if (manuallyPaused.current) {
      timeline.current.pause();
    } else {
      timeline.current.play();
    }
    previousPaused.current = paused;
  }, [paused, jumpToMessage]);
  useEffect(() => {
    if (jumpToStart === undefined || !timeline.current) return;
    timeline.current.pause(0);
    setStep(0);
    setComplete(false);
  }, [jumpToStart]);
  useEffect(() => {
    if (jumpToEnd === undefined || !timeline.current) return;
    timeline.current.pause().progress(1);
    setStep(messages.length - 1);
    setComplete(true);
  }, [jumpToEnd]);
  useEffect(() => {
    if (!jumpToMessage || !timeline.current) return;
    const interval = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.9 : 4.5;
    const nextStep = Math.max(0, Math.min(messages.length - 1, jumpToMessage.step));
    manuallyPaused.current = true;
    timeline.current.pause().time(nextStep * interval);
    setStep(nextStep);
    setComplete(false);
    onStepChange?.(nextStep);
  }, [jumpToMessage, onStepChange]);
  useEffect(() => {
    if (showSummary) setComplete(true);
  }, [showSummary]);
  useEffect(() => {
    feedRef.current?.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [step]);

  const current = messages[step]!;
  const visibleMessages = messages.slice(Math.max(0, step - 3), step + 1);

  return (
    <section
      ref={root}
      className={`race-panel human-workspace${collapsed ? ' human-workspace-collapsed' : ''}${drawerOpen ? ' human-workspace-drawer' : ''}`}
      onClick={collapsed ? onToggleCollapsed : undefined}
      onKeyDown={collapsed && onToggleCollapsed ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') onToggleCollapsed();
      } : undefined}
      tabIndex={collapsed ? 0 : undefined}
      aria-label={collapsed ? 'Expand Human Teams panel' : undefined}
    >
      <header className="race-panel-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="race-eyebrow amber">01 /</span>
          <h2>Human Teams</h2>
        </div>
        {collapsed && onToggleCollapsed && (
          <button className="human-rail-toggle" onClick={(event) => { event.stopPropagation(); onToggleCollapsed(); }} aria-label="Expand Human Teams panel">
            ↗
          </button>
        )}
        {drawerOpen && onCloseDrawer && (
          <button className="human-drawer-close" onClick={onCloseDrawer} aria-label="Collapse Human Teams panel">
            ×
          </button>
        )}
        <div className="race-clock amber">
          {formatElapsed(current.cumulative)}
          <small>total time elapsed</small>
        </div>
      </header>

      {guided && (
        <div className="tour-callout tour-callout-human">
          <span>STEP 1 OF 2</span>
          <p>Follow colleagues coordinating through messages, files, and access requests.</p>
        </div>
      )}

      <div className="human-channel">
        <header className="channel-header">
          <div>
            <strong># incident-hld-2407-a</strong>
            <small>Live incident coordination · 6 members · senior review began 3 hrs 20 mins after the post</small>
          </div>
          <div className="channel-people" aria-label="Channel members">
            {people.map(([initials, name], i) => (
              <span key={initials} title={name} style={{ zIndex: people.length - i }}>{initials}</span>
            ))}
          </div>
        </header>

        <div className="social-escalation-banner" role="status">
          <div className="social-escalation-title">
            <span className="social-escalation-icon" aria-hidden="true">!</span>
            <div>
              <strong>Customer complaint sat unseen on social media</strong>
              <p>Sarah&apos;s post was published at <b>09:00</b>. No senior team member saw it until <b>12:20</b>.</p>
            </div>
          </div>
          <div className="social-escalation-events">
            <div><b>3 HRS</b><span>post went unseen</span></div>
            <div><b>12:00</b><span>Ava, Social Media Intern, flags the post</span></div>
            <div><b>+20 MIN</b><span>Maya begins senior review</span></div>
          </div>
          <em>Investigation began 3 hrs 20 mins after the post</em>
        </div>

        <div ref={feedRef} className="channel-feed" aria-live="polite">
          <div className="channel-start">Sarah&apos;s post published at 09:00 · incident channel opened at 12:20 after senior review</div>
          {visibleMessages.map((message, visibleIndex) => {
            const messageIndex = Math.max(0, step - 3) + visibleIndex;
            const isLatest = messageIndex === step;
            return (
              <div key={`${message.timestamp}-${message.name}`} className={`channel-message-block${isLatest ? ' message-current' : ''}${messageIndex === 0 ? ' social-detection-message' : ''}`}>
                <div className="delay-divider"><span><b aria-hidden="true">◷</b>{message.delay} later</span></div>
                <article className={`colleague-message${message.threaded ? ' threaded-message' : ''}`}>
                  <span className="colleague-avatar">{message.initials}</span>
                  <div className="message-body">
                    <div className="message-author">
                      <strong>{message.name}</strong>
                      <span>{message.role}</span>
                      <time>{message.timestamp}</time>
                    </div>
                    {messageIndex === 0 && <span className="social-detection-label">FIRST HUMAN SIGNAL · SOCIAL MEDIA INTERN</span>}
                    <p>{renderMentions(message.message)}</p>
                    {message.attachment && (
                      <div className="channel-attachment">
                        <span className="file-icon">▤</span>
                        <div><strong>{message.attachment}</strong><small>{message.attachmentStatus}</small></div>
                      </div>
                    )}
                    <div className="message-status"><span />{message.status}</div>
                  </div>
                </article>
              </div>
            );
          })}

          {!complete && (
            <div className="typing-row">
              <span>{step < messages.length - 1 ? messages[step + 1]!.name : 'Management'} is typing</span>
              <i className="channel-typing-dot" /><i className="channel-typing-dot" /><i className="channel-typing-dot" />
            </div>
          )}
        </div>
        {showSummary && (
          <div className="human-final-state">
            <span className="race-eyebrow">{config.agentRace.humanSummary.headline}</span>
            <strong>{config.agentRace.humanSummary.elapsed}</strong>
            <div className="human-summary-explained">
              <section><b>HOW THE INCIDENT WAS FOUND</b><p>{renderMentions(config.agentRace.humanSummary.detection)}</p></section>
              <section><b>WHAT THE TEAM HAS CONFIRMED</b><p>{renderMentions(config.agentRace.humanSummary.confirmed)}</p></section>
              <section><b>WHAT THE TEAM STILL CANNOT CONFIRM</b><p>{renderMentions(config.agentRace.humanSummary.unresolved)}</p></section>
            </div>
            {showAgentChoice && (
              <div className="human-summary-actions">
                <p>See how Intugle agents would handle this same incident.</p>
                <div>
                  <button className="human-summary-yes" onClick={onUnleashAgents}>{config.agentRace.agentPrompt.yes}</button>
                  <button className="human-summary-no" onClick={onStayHuman}>{config.agentRace.agentPrompt.no}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="handoff-timing">
        <div className="timing-handoff"><span>LAST HANDOFF</span><strong>+{current.delay}</strong></div>
        <div className="timing-total"><span>TOTAL ELAPSED</span><strong>{current.cumulative}</strong></div>
        <div className="timing-status"><span>STATUS</span><strong>{current.status}</strong></div>
      </div>

      {!complete && (
        <footer className="evidence-gaps">
          <span className="race-eyebrow">INVESTIGATION STATUS</span>
          <div><span>✓ Batch confirmed</span><span>◌ Root cause pending</span><span>◌ Stores unknown</span></div>
        </footer>
      )}
    </section>
  );
}

function renderMentions(message: string) {
  return message.split(/(@\w+)/g).map((part, i) =>
    part.startsWith('@') ? <mark key={`${part}-${i}`}>{part}</mark> : part,
  );
}
