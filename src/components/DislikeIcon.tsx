export function DislikeIcon({ size = 20, className }: { size?: number; className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: '#1e1713', flexShrink: 0 }} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Dislike" className={className}><path d="M7 13V3H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3Zm0-10h11a2 2 0 0 1 2 1.6l1 6A2 2 0 0 1 19 13h-5v5a3 3 0 0 1-3 3l-4-8" /></svg>;
}
