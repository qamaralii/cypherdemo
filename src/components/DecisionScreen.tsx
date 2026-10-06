import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { config } from '../config';

type Decision = typeof config.agentRace.decisions[number];

interface Props {
  elapsedDisplay: string;
  onDecide: (d: Decision) => void;
}

const riskLabel: Record<string, string> = {
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
};
const riskColor: Record<string, string> = {
  low: '#769b58',
  medium: '#597eb2',
  high: '#b84a43',
};
const cardBorder: Record<string, string> = {
  low: 'rgba(217,98,57,0.42)',
  medium: 'rgba(89,126,178,0.38)',
  high: 'rgba(184,74,67,0.4)',
};
const cardBg: Record<string, string> = {
  low: 'linear-gradient(145deg,#fff6ef,#fffdfb)',
  medium: 'linear-gradient(145deg,#f1f5fa,#fffdfb)',
  high: 'linear-gradient(145deg,#fbeeed,#fffdfb)',
};

export function DecisionScreen({ elapsedDisplay, onDecide }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { decisions, summary } = config.agentRace;

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.from('.dec-header', { opacity: 0, y: -20, duration: 0.5, ease: 'power3.out' });
      gsap.from('.dec-card', {
        opacity: 0, y: 40, stagger: 0.15, duration: 0.6, ease: 'power3.out', delay: 0.3,
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  const handleClick = (d: Decision, el: HTMLElement) => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { onDecide(d); return; }
    gsap.to(el, {
      scale: 1.03, duration: 0.18, ease: 'power2.out',
      onComplete: () => gsap.to(el, { scale: 1, duration: 0.15, onComplete: () => onDecide(d) }),
    });
  };

  return (
    <div ref={ref} className="dec-shell">
      {/* Header strip */}
      <div className="dec-header">
        <div>
          <span className="race-eyebrow mint">INVESTIGATION COMPLETE · {elapsedDisplay}s</span>
          <h2 className="dec-title">What should Intugle do?</h2>
          <p className="dec-sub">
            {summary.batch} · {summary.rootCause} · {summary.storesAffected} stores affected
          </p>
        </div>
      </div>

      {/* Decision cards */}
      <div className="dec-cards">
        {decisions.map((d) => (
          <button
            key={d.id}
            className="dec-card"
            style={{
              borderColor: cardBorder[d.risk],
              background: cardBg[d.risk],
            }}
            onClick={(e) => handleClick(d, e.currentTarget)}
          >
            {/* Top badges */}
            <div className="dec-card-top">
              {d.badge && (
                <span
                  className="dec-badge"
                  style={{
                    color: d.risk === 'low' ? '#b14f2f' : '#a13f39',
                    borderColor: d.risk === 'low' ? 'rgba(217,98,57,0.3)' : 'rgba(184,74,67,0.3)',
                    background: d.risk === 'low' ? 'rgba(217,98,57,0.08)' : 'rgba(184,74,67,0.08)',
                  }}
                >
                  {d.badge}
                </span>
              )}
              <span
                className="dec-risk"
                style={{ color: riskColor[d.risk] }}
              >
                ● {riskLabel[d.risk]}
              </span>
            </div>

            {/* Title */}
            <h3 className="dec-card-title" style={{ color: d.risk === 'high' ? '#8f342f' : '#3a281c' }}>
              {d.title}
            </h3>

            {/* Description */}
            <p className="dec-card-desc">{d.description}</p>

            {/* Agents count */}
            <div className="dec-card-agents">
              {d.agentCount > 0 ? (                <>
                  <span className="dec-agents-count" style={{ color: riskColor[d.risk] }}>
                    {d.agentCount}
                  </span>
                  <span className="dec-agents-label">
                    {(d.agentCount as number) === 1 ? 'agent' : 'agents'} will execute
                  </span>
                </>
              ) : (
                <span style={{ color: '#b84a43', fontSize: 12, fontWeight: 600 }}>
                  No agents · manual consequence
                </span>
              )}
            </div>

            {/* CTA */}
            <div
              className="dec-card-cta"
              style={{ color: d.risk === 'high' ? '#b84a43' : d.risk === 'medium' ? '#597eb2' : '#d96239' }}
            >
              {d.risk === 'high' ? 'Accept the risk →' : 'Choose this option →'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
