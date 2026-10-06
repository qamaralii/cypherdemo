import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { config } from '../config';

interface Props {
  onStart: () => void;
}

export function OpeningScreen({ onStart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transitionCtxRef = useRef<gsap.Context | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.opening-logo', {
        y: reduced ? 0 : -18,
        opacity: 0,
        duration: reduced ? 0 : 0.9,
      }).from('.opening-hook', {
        y: reduced ? 0 : 22,
        opacity: 0,
        duration: reduced ? 0 : 0.75,
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
    <div ref={containerRef} className="scene-container opening-screen">
      <div className="opening-orbit opening-orbit-one" aria-hidden="true" />
      <div className="opening-orbit opening-orbit-two" aria-hidden="true" />
      <div className="opening-frame" aria-hidden="true" />

      <div className="opening-content">
        <img
          className="opening-logo"
          src={config.assets.logo}
          alt="Intugle"
        />

        <button
          className="opening-hook"
          onClick={handleStart}
          aria-label={`Begin demo: ${config.tagline}`}
          autoFocus
        >
          <span>{config.tagline}</span>
          <span className="opening-arrow" aria-hidden="true">
            <svg viewBox="0 0 28 24" focusable="false">
              <path d="M2 12h22M16 4l8 8-8 8" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
