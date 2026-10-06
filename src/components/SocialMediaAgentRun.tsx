import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { config } from '../config';
import { DislikeIcon } from './DislikeIcon';
import './social-media-agent-run.css';

const MESSAGE = 'Hi Sarah, we’re sorry about the YummChips product you found. We’d like to investigate and help.';
const FEED_HEIGHTS = [150, 96, 120, 150, 96, 120, 96, 150];
const HIT_TOP = FEED_HEIGHTS.reduce((sum, height) => sum + height, 0);
const WIRE_Y = [15, 54, 93];

function Check({ visible }: { visible: boolean }) {
  return <span className="sm-run-check" aria-label={visible ? 'Complete' : undefined}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg></span>;
}

export function SocialMediaAgentRun({ progress }: { progress: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  // The prototype's 12.4-second story occupies 15 seconds, followed by a 4-second hold.
  const time = Math.min(12.4, progress * 19 * 12.4 / 15);
  const detected = time >= 4.6;
  const outreach = time >= 5.5;
  const sent = time >= 7.45;
  const handoff = time >= 10;
  const complete = time >= 12.4;
  const title = complete ? 'Ready to start the investigation' : handoff ? 'Connecting the incident context' : outreach ? 'Reaching out to Sarah' : time >= 2.7 ? 'Complaint post found' : 'Listening for brand mentions';

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const select = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
    const context = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
      const count = { n: 0 }, typed = { n: 0 }, flight = { p: 0 };
      const skeletons = [...root.querySelectorAll('.sm-run-skeleton')];
      let top = 0;
      FEED_HEIGHTS.forEach((height, i) => {
        const crossing = top + height / 2 - 250;
        if (crossing > 0 && crossing <= 700) {
          tl.fromTo(skeletons[i], { backgroundColor: '#fffdfb' }, { backgroundColor: '#eef3f9', duration: .25, repeat: 1, yoyo: true }, .3 + crossing / 350 - .25);
        }
        top += height;
      });
      tl.to('.sm-run-feed-list', { y: -700, duration: 2, ease: 'none' }, .3)
        .to('.sm-run-feed-list', { y: -(HIT_TOP + 42 - 250), duration: .45 }, 2.3)
        .fromTo('.sm-run-radar-sweep', { rotation: 0 }, { rotation: 540, duration: 2.35, ease: 'none' }, .2)
        .fromTo('.sm-run-feed-hit', { backgroundColor: '#fffdfb' }, { backgroundColor: '#eef3f9', duration: .25 }, 2.45)
        .fromTo('.sm-run-feed-badge', { autoAlpha: 0, scale: .8 }, { autoAlpha: 1, scale: 1, duration: .35, ease: 'back.out(2)' }, 2.55)
        .to('.sm-run-reader', { autoAlpha: 0, duration: .3 }, 2.4)
        .to('.sm-run-feed', { autoAlpha: 0, duration: .5 }, 3.3)
        .fromTo('.sm-run-post', { x: 22, opacity: .5 }, { x: 0, opacity: 1, duration: .5 }, 3.3)
        .to(count, { n: 61200, duration: .8, onUpdate: () => { select('.sm-run-reactions').textContent = `${Math.round(count.n).toLocaleString('en-GB')} dislikes`; } }, 3.55)
        .fromTo('.sm-run-mention', { '--mention-width': 0 }, { '--mention-width': 1, duration: .35, stagger: .25 }, 3.9)
        .to('.sm-run-listening', { autoAlpha: 0, duration: .15 }, 4.6)
        .fromTo('.sm-run-found', { autoAlpha: 0 }, { autoAlpha: 1, duration: .15 }, 4.65)
        .fromTo('.sm-run-detected-check path', { strokeDashoffset: 24 }, { strokeDashoffset: 0, duration: .35 }, 4.85)
        .fromTo('.sm-run-outreach', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .5 }, 5.5)
        .to(typed, { n: MESSAGE.length, duration: 1.4, ease: 'none', onUpdate: () => {
          select('.sm-run-typed').textContent = MESSAGE.slice(0, Math.round(typed.n));
        } }, 6)
        .fromTo('.sm-run-sent', { autoAlpha: 0, y: 4 }, { autoAlpha: 1, y: 0, duration: .3 }, 7.45)
        .fromTo('.sm-run-outreach-check path', { strokeDashoffset: 24 }, { strokeDashoffset: 0, duration: .35 }, 7.5)
        .fromTo('.sm-run-flight', { opacity: 0 }, { opacity: 1, duration: .08 }, 7.6)
        .to(flight, { p: 1, duration: .65, ease: 'power2.inOut', onUpdate: () => {
          const base = root.getBoundingClientRect();
          const a = select('.sm-run-sent').getBoundingClientRect();
          const b = select('.sm-run-avatar').getBoundingClientRect();
          const ax = a.left - base.left, ay = a.top - base.top;
          const bx = b.left - base.left + b.width / 2, by = b.top - base.top + b.height / 2;
          const cx = (ax + bx) / 2, cy = Math.min(ay, by) - 45;
          root.querySelectorAll('.sm-run-flight i').forEach((dot, i) => {
            const p = Math.max(0, flight.p - i * .07), m = 1 - p;
            gsap.set(dot, { x: m * m * ax + 2 * m * p * cx + p * p * bx, y: m * m * ay + 2 * m * p * cy + p * p * by });
          });
        } }, 7.6)
        .to('.sm-run-flight', { opacity: 0, duration: .1 }, 8.15)
        .fromTo('.sm-run-avatar-pulse', { opacity: .9, scale: 1 }, { opacity: 0, scale: 2.2, duration: .7 }, 8.2)
        .fromTo('.sm-run-avatar-badge', { scale: 0 }, { scale: 1, duration: .35, ease: 'back.out(2)' }, 8.3)
        .fromTo('.sm-run-reply', { autoAlpha: 0 }, { autoAlpha: 1, duration: .25 }, 8.3)
        .to('.sm-run-typing i', { y: -3, duration: .2, stagger: .08, repeat: 2, yoyo: true }, 8.4)
        .to('.sm-run-typing', { autoAlpha: 0, duration: .15 }, 9)
        .fromTo('.sm-run-reply-received', { autoAlpha: 0 }, { autoAlpha: 1, duration: .15 }, 9.05)
        .fromTo('.sm-run-contact', { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: .5 }, 9.2)
        .fromTo('.sm-run-handoff', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .5 }, 10)
        .fromTo('.sm-run-evidence > span', { autoAlpha: 0, x: -8 }, { autoAlpha: 1, x: 0, duration: .35, stagger: .12 }, 10.4);
      root.querySelectorAll<SVGPathElement>('.sm-run-wires path').forEach((path, i) => {
        const length = path.getTotalLength();
        const packet = select<SVGCircleElement>(`.sm-run-packet-${i}`);
        const state = { p: 0 };
        tl.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: .45 }, 10.9 + i * .08)
          .fromTo(packet, { opacity: 0 }, { opacity: 1, duration: .06 }, 11 + i * .08)
          .to(state, { p: 1, duration: .6, onUpdate: () => {
            const point = path.getPointAtLength(state.p * length);
            packet.setAttribute('cx', String(point.x)); packet.setAttribute('cy', String(point.y));
          } }, 11 + i * .08)
          .to(packet, { opacity: 0, duration: .1 }, 11.6 + i * .08);
      });
      tl.fromTo('.sm-run-orchestrator', { borderColor: '#d8cfc5', color: '#9a8b7e' }, { borderColor: '#d96239', color: '#b14f2f', backgroundColor: '#fff1e9', duration: .3 }, 11.55)
        .fromTo('.sm-run-handoff-check path', { strokeDashoffset: 24 }, { strokeDashoffset: 0, duration: .35 }, 11.8)
        .to({}, { duration: .2 }, 12.2);
      timelineRef.current = tl;
      tl.seek(Math.min(12.4, progressRef.current * 19 * 12.4 / 15), false);
    }, root);
    return () => { context.revert(); timelineRef.current = null; };
  }, []);

  useLayoutEffect(() => { timelineRef.current?.seek(time, false); }, [time]);

  return <div ref={rootRef} className="sm-run-workspace" data-detected={detected} data-sent={sent} data-handoff={handoff}>
    <header className="sm-run-heading"><span>SOCIAL MEDIA AGENT</span><h3>{title}</h3><small>Instagram · {outreach && !handoff ? 'direct message' : time >= 2.7 ? 'sarah_mitchell' : '@YummChips'}</small></header>
    <div className="sm-run-body">
      <div className="sm-run-source">
        <article className="sm-run-post" aria-label="Sarah’s Instagram complaint">
          <header><i className="sm-run-avatar">S<span className="sm-run-avatar-pulse" /><span className="sm-run-avatar-badge">✓</span></i><b>sarah_mitchell</b><time>09:00</time><span>•••</span></header>
          <img className="sm-run-photo" src={config.assets.socialPostImage} alt="Mouldy YummChips beside their packaging" />
          <div className="sm-run-actions"><DislikeIcon /><span>○</span><span>⌁</span><span>⌑</span></div>
          <div className="sm-run-post-copy"><strong className="sm-run-reactions">0 dislikes</strong><p><b>sarah_mitchell</b> Just opened <mark className="sm-run-mention">@YummChips</mark>. How is this okay?</p><p><b>jake.rodriguez</b> <mark className="sm-run-mention">@YummChips</mark>, this is disgusting.</p><p><b>healthwatch_official</b> <mark className="sm-run-mention">@YummChips</mark>, has anyone contacted the manufacturer?</p><small>View all 847 comments</small><small>2 HOURS AGO</small></div>
        </article>
        <div className="sm-run-feed" aria-hidden="true"><div className="sm-run-feed-list">{FEED_HEIGHTS.map((height, i) => <div className="sm-run-skeleton" style={{ height }} key={i}><header><i /><span /></header><div /><span /></div>)}<div className="sm-run-feed-hit"><header><i>S</i><b>sarah_mitchell</b></header><p>Just opened <mark>@YummChips</mark>. How is this okay?</p><span className="sm-run-feed-badge">Tag detected</span></div>{[150, 96, 120].map((height, i) => <div className="sm-run-skeleton" style={{ height }} key={`after-${i}`}><header><i /><span /></header><div /></div>)}</div><div className="sm-run-reader"><span>Listening</span></div></div>
      </div>
      <div className="sm-run-cards">
        <section className="sm-run-card sm-run-detection"><div className="sm-run-found"><header className="sm-run-detected-check"><Check visible={detected} /><h4>Brand mention found</h4></header><p><b>@YummChips</b> appears in the post and comments</p><small>Detected immediately after publishing</small></div><div className="sm-run-listening"><div className="sm-run-radar"><i className="sm-run-radar-sweep" /><b /></div><div><small>LISTENING</small><h4>Watching for @YummChips tags</h4></div><strong>{time >= 2.6 ? '1' : '0'}<small>MENTIONS FOUND</small></strong></div></section>
        <section className="sm-run-card sm-run-outreach" inert={!outreach}><header className="sm-run-outreach-check"><Check visible={sent} /><h4>Customer outreach draft</h4></header><div className="sm-run-bubble"><span className="sm-run-message-size" aria-hidden="true">{MESSAGE}</span><span className="sm-run-typed" /><i className="sm-run-cursor" hidden={time >= 7.4} /></div><div className="sm-run-sent">✓✓ Sent via Instagram</div><div className="sm-run-reply"><div className="sm-run-typing" aria-hidden="true"><i /><i /><i /></div><span className="sm-run-reply-received">✓ Reply received</span></div><div className="sm-run-contact"><b>Sarah Mitchell</b><p>Preferred contact recorded · consent captured</p></div></section>
        <section className="sm-run-card sm-run-handoff" inert={!handoff}><header className="sm-run-handoff-check"><Check visible={complete} /><h4>Investigation ready</h4></header><p>Sarah’s complaint, contact details, and product evidence are ready for the Orchestrator.</p><div className="sm-run-transfer"><div className="sm-run-evidence">{['Complaint post', 'Contact details', 'Product evidence'].map(label => <span key={label}><i />{label}</span>)}</div><svg className="sm-run-wires" viewBox="0 0 80 108" preserveAspectRatio="none" aria-hidden="true">{WIRE_Y.map((y, i) => <g key={y}><path d={`M0 ${y} C40 ${y},40 54,80 54`} /><circle className={`sm-run-packet-${i}`} cx="0" cy={y} r="3" /></g>)}</svg><div className="sm-run-orchestrator"><span>⌁</span>Orchestrator</div></div></section>
      </div>
    </div>
    <div className="sm-run-flight" aria-hidden="true"><i /><i /><i /></div>
  </div>;
}
