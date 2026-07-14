import { auth, provider } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationBell from './NotificationBell';
import { useProfile } from '../contexts/ProfileContext';
import EditProfileModal from './EditProfileModal';
import useScrollDirection from '../hooks/useScrollDirection';

export default function Navbar({ user, setUser, onShowSaved }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [hideNavbar, setHideNavbar] = useState(false);
  const navigate = useNavigate();
  const scrollDirection = useScrollDirection();
  const { 
    showEditProfile, 
    setShowEditProfile,
    getProfilePhoto,
    getDisplayName
  } = useProfile();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, [setUser]);

  // Handle navbar visibility based on scroll
  useEffect(() => {
    if (scrollDirection === 'down') {
      setHideNavbar(true);
    } else {
      setHideNavbar(false);
    }
  }, [scrollDirection]);

  if (!user) return null;

  const handleImageError = () => {
    setImageError(true);
  };

  const getAvatarUrl = () => {
    if (imageError || !getProfilePhoto()) {
      const name = getDisplayName();
      return `https://ui-avatars.com/api/?name=${name.charAt(0)}&background=ffb6c1&color=ffffff&size=128&bold=true`;
    }
    return getProfilePhoto();
  };

  const goToProfile = () => {
    navigate(`/profile/${user.uid}`);
    setShowProfileMenu(false);
  };

  // Direct function to handle saved button click
  const handleSavedClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('💎 Saved button clicked');
    
    // Make sure onShowSaved exists and is a function
    if (typeof onShowSaved === 'function') {
      onShowSaved();
    } else {
      console.error('❌ onShowSaved is not a function', onShowSaved);
    }
    
    // Hide tooltip immediately
    setShowTooltip(false);
  };

  return (
    <>
      <nav className={`nav-header ${hideNavbar ? 'nav-hidden' : ''}`}>
        <div className="nav-left">
          
          <h1 className="app-title" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Coquette</h1>
          <span className="title-decoration">🎀✨</span>
        </div>

        <div className="user-corner">
          <div className="user-info">
            <div 
              className="avatar-container" 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{ cursor: 'pointer' }}
            >
              <img 
                src={getAvatarUrl()} 
                className="nav-avatar" 
                alt={getDisplayName()}
                onError={handleImageError}
              />
              <span className="avatar-bow">🎀</span>
            </div>
            <div className="user-details">
              <span className="user-name">{getDisplayName()}</span>
              <span className="user-badge">✨ manifesting</span>
            </div>
          </div>
          
          {showProfileMenu && (
            <div className="profile-dropdown">
              <button onClick={goToProfile}>
                <span>👤</span> My Profile
              </button>
              <button onClick={() => {
                setShowEditProfile(true);
                setShowProfileMenu(false);
              }}>
                <span>✎</span> Edit Profile
              </button>
              <button onClick={() => {
                if (typeof onShowSaved === 'function') {
                  onShowSaved();
                }
                setShowProfileMenu(false);
              }}>
                <span>💎</span> Saved Posts
              </button>
              <button onClick={() => {
                signOut(auth);
                setShowProfileMenu(false);
              }}>
                <span>🥀</span> Logout
              </button>
            </div>
          )}
          
          <div className="nav-buttons">
            <NotificationBell />
            
            {/* FIXED SAVED BUTTON - with proper click handler */}
            <div className="button-with-tooltip">
              <button 
                onClick={handleSavedClick}
                className="nav-button saved-button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                type="button"
              >
                <span className="button-icon">💎</span>
                <span className="button-text">Saved</span>
              </button>
              {showTooltip && (
                <span className="tooltip saved-tooltip">Your Collection 🎀</span>
              )}
            </div>
            
            <button 
              onClick={() => signOut(auth)} 
              className="nav-button logout-btn"
              type="button"
            >
              <span className="button-icon">🥀</span>
              <span className="button-text">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
    </>
  );
}