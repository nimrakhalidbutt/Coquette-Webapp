import { useState } from 'react';

export default function MediaDisplay({ media }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!media || !media.url) return null;

  const handleMediaClick = () => {
    if (media.type === 'image') {
      setIsExpanded(!isExpanded);
    }
  };

  // Image display
  if (media.type === 'image') {
    return (
      <>
        <div 
          className={`media-container ${isExpanded ? 'expanded' : ''}`}
          onClick={handleMediaClick}
        >
          {isLoading && <div className="media-loading">✨ loading...</div>}
          <img
            src={media.url}
            alt="Post media"
            className="media-image"
            onLoad={() => setIsLoading(false)}
            style={{ display: isLoading ? 'none' : 'block' }}
          />
          
          {/* Zoom hint */}
          {!isExpanded && !isLoading && (
            <span className="media-hint">
              <span className="hint-icon">🔍</span>
              <span className="hint-text">click to enlarge</span>
              <span className="hint-bow">🎀</span>
            </span>
          )}
        </div>

        {/* Fullscreen overlay */}
        {isExpanded && (
          <div className="media-overlay" onClick={() => setIsExpanded(false)}>
            <button className="overlay-close">✕</button>
            <img src={media.url} alt="Post media" className="overlay-image" />
            <span className="overlay-bow">🎀</span>
          </div>
        )}
      </>
    );
  }

  // Video display
  if (media.type === 'video') {
    return (
      <div className="video-container">
        <video
          src={media.url}
          controls
          className="video-player"
          poster={media.poster}
        >
          Your browser doesn't support video.
        </video>
        <span className="video-badge">
          <span className="badge-icon">🎬</span>
          <span className="badge-text">video</span>
          <span className="badge-bow">🎀</span>
        </span>
      </div>
    );
  }

  return null;
}