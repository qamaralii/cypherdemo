import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { config } from '../config';
import './batch-label-scan.css';

const CODE = 'HLD-2407-A';
const RECORDS = ['HLD-2406-C', 'HLD-2406-F', CODE, 'HLD-2407-B', 'HLD-2408-D'];
const PROTOTYPE_DURATION = 9.6;
const ANIMATION_FRACTION = .8;

export function BatchLabelScan({ progress }: { progress: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const select = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
    const stage = select('.batch-scan-photo');
    const zoom = select('.batch-scan-zoom');
    const bodyRect = () => root.getBoundingClientRect();
    const relative = (element: Element, base: DOMRect) => {
      const r = element.getBoundingClientRect();
      return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
    };
    let context: gsap.Context | undefined;
    const build = () => {
      context?.revert();
      select('.batch-scan-grid').style.clipPath = 'inset(0 0 100% 0)';
      root.querySelectorAll('.batch-scan-char').forEach(el => el.classList.remove('locked'));
      const bounds = stage.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const scale = Math.max(bounds.width, bounds.height) / 1254;
      const offsetX = (1254 * scale - bounds.width) / 2;
      const offsetY = (1254 * scale - bounds.height) * .46;
      const photoBox = (x: number, y: number, w: number, h: number) => {
        const left = Math.max(6, x * scale - offsetX - 8);
        const top = Math.max(6, y * scale - offsetY - 8);
        return { left, top, width: Math.max(0, Math.min(bounds.width - 6, (x + w) * scale - offsetX + 8) - left), height: Math.max(0, Math.min(bounds.height - 6, (y + h) * scale - offsetY + 8) - top) };
      };
      const pack = photoBox(606, 0, 648, 748);
      const label = photoBox(1046, 452, 208, 116);
      const card = relative(zoom, bounds);
      const code = relative(select('.batch-scan-code'), bodyRect());
      const target = relative(select('.batch-scan-value'), bodyRect());
      const chip = relative(select('.batch-scan-chip'), bodyRect());
      const db = relative(select('.batch-scan-db'), bodyRect());
      const x1 = chip.x + chip.w + 4, y1 = chip.y + chip.h / 2;
      const x2 = db.x - 4, y2 = db.y + Math.min(db.h / 2, chip.h / 2);
      const connector = select<SVGPathElement>('.batch-scan-connector');
      connector.setAttribute('d', `M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`);
      const length = connector.getTotalLength();
      const cone = select<SVGPathElement>('.batch-scan-cone path');
      cone.setAttribute('d', `M${label.left} ${label.top} L${label.left + label.width} ${label.top} L${card.x + card.w} ${card.y + card.h} L${card.x} ${card.y + card.h} Z`);

      context = gsap.context(() => {
        const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
        const beam = select('.batch-scan-beam');
        const bracket = select('.batch-scan-bracket');
        const chars = [...root.querySelectorAll<HTMLElement>('.batch-scan-char')];
        const letters = `BATCH NO: ${CODE}`;
        const scan = { p: 0 }, ocr = { p: 0 }, packet = { p: 0 };
        tl.fromTo('.batch-scan-viewfinder', { opacity: 0 }, { opacity: 1, duration: .35 }, .1)
          .fromTo(beam, { opacity: 0 }, { opacity: 1, duration: .15 }, .5)
          .to(scan, { p: 1, duration: 1.6, ease: 'sine.inOut', onUpdate: () => {
            gsap.set(beam, { y: scan.p * (bounds.height - 2) });
            select('.batch-scan-grid').style.clipPath = `inset(0 0 ${(1 - scan.p) * 100}% 0)`;
          } }, .5)
          .to(beam, { opacity: 0, duration: .2 }, 2.1)
          .fromTo(bracket, { opacity: 0, left: 12, top: 12, width: bounds.width - 24, height: bounds.height - 24 }, { opacity: 1, duration: .2 }, 2.2)
          .to(bracket, { ...pack, duration: .6, ease: 'power3.inOut' }, 2.35)
          .fromTo('.batch-scan-pack-tag', { opacity: 0 }, { opacity: 1, duration: .15 }, 2.8)
          .to('.batch-scan-pack-tag', { opacity: 0, duration: .12 }, 3.15)
          .to(bracket, { ...label, duration: .5, ease: 'power3.inOut' }, 3.1)
          .fromTo('.batch-scan-label-tag', { opacity: 0 }, { opacity: 1, duration: .15 }, 3.5)
          .to('.batch-scan-grid', { opacity: 0, duration: .5 }, 3.6)
          .fromTo(zoom, { x: label.left + label.width / 2 - card.x - card.w / 2, y: label.top + label.height / 2 - card.y - card.h / 2, scale: Math.max(.2, label.width / card.w), rotation: -22, autoAlpha: 0 }, { x: 0, y: 0, scale: 1, rotation: 0, autoAlpha: 1, duration: .85, ease: 'power3.inOut' }, 3.75)
          .fromTo(cone, { opacity: 0 }, { opacity: 1, duration: .2 }, 3.7)
          .to(cone, { opacity: 0, duration: .5 }, 4.45)
          .fromTo('.batch-scan-caret', { opacity: 0 }, { opacity: 1, duration: .1 }, 4.45)
          .to(ocr, { p: 1, duration: .9, ease: 'none', onUpdate: () => {
            const glyphs = 'ABCDEFGHKLMNPRTUXY0123456789';
            chars.forEach((el, i) => {
              const locked = ocr.p * (chars.length + 4) > i + 2;
              const c = letters[i];
              el.textContent = locked || /[ :-]/.test(c) ? c : glyphs[(i * 5 + Math.floor(ocr.p * 45) * 11) % glyphs.length];
              el.classList.toggle('locked', locked);
            });
            gsap.set(select('.batch-scan-caret'), { left: `${Math.min(1, ocr.p * 1.2) * 100}%` });
          } }, 4.5)
          .to('.batch-scan-caret', { opacity: 0, duration: .15 }, 5.4)
          .fromTo('.batch-scan-code', { backgroundColor: 'transparent' }, { backgroundColor: '#eef3f9', duration: .3 }, 5.4)
          .fromTo('.batch-scan-ghost', { x: code.x, y: code.y, opacity: 0 }, { opacity: 1, duration: .05 }, 5.7)
          .to('.batch-scan-ghost', { x: target.x, y: target.y, duration: .65, ease: 'power3.inOut' }, 5.72)
          .fromTo('.batch-scan-value', { opacity: 0 }, { opacity: 1, duration: .1 }, 6.3)
          .to('.batch-scan-ghost', { opacity: 0, duration: .1 }, 6.34)
          .to(zoom, { autoAlpha: 0, duration: .45 }, 6.15)
          .to(bracket, { opacity: 0, duration: .3 }, 5.9)
          .fromTo(connector, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: .6 }, 6.4)
          .fromTo('.batch-scan-packet', { opacity: 0 }, { opacity: 1, duration: .06 }, 6.4)
          .to(packet, { p: 1, duration: .6, onUpdate: () => {
            const point = connector.getPointAtLength(packet.p * length);
            select('.batch-scan-packet').setAttribute('cx', String(point.x));
            select('.batch-scan-packet').setAttribute('cy', String(point.y));
          } }, 6.4)
          .to('.batch-scan-packet', { opacity: 0, duration: .12 }, 6.95)
          .fromTo('.batch-scan-row-highlight', { opacity: 0, y: 0 }, { opacity: 1, duration: .15 }, 7.05)
          .to('.batch-scan-row-highlight', { y: 28, duration: .12 }, 7.38)
          .to('.batch-scan-row-highlight', { y: 56, duration: .12 }, 7.66)
          .to(connector, { stroke: '#769b58', duration: .3 }, 7.95)
          .to('.batch-scan-row-highlight', { opacity: 0, duration: .15 }, 8.1)
          .to('.batch-scan-row:not(.hit)', { opacity: 0, height: 0, duration: .45 }, 8.15)
          .fromTo('.batch-scan-details', { height: 0, autoAlpha: 0 }, { height: 'auto', autoAlpha: 1, duration: .45 }, 8.45)
          .to({}, { duration: .2 }, 9.4);
        timelineRef.current = tl;
        tl.seek(Math.min(1, progressRef.current / ANIMATION_FRACTION) * PROTOTYPE_DURATION, false);
      }, root);
    };
    build();
    const observer = new ResizeObserver(build);
    observer.observe(stage);
    return () => { observer.disconnect(); context?.revert(); timelineRef.current = null; };
  }, []);

  useLayoutEffect(() => {
    timelineRef.current?.seek(Math.min(1, progress / ANIMATION_FRACTION) * PROTOTYPE_DURATION, false);
  }, [progress]);

  const time = Math.min(1, progress / ANIMATION_FRACTION) * PROTOTYPE_DURATION;
  const matched = time >= 7.95;
  const status = time >= 5.7 ? 'Batch code extracted' : time >= 4.4 ? 'Reading label (OCR)' : time >= 2.15 ? 'Locating printed label' : time >= .5 ? 'Scanning customer image' : 'Image received';
  return <div ref={rootRef} className="batch-scan-workspace" data-matched={matched}>
    <div className="batch-scan-photo">
      <img src={config.assets.socialPostImage} alt="Sarah’s customer photo with the printed batch label on the YummChips pack" />
      <div className="batch-scan-grid" /><div className="batch-scan-viewfinder" /><div className="batch-scan-beam" />
      <div className="batch-scan-bracket"><span className="batch-scan-pack-tag">Packaging detected</span><span className="batch-scan-label-tag">Printed label located</span></div>
      <svg className="batch-scan-cone" aria-hidden="true"><path /></svg>
      <div className="batch-scan-zoom">
        <div><small>ENLARGED PACKAGE LABEL</small><div className="batch-scan-ocr"><span>{'BATCH NO: '.split('').map((c, i) => <span className="batch-scan-char" key={i}>{c}</span>)}</span><span className="batch-scan-code">{CODE.split('').map((c, i) => <span className="batch-scan-char" key={i}>{c}</span>)}</span><i className="batch-scan-caret" /></div><small>OCR FOCUS</small></div>
        <svg className="batch-scan-crop" viewBox="1046 452 208 116" aria-label="Magnified crop of the actual printed label"><image href={config.assets.socialPostImage} width="1254" height="1254" /></svg>
      </div>
      <div className="batch-scan-status"><i />{status}</div>
    </div>
    <div className="batch-scan-flow">
      <div className="batch-scan-chip"><small>EXTRACTED FROM IMAGE</small><strong className="batch-scan-value">{CODE}</strong></div>
      <div className="batch-scan-db"><header><div><small>PRODUCTION DATABASE</small><p>{matched ? 'Production record found' : time >= 7 ? 'Searching production records…' : 'Waiting for a batch code'}</p></div>{matched ? <svg className="batch-scan-check" viewBox="0 0 24 24" aria-label="Match confirmed"><path d="m5 12 4 4L19 6" /></svg> : time >= 7 ? <i className="spin-ring" /> : null}</header><div className="batch-scan-rows"><div className="batch-scan-row-highlight" />{RECORDS.map(code => <div className={`batch-scan-row${code === CODE ? ' hit' : ''}`} key={code}><span>{code}</span><span>{matched && code === CODE ? '✓' : '·'}</span></div>)}</div><div className="batch-scan-details"><p>Line 4 · 08 July</p></div></div>
    </div>
    <svg className="batch-scan-transfer" aria-hidden="true"><path className="batch-scan-connector" /><circle className="batch-scan-packet" r="4" /></svg>
    <div className="batch-scan-ghost" aria-hidden="true">{CODE}</div>
  </div>;
}
