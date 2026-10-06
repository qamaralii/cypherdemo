import { useEffect, useRef, useCallback, useState } from 'react';
import gsap from 'gsap';
import { useVideoSync } from '../hooks/useVideoSync';
import type { Overlay, VideoAnnotation } from '../config';

interface Props {
  src: string;
  nextSrc?: string;
  loop?: boolean;
  overlays?: readonly Overlay[];
  annotations?: readonly VideoAnnotation[];
  advanceAfter?: number; // seconds — for looping scenes
  playbackRate?: number; // e.g. 0.75 for slow-mo
  paused: boolean;
  onEnd: () => void;
  onLastFrame?: (canvas: HTMLCanvasElement) => void;
  muted?: boolean;
  registerNextHandler?: (handler: (() => boolean) | null) => void;
}

export function VideoScene({
  src,
  nextSrc,
  loop = false,
  overlays = [],
  annotations = [],
  advanceAfter,
  playbackRate,
  paused,
  onEnd,
  onLastFrame,
  muted = true,
  registerNextHandler,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceElapsedRef = useRef(0); // ms elapsed before last pause
  const advanceStartRef = useRef(0); // Date.now() when timer was last started
  const gsapCtxRef = useRef<gsap.Context | null>(null);
  const { visibleItems: visibleOverlays } = useVideoSync(videoRef, overlays);
  const { visibleItems: visibleAnnotations, currentTime } = useVideoSync(videoRef, annotations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [videoPlane, setVideoPlane] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const hasEndedRef = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Treat the second half of frame 2 as a navigable segment. The controller
  // consumes the first next-arrow press here instead of changing scenes.
  useEffect(() => {
    if (!registerNextHandler) return;
    registerNextHandler(() => {
      const video = videoRef.current;
      if (!video || video.currentTime >= 5) return false;
      video.currentTime = 5;
      video.play().catch(() => {});
      return true;
    });
    return () => registerNextHandler(null);
  }, [registerNextHandler]);

  const updateVideoPlane = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video?.videoWidth || !video?.videoHeight || !container) return;

    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    const scale = Math.max(containerWidth / video.videoWidth, containerHeight / video.videoHeight);
    const width = video.videoWidth * scale;
    const height = video.videoHeight * scale;
    setVideoPlane({
      left: (containerWidth - width) / 2,
      top: (containerHeight - height) / 2,
      width,
      height,
    });
  }, []);

  // Capture last frame before ending
  const captureLastFrame = useCallback(() => {
    const video = videoRef.current;
    if (video && onLastFrame) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          onLastFrame(canvas);
        }
      } catch {
        // Cross-origin or other error — ignore
      }
    }
  }, [onLastFrame]);

  // Handle video end
  const handleEnd = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    captureLastFrame();
    onEnd();
  }, [onEnd, captureLastFrame]);

  // Play / pause sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [paused]);

  // Playback rate
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackRate) return;
    video.playbackRate = playbackRate;
  }, [playbackRate]);

  // Match the annotation plane to object-fit: cover, including responsive crops.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(updateVideoPlane);
    observer.observe(container);
    return () => observer.disconnect();
  }, [updateVideoPlane]);

  // Advance timer for looping scenes — tracks elapsed time across pause/resume
  useEffect(() => {
    if (!loop || !advanceAfter) return;
    const totalMs = advanceAfter * 1000;

    if (paused) {
      // Pause: record elapsed time so far and clear timer
      if (advanceTimerRef.current) {
        advanceElapsedRef.current += Date.now() - advanceStartRef.current;
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
      return;
    }

    // Resume or start: set timer for remaining time
    const remaining = totalMs - advanceElapsedRef.current;
    if (remaining <= 0) {
      handleEnd();
      return;
    }
    advanceStartRef.current = Date.now();
    advanceTimerRef.current = setTimeout(() => {
      handleEnd();
    }, remaining);

    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
      }
    };
  }, [loop, advanceAfter, paused, handleEnd]);

  // Entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(containerRef.current, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
      });
    }, containerRef);
    gsapCtxRef.current = ctx;
    return () => ctx.revert();
  }, []);

  // Preload next video
  useEffect(() => {
    if (nextSrc && nextVideoRef.current) {
      nextVideoRef.current.src = nextSrc;
      nextVideoRef.current.load();
    }
  }, [nextSrc]);

  // Start playback when video is ready — no `paused` in deps
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    hasEndedRef.current = false;

    const onCanPlay = () => {
      setLoading(false);
      updateVideoPlane();
      // Use ref to check current pause state without re-running effect
      if (!pausedRef.current) {
        video.play().catch(() => {});
      }
    };
    const onError = () => {
      setError(true);
      setLoading(false);
    };
    const onEnded = () => {
      if (!loop) {
        handleEnd();
      }
    };

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('error', onError);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);
      video.removeEventListener('ended', onEnded);
    };
  }, [loop, handleEnd, updateVideoPlane]);

  const accentColor: Record<string, string> = {
    default: '#2dd4bf',   // teal
    warning: '#f59e0b',   // amber
    danger: '#ef4444',    // red
    subtle: '#94a3b8',    // slate
  };

  const annotationTone: Record<VideoAnnotation['tone'], string> = {
    info: '#078f82',
    warning: '#d96239',
    danger: '#c7527d',
  };

  return (
    <div ref={containerRef} className="scene-container">
      {/* Main video */}
      <video
        ref={videoRef}
        src={src}
        loop={loop}
        muted={muted}
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Subject-anchored narration follows the visible video plane, not the viewport. */}
      {videoPlane && visibleAnnotations.length > 0 && (
        <div
          className="video-annotation-stage"
          style={{
            left: videoPlane.left,
            top: videoPlane.top,
            width: videoPlane.width,
            height: videoPlane.height,
          }}
        >
          <svg className="video-annotation-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {visibleAnnotations.filter((annotation) => annotation.kind !== 'surface-label' && !annotation.targetless).map((annotation, index) => (
              <line
                key={`${annotation.text}-${index}`}
                className={`annotation-line annotation-${annotation.tone}`}
                x1={annotation.targetX}
                y1={annotation.targetY}
                x2={annotation.x}
                y2={annotation.y}
              />
            ))}
          </svg>

          {visibleAnnotations.map((annotation, index) => {
            const color = annotationTone[annotation.tone];
            const progress = Math.min(1, Math.max(0, (currentTime - annotation.appear) / (annotation.disappear - annotation.appear)));
            const displayValue = annotation.value
              ? `${Math.round(annotation.value.from + (annotation.value.to - annotation.value.from) * progress)}${annotation.value.unit}`
              : null;

            return (
              <div key={`${annotation.text}-${index}`}>
                {annotation.kind === 'surface-label' || annotation.targetless ? null : annotation.width && annotation.height ? (
                  <div
                    className={`annotation-highlight annotation-${annotation.tone}`}
                    style={{
                      left: `${annotation.targetX}%`,
                      top: `${annotation.targetY}%`,
                      width: `${annotation.width}%`,
                      height: `${annotation.height}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                ) : (
                  <div
                    className={`annotation-target annotation-${annotation.tone}`}
                    style={{ left: `${annotation.targetX}%`, top: `${annotation.targetY}%`, color }}
                  />
                )}
                <div
                  className={annotation.kind === 'surface-label'
                    ? 'video-surface-label'
                    : `video-annotation annotation-${annotation.tone} annotation-align-${annotation.align}${annotation.compact ? ' annotation-compact' : ''}`}
                  style={{
                    left: `${annotation.x}%`,
                    top: `${annotation.y}%`,
                    '--annotation-color': color,
                    '--surface-rotation': `${annotation.rotation ?? 0}deg`,
                  } as React.CSSProperties}
                >
                  <div className="annotation-heading-row">
                    {annotation.hazard && (
                      <svg className="annotation-hazard" viewBox="0 0 44 38" role="img" aria-label="Hazard warning">
                        <path d="M22 2 42 36H2Z" fill="#ffd21f" stroke="#4b392c" strokeWidth="3" strokeLinejoin="round" />
                        <path d="M22 11v13" stroke="#4b392c" strokeWidth="4.5" strokeLinecap="round" />
                        <circle cx="22" cy="30" r="2.5" fill="#4b392c" />
                      </svg>
                    )}
                    <div className="annotation-kicker">
                      {annotation.text}
                      {annotation.alert && <span className="annotation-alert" aria-label="Alert">!</span>}
                    </div>
                  </div>
                  {displayValue && <div className="annotation-value">{displayValue}</div>}
                  {annotation.subtext && <div className="annotation-subtext">{annotation.subtext}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preload next video (hidden) */}
      {nextSrc && (
        <video
          ref={nextVideoRef}
          muted
          preload="auto"
          className="hidden"
        />
      )}

      {/* Loading spinner */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-navy/80 z-20">
          <div className="spinner" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy/90 z-20">
          <p className="text-cream text-xl mb-4">Video failed to load</p>
          <button
            className="px-6 py-2 bg-teal text-navy rounded-lg font-semibold cursor-pointer"
            onClick={() => {
              setError(false);
              setLoading(true);
              videoRef.current?.load();
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Timed overlays — cinematic HUD style, always top-left */}
      {visibleOverlays.map((overlay, i) => {
        const color = accentColor[overlay.style || 'default'];
        const isDanger = overlay.style === 'danger';
        const isSubtle = overlay.style === 'subtle';
        return (
          <div
            key={`${overlay.text}-${i}`}
            className="video-overlay top-6 left-6 sm:top-10 sm:left-10"
            style={{ maxWidth: '90vw' }}
          >
            {/* Accent bar + content block */}
            <div
              className="flex"
              style={{
                background: 'rgba(2, 6, 23, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: isDanger
                  ? `0 0 30px ${color}44, 0 4px 20px rgba(0,0,0,0.5)`
                  : '0 4px 24px rgba(0,0,0,0.5)',
                animation: isDanger ? 'hud-pulse 1.5s ease-in-out infinite' : 'none',
              }}
            >
              {/* Left accent bar */}
              <div
                style={{
                  width: '4px',
                  flexShrink: 0,
                  background: color,
                  ...(isDanger ? { animation: 'hud-bar-flash 0.8s ease-in-out infinite' } : {}),
                }}
              />

              {/* Text content */}
              <div style={{ padding: '14px 20px 14px 16px' }}>
                {/* Main heading */}
                <div
                  style={{
                    fontSize: isSubtle ? '18px' : '22px',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    lineHeight: 1.1,
                    color: isDanger ? color : '#fef9ef',
                    fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
                    textTransform: isSubtle ? 'none' : 'uppercase' as const,
                    fontStyle: isSubtle ? 'italic' : 'normal',
                  }}
                >
                  {overlay.text}
                </div>

                {/* Subtext line */}
                {overlay.subtext && (
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                      lineHeight: 1.3,
                      color: 'rgba(254, 249, 239, 0.55)',
                      marginTop: '4px',
                    }}
                  >
                    {overlay.subtext}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

    </div>
  );
}
