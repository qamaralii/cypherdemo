import { useLayoutEffect, useRef } from 'react';
import './orchestrator-graph.css';

const TAU = Math.PI * 2;
const DOMAINS = [
  { name: 'Customer & Social', detail: 'Post · tag · contact', colour: '#c7527d', count: 190 },
  { name: 'Customer Care', detail: 'Sarah case · support', colour: '#b77958', count: 95 },
  { name: 'Product & Batch', detail: 'HLD-2407-A · label', colour: '#597eb2', count: 150 },
  { name: 'Manufacturing', detail: 'Line 4 · shift', colour: '#d79a3b', count: 135 },
  { name: 'Quality', detail: 'Seal logs · hold', colour: '#456b97', count: 110 },
  { name: 'Warehouse', detail: 'Cartons · dispatches', colour: '#ad853a', count: 125 },
  { name: 'Retail Exposure', detail: '40 stores · 7 cities', colour: '#d96239', count: 175 },
  { name: 'Sales', detail: 'Affected range', colour: '#769b58', count: 80 },
  { name: 'Compliance', detail: 'Recall · reporting', colour: '#9a6f85', count: 105 },
  { name: 'Communications', detail: 'Statement · channels', colour: '#7586a6', count: 115 },
];
const CROSS_LINKS = [[0, 1], [2, 3], [3, 4], [4, 8], [2, 5], [5, 6], [6, 7], [1, 9], [8, 9], [0, 2], [6, 3]];
export const ORCHESTRATOR_PLAN_STARTS = [0, 1.5, 3];
export const ORCHESTRATOR_GRAPH_DURATION = 9.6;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => { const p = clamp(value); return 1 - (1 - p) ** 3; };
type Point = { x: number; y: number; radius: number; distance: number };
type Curve = [number, number, number, number, number, number];
type Cluster = { x: number; y: number; homeX: number; homeY: number; radius: number; nodes: Point[]; edges: [number, number][]; feeders: Curve[]; dormant?: HTMLCanvasElement; lit?: HTMLCanvasElement };
function random(seed: number) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function pointAt(curve: Curve, p: number) {
  const m = 1 - p;
  return { x: m * m * curve[0] + 2 * m * p * curve[2] + p * p * curve[4], y: m * m * curve[1] + 2 * m * p * curve[3] + p * p * curve[5] };
}

