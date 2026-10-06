import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import prototype from '../../RCA Agent Run.html?raw';
import './rca-agent-run.css';

// Only the supplied SVG geometry is used; the prototype's scripts and styles never run.
const LAND = [...prototype.matchAll(/<path class="land(2?)" d="([^"]+)"/g)].map(match => ({ secondary: Boolean(match[1]), path: match[2] }));
const BATCH = 'HLD-2407-A';
const CITIES = [
  { name: 'Glasgow', x: 125.3, y: 162.5, dx: 9, dy: 4, anchor: 'start' },
  { name: 'Leeds', x: 188.6, y: 246.4, dx: 9, dy: -3, anchor: 'start' },
  { name: 'Manchester', x: 172.4, y: 259, dx: -9, dy: 8, anchor: 'end' },
  { name: 'Birmingham', x: 180.6, y: 297.7, dx: 9, dy: 5, anchor: 'start' },
  { name: 'Cardiff', x: 150.5, y: 335.9, dx: -9, dy: 4, anchor: 'end' },
  { name: 'Bristol', x: 164.3, y: 337, dx: -2, dy: 17, anchor: 'middle' },
  { name: 'London', x: 221.9, y: 335, dx: 9, dy: 4, anchor: 'start' },
] as const;
const ROWS = [
  ...Array.from({ length: 17 }, (_, i) => ({ time: `07:${String(11 + i * 3).padStart(2, '0')}:${String((20 + i * 7) % 60).padStart(2, '0')}`, batch: i % 5 === 3 ? BATCH : `HLD-240${5 + i % 5}-B`, temperature: [160, 159, 160, 161, 158][i % 5], anomaly: false })),
  { time: '08:02:00', batch: BATCH, temperature: 160, anomaly: false },
  { time: '08:05:07', batch: 'HLD-2406-B', temperature: 159, anomaly: false },
  { time: '08:08:14', batch: 'HLD-2407-B', temperature: 160, anomaly: false },
  { time: '08:14:22', batch: BATCH, temperature: 134, anomaly: true },
  { time: '08:14:28', batch: 'HLD-2409-B', temperature: 160, anomaly: false },
  { time: '08:17:08', batch: BATCH, temperature: 136, anomaly: true },
  { time: '08:17:35', batch: 'HLD-2410-B', temperature: 159, anomaly: false },
];
const CITY_TIMES = CITIES.reduce<number[]>((times, city) => {
  times.push(Math.max(5.95 + (city.y - 148.5) / 198.5 * 2, (times.at(-1) ?? 0) + .26));
  return times;
}, []);
const CONFIRM_AT = Math.max(8.4, CITY_TIMES[6] + .9);
const DURATION = CONFIRM_AT + 1.7;

export function rcaTaskIndex(progress: number) {
  const time = Math.min(1, progress * 22 / 18) * DURATION;
  return time >= DURATION ? 3 : time >= 5.3 ? 2 : time >= 2.95 ? 1 : 0;
}

