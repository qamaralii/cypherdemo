export function ComparisonRail({ team, elapsed, onClick, expanded }: { team: 'human' | 'agent'; elapsed: number; onClick: () => void; expanded?: boolean }) {
  const human = team === 'human';
  const label = human ? 'View human investigation report' : 'Return to agent workflow';
  return <button className={`comparison-rail comparison-rail-${team}`} onClick={onClick} aria-label={label} aria-expanded={human ? expanded : undefined} aria-controls={human ? 'comparison-human-view' : 'comparison-agent-view'}>
    <span className="comparison-rail-icon"><svg viewBox="0 0 32 32" aria-hidden="true">{human ? <><circle cx="16" cy="9" r="5" /><path d="M6 28v-4a10 10 0 0 1 20 0v4" /></> : <><rect x="5" y="9" width="22" height="18" rx="5" /><path d="M16 9V4M12 4h8M1 16h4M27 16h4M11 23h10" /><circle cx="11" cy="16" r="1" /><circle cx="21" cy="16" r="1" /></>}</svg></span>
    <span className="comparison-rail-label">{human ? 'Human Teams' : 'Agent Workflow'}</span>
    <span className="comparison-rail-clock"><strong>{elapsed.toFixed(2)}</strong><span>{human ? 'days' : 'minutes'}</span><small>Simulated elapsed</small></span>
    <span className="comparison-rail-direction" aria-hidden="true">{human ? '→' : '←'}</span>
  </button>;
}
