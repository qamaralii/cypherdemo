import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { config } from '../config';
import './landing-page.css';

interface Props {
  onStart: () => void;
  onStartInteraction?: () => void;
}

export function OpeningScreen({ onStart, onStartInteraction }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transitionCtxRef = useRef<gsap.Context | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.landing-header', {
        y: reduced ? 0 : -18,
        opacity: 0,
        duration: reduced ? 0 : 0.9,
      }).from('.landing-copy, .landing-visual', {
        y: reduced ? 0 : 22,
        opacity: 0,
        duration: reduced ? 0 : 0.75,
        stagger: reduced ? 0 : .12,
      }, '-=0.35');
    }, containerRef);

    return () => {
      ctx.revert();
      transitionCtxRef.current?.revert();
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  const handleStart = () => {
    if (transitionCtxRef.current) return;
    onStartInteraction?.();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: reduced ? 1 : 1.025,
        duration: reduced ? 0 : 0.55,
        ease: 'power2.in',
        onComplete: onStart,
      });
    }, containerRef);
    transitionCtxRef.current = ctx;
    transitionTimerRef.current = setTimeout(() => {
      ctx.revert();
      transitionCtxRef.current = null;
    }, reduced ? 50 : 700);
  };

  return (
    <div ref={containerRef} className="scene-container landing-page">
      <header className="landing-header"><img src={config.assets.logo} alt="Intugle" /><span><i />Cypher 2026</span></header>
      <main className="landing-main">
        <section className="landing-copy">
          <p className="landing-eyebrow">Agentic Alpha · Interactive walkthrough</p>
          <h1>Transform How Business Gets Done with Agentic Applications</h1>
          <div className="landing-use-case">
            <p className="landing-case-label">Use case <span>·</span> Customer experience · Consumer goods</p>
            <h2>one bad batch.<br />how far did it travel.</h2>
            <div className="landing-start-row"><button className="opening-hook landing-start" onClick={handleStart} aria-label="Start the walkthrough" autoFocus><span>Start the walkthrough</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button><span>Takes about 4 minutes · no sign-up</span></div>
          </div>
        </section>
        <section className="landing-visual" aria-label="One customer complaint, two approaches to investigation">
          <img className="landing-watermark" src={`${import.meta.env.BASE_URL}assets/intugle-icon.svg`} alt="" aria-hidden="true" />
          <div className="landing-trigger"><p className="landing-visual-label">The trigger</p><div className="landing-complaint"><span className="landing-avatar">S</span><div><small>@sarah_mitchell · just now</small><p>Just opened @YummChips. How is this okay?</p></div></div></div>
          <div className="landing-comparison"><article><p className="landing-visual-label">Human team</p><h3>4 days</h3><p>25 hand-offs · no resolution</p></article><article className="landing-agent-outcome"><p className="landing-visual-label">Agent team</p><h3>20 min</h3><p>10 domains checked · resolved</p></article></div>
          <div className="landing-agent-chain"><p className="landing-visual-label">The chain of agents</p><div className="landing-chain-nodes">{['Social Media', 'Orchestrator', 'Identification', 'RCA', 'Response'].map((name, i) => <span className="landing-chain-pair" key={name}>{i > 0 && <span className="landing-chain-arrow" aria-hidden="true">→</span>}<span className={`landing-chain-node${i === 0 ? ' first' : ''}`}>{i === 0 && <i />}{name}</span></span>)}</div><p className="landing-story">A customer opens a bag of YummChips and finds it spoiled. Follow one complaint through two different approaches: people coordinating across teams, and AI agents connecting evidence for human-approved action.</p></div>
        </section>
      </main>
      <footer className="landing-footer"><span>Built on Intugle&apos;s agentic application platform</span><div><a href="https://intugle.ai" target="_blank" rel="noreferrer">intugle.ai</a><a href="mailto:hello@intugle.ai">hello@intugle.ai</a></div></footer>
    </div>
  );
}