export function RcaAgentRun({ progress }: { progress: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const time = Math.min(1, progress * 22 / 18) * DURATION;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const select = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
    const context = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
      const scan = { p: 0 }, sweep = { p: 0 }, temperature = { value: 160 };
      const trace = select<SVGPathElement>('.rca-run-trace');
      const bracket = select<SVGPathElement>('.rca-run-duration-bracket');
      const traceLength = trace.getTotalLength(), bracketLength = bracket.getTotalLength();
      tl.to(scan, { p: 1, duration: 2.5, ease: 'none', onUpdate: () => {
        gsap.set(select('.rca-run-log-list'), { y: -(ROWS.length - 7) * 24 * scan.p });
        gsap.set(select('.rca-run-progress i'), { scaleX: scan.p });
        select('.rca-run-counter').textContent = `${Math.round(184260 * scan.p * scan.p * (3 - 2 * scan.p)).toLocaleString('en-GB')} / 184,260`;
      } }, .4);
      ROWS.forEach((row, i) => {
        if (row.anomaly) tl.fromTo(`.rca-run-row-${i}`, { '--anomaly': 0 }, { '--anomaly': 1, duration: .25 }, .4 + ((i * 24 - 168) / ((ROWS.length - 7) * 24)) * 2.5);
      });
      tl.to('.rca-run-log-row:not(.target)', { opacity: .35, duration: .35 }, 2.95)
        .fromTo('.rca-run-log-row.target b', { '--highlight': 0 }, { '--highlight': 1, duration: .4, stagger: .1 }, 3.4)
        .fromTo('.rca-run-correlation', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .5 }, 3.75)
        .fromTo(trace, { strokeDasharray: traceLength, strokeDashoffset: traceLength }, { strokeDashoffset: 0, duration: .85, ease: 'power1.inOut' }, 4.05)
        .fromTo('.rca-run-chart-area', { opacity: 0 }, { opacity: 1, duration: .4 }, 4.5)
        .fromTo('.rca-run-chart-dot', { attr: { r: 0 } }, { attr: { r: 4.5 }, duration: .3 }, 4.5)
        .fromTo('.rca-run-chart-low', { opacity: 0 }, { opacity: 1, duration: .25 }, 4.55)
        .fromTo(bracket, { strokeDasharray: bracketLength, strokeDashoffset: bracketLength }, { strokeDashoffset: 0, duration: .4 }, 4.95)
        .to('.rca-run-log-row:not(.anomaly)', { height: 0, opacity: 0, duration: .45 }, 4.95)
        .to('.rca-run-log-list', { y: 0, duration: .45 }, 4.95)
        .to('.rca-run-log-window', { height: 48, duration: .45 }, 4.95)
        .fromTo('.rca-run-map-card', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .5 }, 5.3)
        .fromTo('.rca-run-map-sweep', { opacity: 0 }, { opacity: 1, duration: .2 }, 5.85)
        .to(sweep, { p: 1, duration: 2, ease: 'none', onUpdate: () => select('.rca-run-map-sweep').setAttribute('transform', `translate(0,${148.5 + 198.5 * sweep.p})`) }, 5.95)
        .to('.rca-run-map-sweep', { opacity: 0, duration: .25 }, 7.95);
      CITIES.forEach((_, i) => {
        tl.fromTo(`.rca-run-city-${i} .rca-run-city-dot`, { attr: { r: 0 } }, { attr: { r: 4.8 }, duration: .3, ease: 'back.out(2)' }, CITY_TIMES[i])
          .fromTo(`.rca-run-city-${i} .rca-run-city-ripple`, { attr: { r: 4 }, opacity: .8 }, { attr: { r: 24 }, opacity: 0, duration: .7 }, CITY_TIMES[i])
          .fromTo(`.rca-run-city-${i} text`, { fill: '#a0958b' }, { fill: '#3a281c', duration: .25 }, CITY_TIMES[i])
          .fromTo(`.rca-run-city-list-${i}`, { color: '#a0958b', backgroundColor: 'transparent' }, { color: '#b14f2f', backgroundColor: '#fff1e9', duration: .25 }, CITY_TIMES[i]);
      });
      tl.fromTo('.rca-run-store-total', { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: .4 }, CITY_TIMES[6] + .45)
        .fromTo('.rca-run-result', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .5 }, CONFIRM_AT)
        .to(temperature, { value: 134, duration: .8, ease: 'power2.inOut', onUpdate: () => { select('.rca-run-observed').textContent = String(Math.round(temperature.value)); } }, CONFIRM_AT + .4)
        .fromTo('.rca-run-result p', { opacity: 0 }, { opacity: 1, duration: .4 }, CONFIRM_AT + 1.1)
        .fromTo('.rca-run-tick', { strokeDashoffset: 26 }, { strokeDashoffset: 0, duration: .4 }, CONFIRM_AT + 1.2)
        .to({}, { duration: .1 }, DURATION - .1);
      timelineRef.current = tl;
      tl.seek(Math.min(1, progressRef.current * 22 / 18) * DURATION, false);
    }, root);
    return () => { context.revert(); timelineRef.current = null; };
  }, []);

  useLayoutEffect(() => { timelineRef.current?.seek(time, false); }, [time]);
  const cityCount = CITY_TIMES.filter(at => time >= at).length;
  return <div ref={rootRef} className="rca-run-workspace">
    <section className="rca-run-log"><header><b>Factory log search</b><span>Line 4 · 08 July</span></header><div className="rca-run-log-sub"><span>{time >= 2.95 ? '2 anomalies flagged' : 'Scanning production records'}</span><strong className="rca-run-counter">0 / 184,260</strong></div><div className="rca-run-progress"><i /></div><div className="rca-run-log-window"><div className="rca-run-log-list">{ROWS.map((row, i) => <div key={i} className={`rca-run-log-row rca-run-row-${i}${row.batch === BATCH ? ' target' : ''}${row.anomaly ? ' anomaly' : ''}`}><i>{row.anomaly ? '!' : '›'}</i><time>{row.time}</time><b>{row.batch}</b><span>Seal temp {row.temperature}°C</span><em>{row.anomaly ? 'Anomaly' : 'Normal'}</em></div>)}</div></div></section>
    <section className="rca-run-correlation"><div><small>BATCH CORRELATION</small><h3>HLD-2407-A matches the Line 4 temperature anomalies</h3><p>Expected 160°C · Observed 134°C · 18-minute drop</p></div><svg className="rca-run-chart" viewBox="0 0 240 104" role="img" aria-label="Sealing temperature drops from 160 to 134 degrees for 18 minutes, then recovers"><line className="rca-run-expected" x1="8" y1="18" x2="232" y2="18" /><text x="232" y="11" textAnchor="end">160°C expected</text><polygon className="rca-run-chart-area" points="80,18 92,59 104,60 116,57 128,58 140,56 152,48 164,32 176,19 176,18" /><path className="rca-run-trace" d="M8 18 L32 19 L56 17 L80 18 L92 59 L104 60 L116 57 L128 58 L140 56 L152 48 L164 32 L176 19 L196 18 L232 18" /><circle className="rca-run-chart-dot" cx="104" cy="60" r="0" /><text className="rca-run-chart-low" x="84" y="66" textAnchor="end">134°C</text><path className="rca-run-duration-bracket" d="M92 80 V86 H176 V80" /><text x="134" y="98" textAnchor="middle">18 min</text></svg></section>
    <section className="rca-run-map-card"><header><small>AFFECTED STORE EXPOSURE</small><span>{cityCount} of 7 cities mapped</span></header><div className="rca-run-map-body"><div className="rca-run-map-side"><b className="rca-run-batch">Batch {BATCH}</b><ul>{CITIES.map((city, i) => <li key={city.name} className={`rca-run-city-list-${i}`}><i />{city.name}</li>)}</ul><div className="rca-run-store-total"><strong>40 affected stores</strong><span>across 7 UK cities</span></div></div><svg className="rca-run-map" viewBox="-24 0 300 400" role="img" aria-label="Detailed UK map tracing seven affected cities">{LAND.map((land, i) => <path key={i} className={land.secondary ? 'rca-run-land-secondary' : 'rca-run-land'} d={land.path} />)}<g className="rca-run-map-sweep"><rect x="-24" y="-35" width="300" height="35" fill="#d9623920" /><line x1="-24" x2="276" y1="0" y2="0" stroke="#d96239" strokeWidth="2" /></g>{CITIES.map((city, i) => <g key={city.name} className={`rca-run-city-${i}`}><circle className="rca-run-city-ring" cx={city.x} cy={city.y} r="4.5" /><circle className="rca-run-city-ripple" cx={city.x} cy={city.y} r="4" /><circle className="rca-run-city-dot" cx={city.x} cy={city.y} r="0" /><text x={city.x + city.dx} y={city.y + city.dy} textAnchor={city.anchor}>{city.name}</text></g>)}</svg></div></section>
    <section className="rca-run-result"><div><small>ROOT CAUSE CONFIRMED</small><h3>160°C → <span className="rca-run-observed">160</span>°C temperature drop</h3><p>Batch HLD-2407-A reached 40 stores across 7 cities.</p></div><svg viewBox="0 0 34 34" aria-label="Analysis complete"><circle cx="17" cy="17" r="15" /><path className="rca-run-tick" d="M9.5 17.5l5.2 5.2L24.5 11.5" /></svg></section>
  </div>;
}
