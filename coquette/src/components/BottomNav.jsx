import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { useProfile } from '../contexts/ProfileContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useSearch } from '../contexts/SearchContext';
import useScrollDirection from '../hooks/useScrollDirection';

export default function BottomNav({ onShowSaved }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [hideBottomNav, setHideBottomNav] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const scrollDirection = useScrollDirection();
  const { openSearch } = useSearch();
  const { unreadCount, setShowPanel } = useNotifications();
  const { getProfilePhoto, getDisplayName } = useProfile();

  // Handle bottom nav visibility based on scroll
  useEffect(() => {
    if (scrollDirection === 'down') {
      setHideBottomNav(true);
    } else {
      setHideBottomNav(false);
    }
  }, [scrollDirection]);

  const handleImageError = () => {
    setImageError(true);
  };

  const getAvatarUrl = () => {
    if (imageError) {
      const name = getDisplayName();
      return `https://ui-avatars.com/api/?name=${name.charAt(0)}&background=ffb6c1&color=ffffff&size=128&bold=true`;
    }
    return getProfilePhoto();
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path === '/profile' && location.pathname.includes('/profile/')) return true;
    return false;
  };

  // DON'T RENDER ANYTHING if hidden
  if (hideBottomNav) {
    return null;
  }

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container">
        {/* Home Button */}
        <button
          className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}
          onClick={() => navigate('/')}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
          {showTooltip && isActive('/') && (
            <span className="tooltip">Feed 🏠</span>
          )}
        </button>

        {/* Search Button */}
        <button
          className="bottom-nav-item"
          onClick={openSearch}
        >
          <span className="nav-icon">🔍</span>
          <span className="nav-label">Search</span>
        </button>

        {/* Post Button */}
        <button
          className="bottom-nav-item post-btn"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => {
              document.querySelector('.pill-input')?.focus();
            }, 500);
          }}
        >
          <span className="nav-icon">✨</span>
          <span className="nav-label">Post</span>
        </button>

        {/* Alerts Button */}
        <button
          className="bottom-nav-item"
          onClick={() => setShowPanel(true)}
        >
          <span className="nav-icon">🔔</span>
          <span className="nav-label">Alerts</span>
          {unreadCount > 0 && (
            <span className="nav-badge">{unreadCount}</span>
          )}
        </button>

        {/* Profile Button */}
        <button
          className={`bottom-nav-item ${isActive('/profile') ? 'active' : ''}`}
          onClick={() => navigate(`/profile/${auth.currentUser?.uid}`)}
        >
          <div className="nav-profile-container">
            <img
              src={getAvatarUrl()}
              alt={getDisplayName()}
              className="nav-profile-thumb"
              onError={handleImageError}
            />
            {isActive('/profile') && <span className="profile-active">🎀</span>}
          </div>
          <span className="nav-label">Profile</span>
        </button>
      </div>
    </nav>
  );
}