import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import gsap from 'gsap';
import { config } from '../config';

type Decision = typeof config.agentRace.decisions[number];
type Tone = 'good' | 'partial' | 'bad';

interface Props {
  decision: Decision;
  onReplay: () => void;
}

// All graph hub positions (investigation nodes) + execution nodes
const INV_POSITIONS: [number, number][] = [[115, 115], [310, 85], [425, 215], [305, 340], [100, 310]];

const toneStyles: Record<Tone, { border: string; bg: string; titleColor: string; icon: string }> = {
  good:    { border: 'rgba(118,155,88,0.42)', bg: 'linear-gradient(135deg,#edf5e8,#fffdfb)', titleColor: '#4f7336', icon: '✓' },
  partial: { border: 'rgba(215,154,59,0.42)', bg: 'linear-gradient(135deg,#fbf2e2,#fffdfb)', titleColor: '#9b641f', icon: '◎' },
  bad:     { border: 'rgba(184,74,67,0.42)',  bg: 'linear-gradient(135deg,#fbe9e7,#fffdfb)', titleColor: '#993c36', icon: '✕' },
};

export function ExecutionScreen({ decision, onReplay }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [agentTimes, setAgentTimes] = useState<number[]>([]);
  const [doneIdx, setDoneIdx] = useState<number[]>([]);
  const [showOutcome, setShowOutcome] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const { execAgents, outcome } = decision;
  const { graphNodes, executionNodes } = config.agentRace;
  const tone = outcome.tone as Tone;

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (execAgents.length === 0) {
      // Option 3 – no action: show outcome immediately
      setTimeout(() => setShowOutcome(true), reduced ? 0 : 1800);
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: false });
      const clock = { v: 0 };

      // Fade in the execution shell
      tl.from('.exec-shell', { opacity: 0, duration: reduced ? 0 : 0.5 });

      execAgents.forEach((agent, i) => {
        const startAt = agent.delay;
        // Mark agent as active
        tl.call(() => setAgentTimes(prev => [...prev, i]), [], startAt);
        // Mark agent as done 3s later
        tl.call(() => setDoneIdx(prev => [...prev, i]), [], startAt + 3);
        // Light up graph node
        if (!reduced) {
          tl.to(`#exec-node-${agent.nodeId}`, {
            attr: { r: 18 }, opacity: 1, duration: 0.4,
          }, startAt + 0.2);
          tl.from(`#exec-edge-${agent.nodeId}`, {
            strokeDashoffset: 80, opacity: 0, duration: 0.6,
          }, startAt + 0.2);
        }
      });

      // Timer
      const last = execAgents[execAgents.length - 1]!;
      tl.to(clock, {
        v: last.delay + 4,
        duration: last.delay + 4,
        ease: 'none',
        onUpdate: () => setAgentTimes(prev => [...prev]),
      }, 0);

      // Show outcome after all done
      tl.call(() => setShowOutcome(true), [], last.delay + 4.5);
      tlRef.current = tl;
    }, ref);

    return () => ctx.revert();
  }, [execAgents]);

  return (
    <div ref={ref} className="exec-shell">
      {/* Header */}
      <div className="dec-header">
        <div>
          <span className="race-eyebrow mint">DECISION CONFIRMED</span>
          <h2 className="dec-title" style={{ fontSize: 'clamp(16px,1.4vw,24px)' }}>{decision.title}</h2>
        </div>
      </div>

      <div className="exec-body">
        {/* Left: execution agent cards */}
        <div className="exec-agents">
          <div className="race-eyebrow" style={{ marginBottom: 12, display: 'block' }}>AGENTS EXECUTING</div>

          {execAgents.length === 0 && (
            <div className="exec-no-action">
              <span>⚠</span>
              <p>No agents dispatched. Outcome will be determined by external factors.</p>
            </div>
          )}

          {execAgents.map((agent, i) => {
            const isActive = agentTimes.includes(i);
            const isDone = doneIdx.includes(i);
            const nodeColor = executionNodes.find(n => n.id === agent.nodeId)?.color ?? '#2dd4bf';
            return (
              <div
                key={agent.name}
                className={`active-agent-card ${isDone ? 'state-found' : isActive ? 'state-querying' : ''}`}
                style={{ marginBottom: 10, opacity: isActive ? 1 : 0.3, transition: 'opacity 0.4s' }}
              >
                <div className="aac-top">
                  <div className="aac-dot" style={{ background: nodeColor }} />
                  <span className="aac-name">{agent.name}</span>
                  <span className="aac-badge">
                    {isDone ? '✓ DONE' : isActive ? <><span className="aac-pulse" />RUNNING</> : '—'}
                  </span>
                </div>
                <div className="aac-source" style={{ color: nodeColor }}>{agent.system}</div>
                <div className="aac-finding">
                  {isDone
                    ? <span className="aac-found">"{agent.finding}"</span>
                    : isActive
                      ? <span className="aac-querying">{agent.task}…</span>
                      : <span className="aac-idle">Queued</span>
                  }
                </div>
              </div>
            );
          })}

          {/* Outcome card */}
          {showOutcome && (
            <div
              className="outcome-card"
              style={{
                border: `1px solid ${toneStyles[tone].border}`,
                background: toneStyles[tone].bg,
              }}
            >
              <div className="outcome-icon">{toneStyles[tone].icon}</div>
              <h3 style={{ color: toneStyles[tone].titleColor }}>{outcome.title}</h3>
              <ul>
                {outcome.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <div className="outcome-actions">
                {tone !== 'bad' && (
                  <button
                    className="outcome-detail-btn"
                    onClick={() => setShowReview(r => !r)}
                  >
                    {showReview ? 'Hide detail' : 'View action log'} ↗
                  </button>
                )}
                <button className="outcome-replay-btn" onClick={onReplay}>↺ Replay experience</button>
              </div>
              {showReview && tone !== 'bad' && (
                <div className="outcome-log">
                  {execAgents.map((a, i) => (
                    <div key={i} className="outcome-log-row">
                      <span className="outcome-log-agent">{a.name}</span>
                      <span className="outcome-log-finding">{a.finding}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Intugle graph showing execution nodes lighting up */}
        <div className="exec-graph-panel">
          <div className="graph-toolbar" style={{ borderBottom: '1px solid #ded7ce' }}>
            <span className="semantic-badge">✓ Semantic Graph</span>
            <span className="graph-source-count" style={{ marginLeft: 'auto' }}>Execution in progress</span>
          </div>
          <div className="semantic-canvas" style={{ flex: 1 }}>
            <svg viewBox="0 0 540 430" role="img" aria-label="Execution graph">
              <defs>
                <pattern id="exec-grid" width="26" height="26" patternUnits="userSpaceOnUse">
                  <path d="M26 0H0V26" fill="none" stroke="#ded7ce" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="540" height="430" fill="url(#exec-grid)" />

              {/* Investigation hub ↔ hub edges (dim) */}
              {INV_POSITIONS.map(([x, y], i) =>
                INV_POSITIONS.slice(i + 1).map(([xx, yy], j) => (
                  <line key={`inv-${i}-${j}`} x1={x} y1={y} x2={xx} y2={yy}
                    stroke="#9b8f83" strokeOpacity=".15" strokeWidth=".6" />
                ))
              )}

              {/* Execution node edges (to nearest inv hub) */}
              {executionNodes.map(en => {
                const isDone = doneIdx.some(di => execAgents[di]?.nodeId === en.id);
                const isActive = agentTimes.some(ai => execAgents[ai]?.nodeId === en.id);
                return (
                  <line
                    key={`exec-edge-${en.id}`}
                    id={`exec-edge-${en.id}`}
                    x1={en.x} y1={en.y} x2={INV_POSITIONS[2]![0]} y2={INV_POSITIONS[2]![1]}
                    stroke={en.color}
                    strokeWidth="1.2"
                    strokeOpacity={isDone ? 0.6 : isActive ? 0.4 : 0.08}
                    strokeDasharray={isActive && !isDone ? '5 8' : 'none'}
                  />
                );
              })}

              {/* Investigation hubs (all dimly lit — already completed) */}
              {graphNodes.hubs.map((hub, i) => {
                const [x, y] = INV_POSITIONS[i]!;
                return (
                  <g key={hub.id} style={{ '--node-color': hub.color } as CSSProperties}
                    className="graph-cluster active">
                    {Array.from({ length: 6 }, (_, j) => {
                      const angle = j * Math.PI / 3 + i * 0.3;
                      const sx = x + Math.cos(angle) * 52;
                      const sy = y + Math.sin(angle) * 40;
                      return (
                        <g key={j}>
                          <line className="source-edge" x1={x} y1={y} x2={sx} y2={sy} />
                          <circle className="field-node" cx={sx} cy={sy} r={2.5} />
                        </g>
                      );
                    })}
                    <circle className="hub-halo" cx={x} cy={y} r="22" />
                    <circle className="domain-node" cx={x} cy={y} r="15" />
                    <text className="domain-label" x={x} y={y + 28} textAnchor="middle">{hub.label}</text>
                  </g>
                );
              })}

              {/* Execution nodes */}
              {executionNodes.map(en => {
                const isDone = doneIdx.some(di => execAgents[di]?.nodeId === en.id);
                const isActive = agentTimes.some(ai => execAgents[ai]?.nodeId === en.id) && !isDone;
                const opacity = isDone ? 1 : isActive ? 0.85 : 0.2;
                const glowFilter = isDone || isActive ? `drop-shadow(0 0 6px ${en.color})` : 'none';
                return (
                  <g key={en.id} style={{ opacity, transition: 'opacity 0.5s' }}>
                    <circle
                      id={`exec-node-${en.id}`}
                      cx={en.x} cy={en.y} r="16"
                      fill={`${en.color}18`}
                      stroke={en.color}
                      strokeWidth={isDone ? 2 : 1.5}
                      style={{ filter: glowFilter }}
                    />
                    {isActive && (
                      <circle cx={en.x} cy={en.y} r="22"
                        fill="none" stroke={en.color} strokeWidth="0.8" opacity="0.3"
                        style={{ animation: 'halo-pulse 1.2s ease-in-out infinite' }}
                      />
                    )}
                    {/* Gear/action icon */}
                    <text x={en.x} y={en.y + 4} textAnchor="middle"
                      fill={en.color} fontSize="12" fontWeight="700">
                      {en.id === 'recall' ? '↩' : en.id === 'comms' ? '✉' : '◎'}
                    </text>
                    <text className="domain-label" x={en.x} y={en.y + 30}
                      textAnchor="middle" fill={en.color} fontSize="9">
                      {en.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="graph-caption">
              <span className="live-dot" />
              {doneIdx.length === execAgents.length && execAgents.length > 0
                ? 'All actions completed'
                : execAgents.length === 0
                  ? 'No agents dispatched'
                  : 'Agents executing decision…'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
