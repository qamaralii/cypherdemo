import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import gsap from 'gsap';
import { config } from '../config';

interface Props {
  paused: boolean;
  onComplete: () => void;
  onReviewOptions: () => void;
  onRequestGrant: () => void;
  accessGranted: boolean;
  onElapsedUpdate?: (s: string) => void;
  guided?: boolean;
  jumpToStart?: number;
  jumpToEnd?: number;
  jumpToTime?: { time: number; id: number };
  executionOutcomeJump?: number;
  executionBackToRun?: number;
  onExecutionOutcomeVisible?: (visible: boolean) => void;
  workflowMode?: 'investigation' | 'decision' | 'execution';
  decision?: Decision | null;
  onDecide?: (decision: Decision) => void;
  onResolved?: () => void;
  onAgentStageChange?: (stage: number) => void;
}

const AGENT_WINDOWS = [
  { start: 0, found: 8 },
  { start: 10, found: 29 },
  { start: 29, found: 46 },
];
const HUB_WINDOWS = [
  { start: 0, found: 8 },
  { start: 10, found: 18 },
  { start: 18, found: 24 },
  { start: 24, found: 29 },
  { start: 29, found: 46 },
];
const TOTAL = 46;
const ILLUSTRATIVE_MAX = 47;

const positions: [number, number][] = [[115, 115], [310, 85], [425, 215], [305, 340], [100, 310]];
const GRAPH_X_SCALE = 1.8;
const GRAPH_Y_SCALE = 1.8;

type AgentState = 'idle' | 'querying' | 'found' | 'locked';
type Decision = typeof config.agentRace.decisions[number];

function getAgentState(i: number, time: number, waiting: boolean): AgentState {
  const agent = config.agentRace.agents[i]!;
  const window = AGENT_WINDOWS[i]!;
  if (agent.requiresGrant) {
    if (time < window.start) return 'idle';
    if (waiting) return 'locked';
    if (time >= window.found) return 'found';
    return 'querying';
  }
  if (time < window.start) return 'idle';
  if (time < window.found) return 'querying';
  return 'found';
}

function getHubState(i: number, time: number, waiting: boolean): AgentState {
  const window = HUB_WINDOWS[i]!;
  if (i === 4 && waiting) return 'locked';
  if (time < window.start) return 'idle';
  if (time >= window.found) return 'found';
  return 'querying';
}

function getActiveStep(i: number, time: number, state: AgentState) {
  const stepCount = config.agentRace.agents[i]!.steps.length;
  if (state === 'found') return stepCount;
  if (state !== 'querying') return -1;
  const window = AGENT_WINDOWS[i]!;
  const progress = Math.max(0, Math.min(0.999, (time - window.start) / (window.found - window.start)));
  return Math.floor(progress * stepCount);
}

function getStepProgress(i: number, time: number, state: AgentState) {
  if (state !== 'querying') return state === 'found' ? 1 : 0;
  const window = AGENT_WINDOWS[i]!;
  const stepCount = config.agentRace.agents[i]!.steps.length;
  const progress = Math.max(0, Math.min(0.999, (time - window.start) / (window.found - window.start)));
  return (progress * stepCount) % 1;
}

