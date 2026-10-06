import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { config } from '../config';

interface PostData {
  customerName: string;
  customerHandle: string;
  customerAvatar: string;
  caption: string;
  timeAgo: string;
  counters: { likes: number; comments: number };
  reaction?: 'likes' | 'dislikes';
  likedBy: { highlightUser: string; othersCount: number };
  comments: readonly { handle: string; text: string; avatarColor: string; verified: boolean }[];
}

interface Props {
  lastFrameCanvas: HTMLCanvasElement | null;
  paused: boolean;
  onAnimationComplete?: () => void;
  onFindStores?: () => void;
  post?: PostData;
  imageSrc?: string;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return new Intl.NumberFormat('en-US').format(n);
  return n.toString();
}

export function SocialPost({ lastFrameCanvas, paused, onAnimationComplete, onFindStores, post, imageSrc }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const ctxRef = useRef<gsap.Context | null>(null);
  const [likeCount, setLikeCount] = useState(0);

  const socialPost = post ?? config.socialPost;

  // Copy the decoded frame before paint, without waiting for an image URL to load.
  useLayoutEffect(() => {
    if (lastFrameCanvas && bgRef.current) {
      const background = bgRef.current;
      background.width = lastFrameCanvas.width;
      background.height = lastFrameCanvas.height;
      background.getContext('2d')?.drawImage(lastFrameCanvas, 0, 0);
    }
  }, [lastFrameCanvas]);

  // Master GSAP timeline
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        paused: false,
        defaults: { ease: 'power3.out' },
      });

      const compact = matchMedia('(max-width: 760px)').matches;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Keep the captured scene visible while the post emerges from the phone.
      tl.to({}, { duration: reduced ? 0 : 0.6 });

      // A restrained origin signal ties the digital post back to the physical phone.
      tl.fromTo('.social-phone-signal',
        { opacity: 0, scale: 0.35 },
        { opacity: 0.85, scale: 1.2, duration: reduced ? 0 : 0.42, ease: 'power2.out' },
        '-=0.25',
      ).to('.social-phone-signal', { opacity: 0, scale: 2.2, duration: reduced ? 0 : 0.7, ease: 'power2.out' });

      // Travel from the phone toward the composed right-side resting position.
      tl.fromTo(
        cardRef.current,
        {
          opacity: 0,
          x: compact ? 0 : -520,
          y: compact ? 120 : 260,
          scale: compact ? 0.72 : 0.34,
          rotation: compact ? 0 : -7,
          filter: 'blur(10px)',
        },
        { opacity: 1, x: 0, y: 0, scale: 1, rotation: 0, filter: 'blur(0px)', duration: reduced ? 0 : 1.05, ease: 'power4.out' },
        '-=0.72',
      );

      // 3. Reveal header
      tl.from('.sp-header', { opacity: 0, y: 12, duration: 0.4 }, '-=0.2');

      // 4. Reveal image
      tl.from('.sp-image', { opacity: 0, duration: 0.5 }, '-=0.1');

      // 5. Reveal action row
      tl.from('.sp-actions-row', { opacity: 0, y: 8, duration: 0.35 }, '-=0.1');

      // 6. Animate reaction count + reveal reaction text
      const likeObj = { v: 0 };
      tl.to(likeObj, {
        v: socialPost.counters.likes,
        duration: 1.8,
        ease: 'power2.out',
        snap: { v: 1 },
        onUpdate: () => setLikeCount(Math.round(likeObj.v)),
      });
      tl.from('.sp-likes', { opacity: 0, y: 6, duration: 0.3 }, '-=1.6');

      // 7. Reveal caption
      tl.from('.sp-caption', { opacity: 0, y: 6, duration: 0.35 }, '-=1.0');

      // 8. Stagger comments
      tl.from('.sp-comment', {
        opacity: 0,
        y: 14,
        stagger: 0.25,
        duration: 0.4,
      }, '-=0.6');

      // 9. Reveal "view all comments" + timestamp
      tl.from('.sp-view-all', { opacity: 0, y: 6, duration: 0.3 }, '-=0.1');
      tl.from('.sp-timestamp', { opacity: 0, duration: 0.25 }, '-=0.1');

      // 10. Reveal bottom nav
      tl.from('.sp-bottom-nav', { opacity: 0, duration: 0.3 }, '-=0.1');

      // 11. Reveal CTA button
      tl.from('.sp-cta-btn', { opacity: 0, y: 16, scale: 0.93, duration: 0.6 }, '+=0.3');

      // 12. Signal completion
      tl.call(() => onAnimationComplete?.());

      tlRef.current = tl;
    }, containerRef);

    ctxRef.current = ctx;
    return () => ctx.revert();
  }, [socialPost, onAnimationComplete]);

  // Pause / resume timeline
  useEffect(() => {
    if (!tlRef.current) return;
    if (paused) {
      tlRef.current.pause();
    } else {
      tlRef.current.resume();
    }
  }, [paused]);

  return (
    <div ref={containerRef} className={`scene-container social-post-scene${post ? ' social-post-update' : ''}`}>
      {/* Captured F3 scene remains fully visible behind the post. */}
      <canvas
        ref={bgRef}
        className="social-post-background absolute inset-0 w-full h-full object-cover bg-navy"
        style={{ opacity: 1 }}
        aria-hidden="true"
      />

      {!post && <div className="social-phone-signal" aria-hidden="true" />}

      <div className="social-post-composition">
        {/* Instagram post card */}
        <div
          ref={cardRef}
          className="ig-card opacity-0"
        >
        {/* Top spacer to clear border-radius clipping */}
        <div style={{ height: '8px', width: '100%', flexShrink: 0 }} />

        {/* ── Header: avatar + username + dots ── */}
        <div className="sp-header flex items-center" style={{ padding: '8px 16px 14px 16px' }}>
          {/* Avatar with gradient story ring */}
          <div className="w-9 h-9 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 shrink-0" style={{ marginRight: '14px' }}>
            <div className="w-full h-full rounded-full bg-white p-[1.5px]">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center text-white text-xs font-semibold">
                {socialPost.customerAvatar}
              </div>
            </div>
          </div>
          <span className="flex-1 min-w-0 text-[14px] font-semibold text-black">
            {socialPost.customerHandle}
          </span>
          {/* Vertical three-dot menu */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-black shrink-0">
            <circle cx="12" cy="5" r="2" fill="currentColor" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="12" cy="19" r="2" fill="currentColor" />
          </svg>
        </div>

        {/* ── Image — full-bleed, square aspect ── */}
        <div className="sp-image bg-gray-100">
          <img
            src={imageSrc ?? config.assets.socialPostImage}
            alt="Customer social post"
            className="w-full aspect-square object-cover block"
          />
        </div>

        {/* ── Action icons row ── */}
        <div className="sp-actions-row flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-4">
            {socialPost.reaction === 'dislikes' ? (
              <img src="/assets/dislike.svg" width="26" height="26" alt="Dislike" className="cursor-pointer" />
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#ed4956" className="cursor-pointer" aria-label="Like">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            )}
            {/* Comment bubble */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-black cursor-pointer">
              <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {/* Paper plane / share */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-black cursor-pointer">
              <line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round" strokeLinejoin="round" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {/* Bookmark — extreme right */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-black cursor-pointer">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* ── Reactions ── */}
        <div className="sp-likes px-4 pb-2">
          <p className="text-[14px] font-semibold text-black">
            {formatCount(likeCount)} {socialPost.reaction === 'dislikes' ? 'dislikes' : 'likes'}
          </p>
        </div>

        {/* ── Caption: bold handle + text ── */}
        <div className="sp-caption px-4 pb-1">
          <p className="text-[14px] text-black leading-[18px]">
            <span className="font-semibold">{socialPost.customerHandle}</span>
            {'  '}{socialPost.caption}
          </p>
        </div>

        {/* ── Comments ── */}
        <div className="px-4 space-y-1.5 pb-1.5">
          {socialPost.comments.map((c, i) => (
            <div key={i} className="sp-comment text-[13px] leading-[17px]">
              <span className="font-semibold text-black">{c.handle}</span>
              {'  '}
              <span className="text-black/90">{c.text}</span>
            </div>
          ))}
        </div>

        {/* ── View all comments ── */}
        <div className="sp-view-all px-4 pt-1 pb-1">
          <p className="text-[14px] text-gray-400">
            View all {formatCount(socialPost.counters.comments)} comments
          </p>
        </div>

        {/* ── Timestamp ── */}
        <div className="sp-timestamp px-4 pt-0.5 pb-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
            {socialPost.timeAgo}
          </p>
        </div>

        {/* ── Bottom nav bar (IG style) ── */}
        <div className="sp-bottom-nav flex items-center justify-around px-6 py-3 border-t border-gray-200/80">
          {/* Home (filled) */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-black">
            <path d="M22 23h-6.001a1 1 0 0 1-1-1v-5.455a2.997 2.997 0 1 0-5.993 0V22a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V11.543a1.002 1.002 0 0 1 .31-.724l10-9.543a1.001 1.001 0 0 1 1.38 0l10 9.543a1.002 1.002 0 0 1 .31.724V22a1 1 0 0 1-1 1z" />
          </svg>
          {/* Search */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-black">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {/* Add post (square with plus) */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-black">
            <rect x="3" y="3" width="18" height="18" rx="4" ry="4" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          {/* Reels */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-black">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M2 8h20M2 8l5-6M10 2l5 6" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 13l5 3-5 3z" fill="currentColor" stroke="none" />
          </svg>
          {/* Profile circle */}
          <div className="w-[22px] h-[22px] rounded-full border-[1.5px] border-black bg-gray-300" />
        </div>
        </div>

        {/* CTA button — always in DOM so GSAP can find it; opacity starts at 0 via GSAP from() */}
        {onFindStores && <button
          className="sp-cta-btn"
          onClick={onFindStores}
        >
          {config.agentRace.cta}
        </button>
        }
      </div>
    </div>
  );
}