export function OrchestratorGraph({ progress, ready }: { progress: number; ready: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<(() => void) | null>(null);
  const stateRef = useRef({ progress, ready });
  stateRef.current = { progress, ready };
  const time = ready ? ORCHESTRATOR_GRAPH_DURATION : progress * ORCHESTRATOR_GRAPH_DURATION;
  const linked = DOMAINS.filter((_, i) => time >= .9 + .55 * i + .955).length;

  useLayoutEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let clusters: Cluster[] = [];
    let width = 0, height = 0, dpr = 1, centerX = 0, centerY = 0, coreRadius = 0;
    const build = () => {
      width = root.clientWidth; height = root.clientHeight;
      if (!width || !height) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      centerX = width / 2; centerY = height / 2 + 10;
      coreRadius = Math.min(48, Math.max(29, height * .12));
      const rng = random(20251006);
      const area = width * Math.max(1, height - 40) * .3;
      const total = DOMAINS.reduce((sum, domain) => sum + domain.count, 0);
      clusters = DOMAINS.map((domain, i) => {
        const angle = (-120 + 36 * i) * Math.PI / 180;
        const x = centerX + width * .34 * Math.cos(angle), y = centerY + height * .31 * Math.sin(angle);
        return { x, y, homeX: x, homeY: y, radius: Math.sqrt(area * domain.count / total / Math.PI), nodes: [], edges: [], feeders: [] };
      });
      for (let step = 0; step < 240; step++) {
        clusters.forEach((a, i) => {
          clusters.slice(i + 1).forEach(b => {
            const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy) || .01;
            const minimum = (a.radius + b.radius) * .85;
            if (distance < minimum) { const k = (minimum - distance) / distance / 2; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
          });
          const dx = a.x - centerX, dy = a.y - centerY, distance = Math.hypot(dx, dy) || .01;
          const minimum = a.radius * .8 + coreRadius + 16;
          if (distance < minimum) { a.x = centerX + dx / distance * minimum; a.y = centerY + dy / distance * minimum; }
          a.x += (a.homeX - a.x) * .015; a.y += (a.homeY - a.y) * .015;
          a.x = Math.max(a.radius * .7 + 10, Math.min(width - a.radius * .7 - 10, a.x));
          a.y = Math.max(40 + a.radius * .6, Math.min(height - a.radius * .6 - 28, a.y));
        });
      }
      clusters.forEach((cluster, i) => {
        const phase = rng() * TAU;
        for (let n = 0; n < DOMAINS[i].count; n++) {
          const angle = rng() * TAU, radius = Math.pow(rng(), .55);
          const shape = 1 + .2 * Math.sin(angle * 2 + phase) + .1 * Math.sin(angle * 5 + phase);
          cluster.nodes.push({ x: cluster.x + Math.cos(angle) * cluster.radius * radius * shape, y: cluster.y + Math.sin(angle) * cluster.radius * radius * shape * .8, radius: .6 + rng() ** 3 * 2.5, distance: radius });
        }
        const seen = new Set<string>();
        cluster.nodes.forEach((node, index) => {
          const neighbours = cluster.nodes.map((other, j) => ({ j, d: Math.hypot(node.x - other.x, node.y - other.y) })).filter(other => other.j !== index && other.d < cluster.radius * .3).sort((a, b) => a.d - b.d).slice(0, 2);
          neighbours.forEach(({ j }) => { const key = [Math.min(index, j), Math.max(index, j)].join(':'); if (!seen.has(key)) { seen.add(key); cluster.edges.push([index, j]); } });
        });
        const outer = [...cluster.nodes].sort((a, b) => b.distance - a.distance);
        for (let n = 0; n < 16; n++) {
          const node = outer[Math.floor(rng() * outer.length * .55)];
          const dx = centerX - node.x, dy = centerY - node.y, offset = (rng() - .5) * .4;
          cluster.feeders.push([node.x, node.y, (node.x + centerX) / 2 - dy * offset, (node.y + centerY) / 2 + dx * offset, centerX, centerY]);
        }
        const layer = (lit: boolean) => {
          const cached = document.createElement('canvas'); cached.width = canvas.width; cached.height = canvas.height;
          const c = cached.getContext('2d')!; c.scale(dpr, dpr);
          c.strokeStyle = lit ? DOMAINS[i].colour + '55' : '#88796e26'; c.lineWidth = .65; c.beginPath();
          cluster.edges.forEach(([a, b]) => { c.moveTo(cluster.nodes[a].x, cluster.nodes[a].y); c.lineTo(cluster.nodes[b].x, cluster.nodes[b].y); }); c.stroke();
          c.fillStyle = lit ? DOMAINS[i].colour : '#a0958b99';
          cluster.nodes.forEach(node => { c.beginPath(); c.arc(node.x, node.y, node.radius, 0, TAU); c.fill(); if (lit && node.radius > 1.8) { c.strokeStyle = DOMAINS[i].colour + '99'; c.beginPath(); c.arc(node.x, node.y, node.radius * 1.8, 0, TAU); c.stroke(); } });
          return cached;
        };
        cluster.dormant = layer(false); cluster.lit = layer(true);
      });
      draw();
    };
    const strokeCurve = (curve: Curve, fraction = 1) => {
      ctx.moveTo(curve[0], curve[1]);
      for (let n = 1; n <= 28; n++) { const point = pointAt(curve, fraction * n / 28); ctx.lineTo(point.x, point.y); }
    };
    const draw = () => {
      if (!width || !height) return;
      const state = stateRef.current;
      const t = state.ready ? ORCHESTRATOR_GRAPH_DURATION : state.progress * ORCHESTRATOR_GRAPH_DURATION;
      const open = ease(t), settled = ease(t - 8);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = '#fffdfb'; ctx.fillRect(0, 0, width, height);
      ctx.save(); ctx.beginPath(); ctx.arc(centerX, centerY, Math.hypot(width, height) * open, 0, TAU); ctx.clip();
      ctx.strokeStyle = '#88796e12'; ctx.lineWidth = .7;
      for (let x = 0; x < width; x += 36) for (let y = 0; y < height; y += 42) { ctx.beginPath(); for (let n = 0; n < 6; n++) { const angle = n * TAU / 6; const px = x + 23 * Math.cos(angle), py = y + 23 * Math.sin(angle); if (n) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke(); }
      if (settled > 0) CROSS_LINKS.forEach(([a, b]) => {
        ctx.strokeStyle = DOMAINS[a].colour + '33'; ctx.globalAlpha = settled; ctx.beginPath();
        for (let n = 0; n < 8; n++) { const start = clusters[a].nodes[n * 3], end = clusters[b].nodes[n * 3]; strokeCurve([start.x, start.y, centerX + (n - 4) * 9, centerY, end.x, end.y]); } ctx.stroke();
      });
      clusters.forEach((cluster, i) => {
        const lit = ease(t - (.9 + .55 * i));
        const q = clamp((t - (1 + .55 * i)) / .95);
        const opacity = 1;
        ctx.globalAlpha = opacity * (1 - lit); ctx.drawImage(cluster.dormant!, 0, 0, width, height);
        ctx.globalAlpha = opacity * lit; ctx.drawImage(cluster.lit!, 0, 0, width, height);
        if (lit > 0) { const glow = ctx.createRadialGradient(cluster.x, cluster.y, 0, cluster.x, cluster.y, cluster.radius * 1.5); glow.addColorStop(0, DOMAINS[i].colour + '18'); glow.addColorStop(1, DOMAINS[i].colour + '00'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cluster.x, cluster.y, cluster.radius * 1.5, 0, TAU); ctx.fill(); }
        ctx.lineWidth = .7; ctx.strokeStyle = DOMAINS[i].colour + '66'; ctx.beginPath();
        cluster.feeders.forEach((curve, n) => { const p = clamp(q * 1.7 - .7 * n / cluster.feeders.length); if (p > 0) strokeCurve(curve, p); }); ctx.stroke();
        if (q > 0 && q < 1) { ctx.fillStyle = DOMAINS[i].colour; for (let n = 0; n < 3; n++) { const curve = cluster.feeders[n * 4]; const point = pointAt(curve, clamp(q - n * .06)); ctx.beginPath(); ctx.arc(point.x, point.y, 3 - n * .6, 0, TAU); ctx.fill(); } }
        ctx.globalAlpha = opacity * open; ctx.fillStyle = lit > .1 ? DOMAINS[i].colour : '#a0958b'; ctx.beginPath(); ctx.arc(cluster.x, cluster.y, 4.5, 0, TAU); ctx.fill();
        ctx.font = `700 ${width < 560 ? 8 : 10}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#fffdfbf0'; ctx.strokeText(DOMAINS[i].name.toUpperCase(), cluster.x, cluster.y + 18); ctx.fillStyle = '#3a281c'; ctx.fillText(DOMAINS[i].name.toUpperCase(), cluster.x, cluster.y + 18);
        if (lit > .5 && height > 300) { ctx.font = '9px system-ui, sans-serif'; ctx.strokeText(DOMAINS[i].detail, cluster.x, cluster.y + 30); ctx.fillStyle = DOMAINS[i].colour; ctx.fillText(DOMAINS[i].detail, cluster.x, cluster.y + 30); }
      });
      ctx.restore(); ctx.globalAlpha = open;
      const coreColour = settled > .5 ? '#769b58' : '#d96239';
      const halo = ctx.createRadialGradient(centerX, centerY, coreRadius, centerX, centerY, coreRadius * 2.3); halo.addColorStop(0, coreColour + '30'); halo.addColorStop(1, coreColour + '00'); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(centerX, centerY, coreRadius * 2.3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fffdfb'; ctx.strokeStyle = coreColour; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(centerX, centerY, coreRadius, 0, TAU); ctx.fill(); ctx.stroke();
      const count = DOMAINS.filter((_, i) => t >= .9 + .55 * i + .955).length;
      ctx.strokeStyle = '#d8cfc5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(centerX, centerY, coreRadius + 7, 0, TAU); ctx.stroke();
      if (count) { ctx.strokeStyle = coreColour; ctx.beginPath(); ctx.arc(centerX, centerY, coreRadius + 7, -Math.PI / 2, -Math.PI / 2 + count / 10 * TAU); ctx.stroke(); }
      if (settled > 0 && settled < 1) { ctx.globalAlpha = 1 - settled; ctx.beginPath(); ctx.arc(centerX, centerY, coreRadius + settled * Math.max(width, height) * .5, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
    };
    drawRef.current = draw;
    build();
    const observer = new ResizeObserver(build); observer.observe(root);
    return () => { observer.disconnect(); drawRef.current = null; clusters = []; };
  }, []);

  useLayoutEffect(() => { drawRef.current?.(); }, [progress, ready]);
  return <div ref={rootRef} className="orchestrator-run-graph" data-ready={ready || time >= 8.3}>
    <canvas ref={canvasRef} role="img" aria-label="Company context graph: ten dense business-domain clusters link their records into incident HLD-2407-A" />
    <header><span>CONTEXT LINKED <b>{linked} / 10</b></span><small>{ready || time >= 8.3 ? 'Context collated' : 'Collating context across the business'}</small></header>
    <div className="orchestrator-run-core" style={{ opacity: ease((time - .35) / .5) }}><small>ACTIVE INCIDENT</small><b>HLD-2407-A</b><span>{ready || time >= 8.3 ? 'Plan ready' : 'Collating context'}</span></div>
  </div>;
}