export function AgentPanel({ paused, onComplete, onReviewOptions, onRequestGrant, accessGranted, onElapsedUpdate, guided = false, jumpToStart, jumpToEnd, jumpToTime, executionOutcomeJump, executionBackToRun, workflowMode = 'investigation', decision, onDecide, onResolved, onAgentStageChange, onExecutionOutcomeVisible }: Props) {
  const [time, setTime] = useState(0);
  const [selectedDecisionId, setSelectedDecisionId] = useState<Decision['id']>('full');
  const [executionActive, setExecutionActive] = useState<number[]>([]);
  const [executionDone, setExecutionDone] = useState<number[]>([]);
  const [executionProgress, setExecutionProgress] = useState<Record<number, number>>({});
  const [showOutcome, setShowOutcome] = useState(false);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const executionTl = useRef<gsap.core.Timeline | null>(null);
  const { agents, graphNodes, executionNodes } = config.agentRace;
  const graphPositions = positions.map(([x, y]) => [x * GRAPH_X_SCALE, y * GRAPH_Y_SCALE] as [number, number]);

  const waiting = false;
  const complete = time >= TOTAL;

  // How many agents have findings (used to sync node highlight)
  const foundCount = graphNodes.hubs.filter((_, i) => getHubState(i, time, waiting) === 'found').length;

  // Current "active" agent index (the one currently querying or just found)
  const currentIdx = agents.reduce((acc, a, i) => {
    const window = AGENT_WINDOWS[i]!;
    if (a.requiresGrant) return waiting || (accessGranted && time >= window.start) ? i : acc;
    if (time >= window.start) return i;
    return acc;
  }, 0);
  const currentHubIdx = HUB_WINDOWS.reduce((acc, window, i) => time >= window.start ? i : acc, 0);

  useEffect(() => {
    const clock = { value: 0 };
    const timeline = gsap.timeline({ paused: true, onComplete });

    // Run all three agents continuously; response approval happens in the decision console.
    timeline.to(clock, {
      value: TOTAL,
      duration: TOTAL,
      ease: 'none',
      onUpdate: () => {
        const t = Math.min(clock.value, TOTAL);
        setTime(t);
        const disp = ((t / TOTAL) * ILLUSTRATIVE_MAX).toFixed(1);
        onElapsedUpdate?.(disp);
      },
    });

    tl.current = timeline;
    return () => { timeline.kill(); };
  }, [onComplete, onElapsedUpdate]);

  // Handle pause / waiting states
  useEffect(() => {
    if (!tl.current) return;
    if (paused || waiting || workflowMode !== 'investigation') tl.current.pause();
    else tl.current.resume();
  }, [paused, waiting, accessGranted, workflowMode]);

  useEffect(() => {
    if (jumpToStart === undefined || !tl.current) return;
    tl.current.time(0);
    setTime(0);
    onElapsedUpdate?.('0.0');
    if (!paused) tl.current.play();
  }, [jumpToStart, onElapsedUpdate, paused]);

  useEffect(() => {
    if (jumpToEnd === undefined || !tl.current) return;
    tl.current.pause();
    setTime(TOTAL);
    onElapsedUpdate?.(ILLUSTRATIVE_MAX.toFixed(1));
  }, [jumpToEnd, onElapsedUpdate]);

  useEffect(() => {
    if (!jumpToTime || !tl.current) return;
    tl.current.pause().time(jumpToTime.time);
    setTime(jumpToTime.time);
    onElapsedUpdate?.(((jumpToTime.time / TOTAL) * ILLUSTRATIVE_MAX).toFixed(1));
    if (!paused) tl.current.play();
  }, [jumpToTime, onElapsedUpdate, paused]);

  const displayTime = ((time / TOTAL) * ILLUSTRATIVE_MAX).toFixed(1);
  const currentAgent = agents[currentIdx]!;
  const currentState = getAgentState(currentIdx, time, waiting);
  const activeStep = getActiveStep(currentIdx, time, currentState);
  const currentHub = graphNodes.hubs[currentHubIdx];
  const completedAgents = agents.filter((_, index) => index !== currentIdx && getAgentState(index, time, waiting) === 'found');
  const selectedDecision = config.agentRace.decisions.find((item) => item.id === selectedDecisionId) ?? config.agentRace.decisions[0];
  const executionKpis = decision ? [
    decision.execAgents.some((agent) => agent.nodeId === 'recall') && ['40', 'stores notified'],
    decision.execAgents.some((agent) => agent.nodeId === 'recall') && ['✓', 'stock withdrawn'],
    decision.execAgents.some((agent) => agent.nodeId === 'comms') && ['✓', 'statement published'],
    decision.execAgents.some((agent) => agent.nodeId === 'crm') && ['✓', 'compensation issued'],
  ].filter(Boolean) as [string, string][] : [];
  const activeExecutionAgent = decision?.execAgents.find((_, index) => executionActive.includes(index) && !executionDone.includes(index));

  useEffect(() => {
    onAgentStageChange?.(currentIdx);
  }, [currentIdx, onAgentStageChange]);

  useEffect(() => {
    if (workflowMode !== 'execution' || !decision) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setExecutionActive([]);
    setExecutionDone([]);
    setExecutionProgress({});
    setShowOutcome(false);
    const timeline = gsap.timeline({ paused: true });
    if (decision.execAgents.length === 0) {
      setShowOutcome(true);
    } else {
      const agentDuration = reduced ? 0 : 7;
      const agentSpacing = reduced ? 0 : 9;
      decision.execAgents.forEach((_, index) => {
        const startAt = index * agentSpacing;
        const progress = { value: 0 };
        timeline.call(() => setExecutionActive((items) => [...items, index]), [], startAt);
        timeline.to(progress, {
          value: 1,
          duration: agentDuration,
          ease: 'none',
          onUpdate: () => setExecutionProgress((current) => ({ ...current, [index]: progress.value })),
        }, startAt);
        timeline.call(() => setExecutionDone((items) => [...items, index]), [], startAt + agentDuration);
      });
      const outcomeAt = (decision.execAgents.length - 1) * agentSpacing + agentDuration + (reduced ? 0 : 2);
      timeline.call(() => setShowOutcome(true), [], outcomeAt);
    }
    executionTl.current = timeline;
    timeline.play();
    return () => { timeline.kill(); };
  }, [workflowMode, decision]);

  useEffect(() => {
    if (executionOutcomeJump === undefined || !decision) return;
    setExecutionActive(decision.execAgents.map((_, index) => index));
    setExecutionDone(decision.execAgents.map((_, index) => index));
    setExecutionProgress(Object.fromEntries(decision.execAgents.map((_, index) => [index, 1])));
    setShowOutcome(true);
    executionTl.current?.pause();
  }, [executionOutcomeJump, decision]);

  useEffect(() => {
    if (executionBackToRun === undefined || !decision) return;
    setExecutionActive(decision.execAgents.map((_, index) => index));
    setExecutionDone(decision.execAgents.map((_, index) => index));
    setExecutionProgress(Object.fromEntries(decision.execAgents.map((_, index) => [index, 1])));
    setShowOutcome(false);
    executionTl.current?.pause();
  }, [executionBackToRun, decision]);

  useEffect(() => {
    executionTl.current?.paused(paused);
  }, [paused]);

  useEffect(() => {
    onExecutionOutcomeVisible?.(workflowMode === 'execution' && showOutcome);
  }, [workflowMode, showOutcome, onExecutionOutcomeVisible]);

  return (
    <section className="race-panel intugle-workspace" data-paused={paused}>

      {/* ── Header ── */}
      <header className="race-panel-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="race-eyebrow blue">02 /</span>
          <h2>Intugle Agents</h2>
        </div>
        <div className="race-clock mint">
          {displayTime}<em>s</em>
          <small>{workflowMode === 'decision' ? 'awaiting response' : workflowMode === 'execution' ? 'response outcome' : waiting ? 'awaiting approval' : complete ? 'complete' : 'illustrative elapsed time'}</small>
        </div>
      </header>

      {guided && (
        <div className="tour-callout tour-callout-agents">
          <span>STEP 2 OF 2</span>
          <p>Intugle agents now connect the same evidence across every source. Grant access when prompted.</p>
        </div>
      )}

      <div className={`agent-split-layout${complete ? ' agent-split-complete' : ''}`}>
        <div className="agent-run-column">
      {complete && workflowMode === 'investigation' ? (
        <section className="diagnosis-card" aria-live="polite">
          <div className="diagnosis-topline"><span>✓ DIAGNOSIS READY</span><small>5 systems connected</small></div>
          <h3>Temperature deviation traced to 40 stores.</h3>
          <p>
            Batch <strong>HLD-2407-A</strong> was packed on Line 4 during an 18-minute drop from
            <strong> 160°C to 134°C</strong>. It was released without a quality hold and shipped to
            <strong> 40 FreshMart stores</strong>.
          </p>
          <div className="diagnosis-facts">
            <span><small>BATCH</small>HLD-2407-A</span>
            <span><small>ROOT CAUSE</small>Temperature deviation</span>
            <span><small>EXPOSURE</small>40 stores</span>
          </div>
          <div className="diagnosis-bottom">
            <span>✓ Evidence linked across Production, Quality, Warehouse, Sales and Compliance.</span>
            <button onClick={onReviewOptions}>Review response options →</button>
          </div>
        </section>
      ) : workflowMode === 'decision' ? (
        <section className="decision-console" aria-label="Human decision required">
          <div className="decision-console-header">
            <span className="race-eyebrow">HUMAN DECISION REQUIRED</span>
            <h3>Choose the response Intugle should execute.</h3>
            <p>Evidence is complete. Select one response option, then approve it for execution.</p>
          </div>
          <div className="decision-option-list">
            {config.agentRace.decisions.map((item) => {
              const selected = selectedDecision?.id === item.id;
              return (
                <button key={item.id} className={`decision-option risk-${item.risk}${selected ? ' selected' : ''}`} onClick={() => setSelectedDecisionId(item.id)}>
                  <span className="decision-radio" aria-hidden="true" />
                  <span className="decision-option-main">
                    <span className="decision-option-topline">
                      <strong>{item.title}</strong>
                      {item.badge && <em>{item.badge}</em>}
                    </span>
                    <small>{item.description}</small>
                  </span>
                  <span className="decision-option-meta"><b>{item.risk} risk</b><small>{item.agentCount} agents</small></span>
                </button>
              );
            })}
          </div>
          <button className="decision-approve" onClick={() => onDecide?.(selectedDecision)}>Approve selected response →</button>
        </section>
      ) : workflowMode === 'execution' && decision ? (
        <section className="execution-console" aria-live="polite">
          <span className="race-eyebrow">DECISION CONFIRMED</span>
          <h3>{decision.title}</h3>
           {!showOutcome && decision.execAgents.length > 0 && <p>Intugle is executing the approved response across connected systems.</p>}
          {showOutcome ? (
            <div className={`enterprise-outcome tone-${decision.outcome.tone}`}>
              <div className="enterprise-outcome-icon">{decision.outcome.tone === 'good' ? '✓' : decision.outcome.tone === 'partial' ? '!' : '×'}</div>
              <span>ALL APPROVED ACTIONS COMPLETED</span>
              <h4>{decision.outcome.title}</h4>
              <div className="enterprise-kpis">
                {executionKpis.map(([value, label]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}
              </div>
              <div className="enterprise-outcome-lines">
                {decision.outcome.lines.map((line) => <p key={line}>✓ {line}</p>)}
              </div>
              <div className="enterprise-outcome-actions">
                {decision.outcome.tone === 'good' && <button className="enterprise-update-cta" onClick={onResolved}>View customer update →</button>}
              </div>
            </div>
          ) : (
            <div className="execution-run-list">
              {decision.execAgents.length === 0 && <div className="execution-no-action">No automated response selected. External consequences continue.</div>}
              {decision.execAgents.map((agent, index) => {
                const active = executionActive.includes(index) && !executionDone.includes(index);
                const done = executionDone.includes(index);
                const progress = executionProgress[index] ?? 0;
                const activeTask = Math.min(agent.steps.length - 1, Math.floor(progress * agent.steps.length));
                return <div key={agent.name} className={`execution-run${active ? ' active' : ''}${done ? ' done' : ''}`}>
                   <span>{done ? '✓' : active ? <i className="spin-ring" /> : '○'}</span>
                  <div>
                    <strong>{agent.name}</strong>
                    <small>{done ? agent.finding : active ? agent.task : 'Queued'}</small>
                    {active && <>
                      <p>{agent.objective}</p>
                      <div className="execution-task-list">
                        {agent.steps.map((step, stepIndex) => {
                          const taskDone = stepIndex < activeTask;
                          const taskActive = stepIndex === activeTask;
                          return <span key={step} className={taskDone ? 'done' : taskActive ? 'active' : ''}><b>{taskDone ? '✓' : taskActive ? '◌' : '○'}</b>{step}{taskActive && <em>{Math.max(8, Math.round((progress * agent.steps.length % 1) * 100))}%</em>}</span>;
                        })}
                      </div>
                      <div className="execution-progress"><i style={{ width: `${Math.max(5, Math.round(progress * 100))}%` }} /></div>
                    </>}
                  </div>
                  <em>{done ? 'Complete' : active ? 'Running' : 'Queued'}</em>
                </div>;
              })}
            </div>
          )}
        </section>
      ) : (
        <>
          {completedAgents.length > 0 && (
            <div className="completed-agent-findings" aria-label="Completed agent findings">
              {completedAgents.map((agent) => {
                const agentIndex = agents.indexOf(agent);
                const color = graphNodes.hubs[agentIndex === 0 ? 0 : agentIndex === 1 ? 3 : 4]?.color ?? '#769b58';
                return (
                  <div key={agent.name} className="completed-agent-finding" style={{ '--finding-color': color } as CSSProperties}>
                    <span className="completed-agent-check">✓</span>
                    <div>
                      <strong>{agent.name}</strong>
                      <small>EVIDENCE LINKED · {agent.highlight}</small>
                    </div>
                    <p>{agent.finding}</p>
                  </div>
                );
              })}
            </div>
          )}
          {/* ── HERO: Active agent card ── */}
          <div className={`active-agent-card state-${currentState}`} aria-live="polite">
            <div className="aac-top">
              <div className="aac-dot" style={{ background: currentHub?.color ?? '#d96239' }} />
              <span className="aac-name">{currentAgent.name}</span>
              <span className="aac-badge">
                {currentState === 'idle' && 'QUEUED'}
                {currentState === 'querying' && <><span className="aac-pulse" />QUERYING</>}
                {currentState === 'found' && '✓ EVIDENCE LINKED'}
                {currentState === 'locked' && '🔒 AWAITING ACCESS'}
              </span>
            </div>
            <div className="aac-source" style={{ color: currentHub?.color ?? '#d96239' }}>{currentAgent.system}</div>
            <div className="agent-run-meta"><span>RUN {currentIdx + 1} OF {agents.length}</span><span>{currentState === 'querying' ? 'LIVE EXECUTION' : currentState === 'found' ? 'EVIDENCE READY' : 'QUEUED'}</span></div>
            {currentState === 'found' ? (
              <div className="agent-evidence-reveal" style={{ '--reveal-color': currentHub?.color ?? '#769b58' } as CSSProperties}>
                <div className="evidence-reveal-topline"><span>✓ EVIDENCE FOUND</span><small>linked at {displayTime}s</small></div>
                <strong>{currentAgent.highlight}</strong>
                <span className="evidence-reveal-label">{currentAgent.highlightLabel}</span>
                <p>{currentAgent.finding}</p>
              </div>
            ) : currentState === 'locked' ? (
              <>
                <div className="agent-objective"><span>OBJECTIVE</span><p>{currentAgent.objective}</p></div>
                <div className="approval-guide">
                  <div className="approval-guide-topline"><span>YOUR APPROVAL IS REQUIRED</span><span>Compliance node locked</span></div>
                  <h3>Unlock the recall rules check</h3>
                  <p>The Resolution Agent needs temporary read-only access before it can prepare response options.</p>
                  <div className="approval-guide-facts">
                    <span><b>WHY</b>Verify recall and reporting obligations</span>
                    <span><b>SCOPE</b>Recall rules only</span>
                    <span><b>ACCESS</b>Read-only · This incident only</span>
                  </div>
                  <button disabled={paused} onClick={onRequestGrant}>Approve access and continue →</button>
                </div>
              </>
            ) : (
              <>
                <div className="agent-objective"><span>OBJECTIVE</span><p>{currentAgent.objective}</p></div>
                <div className="agent-work-steps">
                  {currentAgent.steps.map((work, i) => {
                    const done = activeStep > i;
                    const active = currentState === 'querying' && activeStep === i;
                    const progress = active ? Math.max(8, Math.round(getStepProgress(currentIdx, time, currentState) * 100)) : done ? 100 : 0;
                    return <div key={work} className={`agent-task${done ? ' work-done' : active ? ' work-active' : ''}`}>
                       <span className="agent-task-icon">{done ? '✓' : active ? <i className="spin-ring" /> : '○'}</span>
                      <span className="agent-task-copy">{work}{active && <small>running now</small>}</span>
                      <span className="agent-task-status">{done ? 'Complete' : active ? `${progress}%` : 'Queued'}</span>
                      {active && <span className="agent-task-progress"><i style={{ width: `${progress}%` }} /></span>}
                    </div>;
                  })}
                </div>
              </>
            )}
          </div>

          <div className="agent-chips-row">
            {agents.map((a, i) => {
              const state = getAgentState(i, time, waiting);
              const hub = graphNodes.hubs[i];
              return <span key={a.name} className={`agent-chip chip-${state}`} style={{ '--chip-color': hub?.color ?? '#d96239' } as CSSProperties}>
                <span className="chip-dot" />{a.name.replace(' Agent', '')}{state === 'found' && ' ✓'}{state === 'querying' && ' ···'}{state === 'locked' && ' 🔒'}
              </span>;
            })}
          </div>
          <footer className="agent-result" aria-live="polite">
            <span className="race-eyebrow">CONNECTED EVIDENCE</span>
            <div className="finding-trail">
              {config.agentRace.evidenceTrail.map((s, i) => (
                <span key={s} className={getAgentState(i, time, waiting) === 'found' ? 'found' : ''}>
                  {getAgentState(i, time, waiting) === 'found' ? '✓' : '○'} {s}
                </span>
              ))}
            </div>
          </footer>
        </>
      )}
        </div>

      <div className="agent-graph-column">
      {/* ── Semantic graph (supporting context, compact) ── */}
      <div className="product-window">
        <aside className="product-rail" aria-label="Intugle workspace navigation">
          <div className="intugle-logo-wrap">
            <img src="/assets/intugle-logo.svg" alt="Intugle" />
          </div>
          <div className="product-rail-group">
            <button aria-label="Workspace overview">⌂</button>
            <button className="rail-selected" aria-label="Semantic graph">♧</button>
            <button aria-label="Connected data">▤</button>
          </div>
          <div className="product-rail-group product-rail-bottom">
            <button aria-label="Agent activity">AI</button>
            <button aria-label="Settings">⚙</button>
          </div>
        </aside>
        <div className="product-main">
          <div className="graph-toolbar">
            <span className="semantic-badge">✓ Semantic Graph</span>
            <span className="graph-source-count">5 sources · {foundCount} active</span>
          </div>
          <div className="semantic-canvas">
            <svg
               viewBox="95 20 830 700"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Semantic graph showing active data source connections"
            >
              <defs>
                <pattern id="race-grid" width="26" height="26" patternUnits="userSpaceOnUse">
                  <path d="M26 0H0V26" fill="none" stroke="#ded7ce" strokeWidth="0.5" />
                </pattern>
              </defs>
                <rect width="900" height="760" fill="url(#race-grid)" />

              {/* Hub ↔ hub background edges */}
               {graphPositions.map(([x, y], i) =>
                 graphPositions.slice(i + 1).map(([xx, yy], j) => (
                  <line key={`${i}-${j}`} x1={x} y1={y} x2={xx} y2={yy}
                    stroke="#9b8f83" strokeOpacity=".18" strokeWidth=".7" />
                ))
              )}

              {/* Clusters */}
              {graphNodes.hubs.map((hub, i) => {
                 const [x, y] = graphPositions[i]!;
                const nodeState = getHubState(i, time, waiting);
                const nodeStep = 3;
                const active = nodeState === 'found' && (!hub.locked || accessGranted);
                const isCurrent = i === currentHubIdx && (nodeState === 'querying' || nodeState === 'found' || nodeState === 'locked');
                const fields = graphNodes.satellites.filter(s => s.hub === hub.id);
                return (
                  <g
                    key={hub.id}
                    className={[
                      'graph-cluster',
                      active ? 'active' : '',
                      isCurrent ? 'current' : '',
                    ].join(' ')}
                    style={{ '--node-color': hub.color } as CSSProperties}
                  >
                    {/* Satellite field nodes */}
                    {Array.from({ length: 8 }, (_, j) => {
                      const angle = j * Math.PI / 4 + i * 0.3;
                       const sx = x + Math.cos(angle) * (j % 2 ? 50 : 65) * GRAPH_X_SCALE;
                       const sy = y + Math.sin(angle) * (j % 2 ? 38 : 50) * GRAPH_Y_SCALE;
                      const fieldStep = Math.min(2, Math.floor(j / 3));
                      const fieldDone = nodeState === 'found' || (isCurrent && nodeStep > fieldStep);
                      const fieldCurrent = isCurrent && nodeState === 'querying' && nodeStep === fieldStep;
                      return (
                        <g key={j}>
                          <line className={`source-edge${fieldDone ? ' edge-done' : fieldCurrent ? ' edge-current' : ''}`} x1={x} y1={y} x2={sx} y2={sy} />
                          <circle className={`field-node${fieldDone ? ' field-done' : fieldCurrent ? ' field-current' : ''}`} cx={sx} cy={sy} r={j % 3 === 0 ? 5 : 3.5} />
                          {j % 2 === 0 && (
                            <text className="field-label" x={sx} y={sy + 13} textAnchor="middle">
                              {fields[j / 2]?.label ?? 'record'}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    {/* Hub rings */}
                    <circle className="hub-halo" cx={x} cy={y} r="26" />
                    <circle className="domain-node" cx={x} cy={y} r="18" />
                    {/* Hub icon */}
                    {hub.locked && !accessGranted ? (
                      <text x={x} y={y + 4} textAnchor="middle" fill="#efbd75" fontSize="11">▣</text>
                    ) : (
                      <g stroke="#6f6258" fill="none" strokeWidth="1">
                        {([-5, 1] as number[]).map(dx =>
                          ([-5, 1] as number[]).map(dy => (
                            <rect key={`${dx}-${dy}`} x={x + dx} y={y + dy} width="4" height="4" rx=".5" />
                          ))
                        )}
                      </g>
                    )}
                    <text className="domain-label" x={x} y={y + 35} textAnchor="middle">{hub.label}</text>
                  </g>
                );
              })}
              {workflowMode === 'execution' && decision && executionNodes.map((node) => {
                const index = decision.execAgents.findIndex((agent) => agent.nodeId === node.id);
                const active = index >= 0 && executionActive.includes(index) && !executionDone.includes(index);
                const done = index >= 0 && executionDone.includes(index);
                const x = node.x * GRAPH_X_SCALE;
                 const y = node.y * GRAPH_Y_SCALE;
                return (
                  <g key={node.id} className={`execution-graph-node${active ? ' active' : ''}${done ? ' done' : ''}`} style={{ '--node-color': node.color } as CSSProperties}>
                    <line x1={x} y1={y} x2={graphPositions[2]![0]} y2={graphPositions[2]![1]} />
                    <circle cx={x} cy={y} r="20" />
                    <text x={x} y={y + 5} textAnchor="middle">{node.id === 'recall' ? '↩' : node.id === 'comms' ? '✉' : '◎'}</text>
                    <text className="domain-label" x={x} y={y + 34} textAnchor="middle">{node.label}</text>
                  </g>
                );
              })}
            </svg>
            <div className="graph-caption">
              <span className="live-dot" />
              {workflowMode === 'decision'
                ? 'Response options awaiting human approval'
                : workflowMode === 'execution'
                  ? showOutcome ? 'Approved response complete' : activeExecutionAgent ? `${activeExecutionAgent.name}: ${activeExecutionAgent.task}` : 'Preparing approved response across connected systems'
                : waiting
                ? 'Compliance branch locked · approval required'
                : complete
                  ? 'All evidence nodes connected'
                  : currentState === 'querying'
                    ? `${currentAgent.name} · ${currentAgent.steps[Math.max(0, activeStep)]}`
                    : `${currentAgent.name} · ${currentAgent.finding}`}
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>
    </section>
  );
}
