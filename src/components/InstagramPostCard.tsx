export interface InstagramPostData {
  customerName: string;
  customerHandle: string;
  customerAvatar: string;
  caption: string;
  timeAgo: string;
  counters: { likes: number; comments: number };
  reaction?: 'likes' | 'dislikes';
  comments: readonly { handle: string; text: string; avatarColor: string; verified: boolean }[];
}

interface Props {
  post: InstagramPostData;
  imageSrc: string;
  reactionCount: number;
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return new Intl.NumberFormat('en-US').format(value);
  return value.toString();
}

export function InstagramPostCard({ post, imageSrc, reactionCount }: Props) {
  const isDislike = post.reaction === 'dislikes';
  return (
    <>
      <div style={{ height: '8px', width: '100%', flexShrink: 0 }} />
      <div className="sp-header flex items-center" style={{ padding: '8px 16px 14px' }}>
        <div className="w-9 h-9 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 shrink-0" style={{ marginRight: '14px' }}>
          <div className="w-full h-full rounded-full bg-white p-[1.5px]"><div className="w-full h-full rounded-full bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center text-white text-xs font-semibold">{post.customerAvatar}</div></div>
        </div>
        <span className="flex-1 min-w-0 text-[14px] font-semibold text-black">{post.customerHandle}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-black shrink-0"><circle cx="12" cy="5" r="2" fill="currentColor" /><circle cx="12" cy="12" r="2" fill="currentColor" /><circle cx="12" cy="19" r="2" fill="currentColor" /></svg>
      </div>
      <div className="sp-image bg-gray-100"><img src={imageSrc} alt="Customer social post" className="w-full aspect-square object-cover block" /></div>
      <div className="sp-actions-row flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-4">
          {isDislike ? <img src={`${import.meta.env.BASE_URL}assets/dislike.svg`} width="26" height="26" alt="Dislike" className="cursor-pointer" /> : <svg width="26" height="26" viewBox="0 0 24 24" fill="#ed4956" className="cursor-pointer" aria-label="Like"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-black cursor-pointer"><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-black cursor-pointer"><line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round" strokeLinejoin="round" /><polygon points="22 2 15 22 11 13 2 9 22 2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-black cursor-pointer"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div className="sp-likes px-4 pb-2"><p className="text-[14px] font-semibold text-black">{formatCount(reactionCount)} {isDislike ? 'dislikes' : 'likes'}</p></div>
      <div className="sp-caption px-4 pb-1"><p className="text-[14px] text-black leading-[18px]"><span className="font-semibold">{post.customerHandle}</span>{'  '}{post.caption}</p></div>
      <div className="px-4 space-y-1.5 pb-1.5">{post.comments.map((comment, index) => <div key={`${comment.handle}-${index}`} className="sp-comment text-[13px] leading-[17px]"><span className="font-semibold text-black">{comment.handle}</span>{'  '}<span className="text-black/90">{comment.text}</span></div>)}</div>
      <div className="sp-view-all px-4 pt-1 pb-1"><p className="text-[14px] text-gray-400">View all {formatCount(post.counters.comments)} comments</p></div>
      <div className="sp-timestamp px-4 pt-0.5 pb-4"><p className="text-[10px] text-gray-400 uppercase tracking-wide">{post.timeAgo}</p></div>
      <div className="sp-bottom-nav flex items-center justify-around px-6 py-3 border-t border-gray-200/80">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-black"><path d="M22 23h-6.001a1 1 0 0 1-1-1v-5.455a2.997 2.997 0 1 0-5.993 0V22a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V11.543a1.002 1.002 0 0 1 .31-.724l10-9.543a1.001 1.001 0 0 1 1.38 0l10 9.543a1.002 1.002 0 0 1 .31.724V22a1 1 0 0 1-1 1z" /></svg>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-black"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-black"><rect x="3" y="3" width="18" height="18" rx="4" ry="4" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-black"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M2 8h20M2 8l5-6M10 2l5 6" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 13l5 3-5 3z" fill="currentColor" stroke="none" /></svg>
        <div className="w-[22px] h-[22px] rounded-full border-[1.5px] border-black bg-gray-300" />
      </div>
    </>
  );
}
