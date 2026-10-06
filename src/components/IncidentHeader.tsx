import { config } from '../config';

/**
 * Compact incident header bar — the social post shrunk into a single-line summary.
 * Shown at the top of the screen during the agent race.
 */
export function IncidentHeader({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const { socialPost } = config;

  return (
    <div className={`incident-header incident-header-${theme}`}>
      {/* Avatar */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #fb7185, #f97316)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {socialPost.customerAvatar}
      </div>

      {/* Handle */}
      <span className="incident-handle">
        {socialPost.customerHandle}
      </span>

      {/* Caption snippet */}
      <span className="incident-caption">
        {socialPost.caption}
      </span>

      {/* Reaction count */}
      <span className="incident-likes">
        {socialPost.reaction === 'dislikes' ? <img src={`${import.meta.env.BASE_URL}assets/dislike.svg`} alt="Dislike" /> : '❤'} {new Intl.NumberFormat('en-US').format(socialPost.counters.likes)} {socialPost.reaction === 'dislikes' ? 'dislikes' : 'likes'}
      </span>

      {/* Incident badge */}
      <span className="incident-badge">
        Active Incident
      </span>
    </div>
  );
}
