import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { config } from '../config';

interface Props {
  agentsComplete: boolean;
  onReplay: () => void;
}

export function ResolutionOverlay({ agentsComplete, onReplay }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { summary, timings, finalCta } = config.agentRace;

  useEffect(() => {
    if (!agentsComplete) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from(containerRef.current, { opacity: 0, duration: 0.6 });
      tl.from('.res-summary-card', { y: 30, opacity: 0, duration: 0.7 }, '-=0.2');
      tl.from('.res-row', { opacity: 0, y: 10, stagger: 0.15, duration: 0.4 }, '-=0.3');
      tl.from('.res-timing', { opacity: 0, y: 10, duration: 0.5 }, '-=0.1');
      tl.from('.res-cta', { scale: 0.9, opacity: 0, duration: 0.5 }, '-=0.2');
      tl.from('.res-replay', { opacity: 0, duration: 0.4 }, '-=0.1');
    }, containerRef);

    return () => ctx.revert();
  }, [agentsComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(10, 22, 40, 0.92)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '24px',
      }}
    >
      {/* Summary card */}
      <div
        className="res-summary-card"
        style={{
          background: 'rgba(45, 212, 191, 0.05)',
          border: '1px solid rgba(45, 212, 191, 0.25)',
          borderTop: '3px solid #2dd4bf',
          borderRadius: 12,
          padding: '32px 40px',
          maxWidth: 560,
          width: '100%',
          marginBottom: 28,
        }}
      >
        {/* Label */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#2dd4bf', textTransform: 'uppercase', marginBottom: 20 }}>
          Incident Summary — Agents Complete
        </div>

        {/* Findings */}
        {[
          { label: 'Affected batch', value: summary.batch, accent: true },
          { label: 'Root cause', value: summary.rootCause, accent: false },
          { label: 'Exact stores', value: `${summary.storesAffected} locations identified`, accent: true },
        ].map((row, i) => (
          <div
            key={i}
            className="res-row"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              padding: '12px 0',
              borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}
          >
            <span style={{ fontSize: 12, color: 'rgba(254,249,239,0.4)', width: 120, flexShrink: 0, paddingTop: 2 }}>
              {row.label}
            </span>
            <span style={{
              fontSize: 16,
              fontWeight: 700,
              color: row.accent ? '#2dd4bf' : '#fef9ef',
              letterSpacing: '0.02em',
            }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Timing comparison */}
      <div
        className="res-timing"
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 32,
          width: '100%',
          maxWidth: 560,
        }}
      >
        {/* Human side */}
        <div style={{
          flex: 1,
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: 8,
          padding: '16px 20px',
          textAlign: 'center',
          opacity: 0.6,
        }}>
          <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Human Teams
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace' }}>
            {timings.humanEstimate}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(254,249,239,0.3)', marginTop: 4 }}>
            Investigation incomplete
          </div>
        </div>

        {/* VS */}
        <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(254,249,239,0.2)', fontWeight: 700, fontSize: 14 }}>
          vs
        </div>

        {/* Agents side */}
        <div style={{
          flex: 1,
          background: 'rgba(45, 212, 191, 0.08)',
          border: '1px solid rgba(45, 212, 191, 0.25)',
          borderRadius: 8,
          padding: '16px 20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, color: '#2dd4bf', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Intugle Agents
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#2dd4bf', fontFamily: 'monospace' }}>
            {timings.agentElapsed}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(254,249,239,0.4)', marginTop: 4 }}>
            Full evidence assembled
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <button
        className="res-cta"
        style={{
          padding: '14px 40px',
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: '#0a1628',
          background: '#2dd4bf',
          border: 'none',
          borderRadius: 50,
          cursor: 'pointer',
          marginBottom: 16,
          transition: 'background 0.2s, transform 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#14b8a6')}
        onMouseLeave={e => (e.currentTarget.style.background = '#2dd4bf')}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {finalCta}
      </button>

      {/* Replay */}
      <button
        className="res-replay"
        onClick={onReplay}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(254,249,239,0.35)',
          fontSize: 13,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(254,249,239,0.7)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(254,249,239,0.35)')}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        Watch again
      </button>
    </div>
  );
}
