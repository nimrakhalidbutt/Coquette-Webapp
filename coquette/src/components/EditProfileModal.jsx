import { useState, useRef, useEffect } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { updateAllUserPosts } from '../utils/UpdateOldPosts';

export default function EditProfileModal({ onClose }) {
  const { profile, updateProfile: updateProfileData, updateProfilePicture } = useProfile();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [originalUsername, setOriginalUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewImage, setPreviewImage] = useState(profile?.photoURL || '');
  const [updateOldPosts, setUpdateOldPosts] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameChangeInfo, setUsernameChangeInfo] = useState(null);
  const fileInputRef = useRef(null);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check username availability with debounce
  useEffect(() => {
    const checkUsername = async () => {
      if (!username || username === originalUsername) {
        setUsernameAvailable(true);
        return;
      }
      
      if (username.length < 3) {
        setUsernameAvailable(false);
        return;
      }
      
      setCheckingUsername(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username.toLowerCase()));
        const snapshot = await getDocs(q);
        
        const isTaken = !snapshot.empty;
        setUsernameAvailable(!isTaken);
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameAvailable(false);
      } finally {
        setCheckingUsername(false);
      }
    };
    
    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [username, originalUsername]);

  // Check if user can change username
  useEffect(() => {
    const checkUsernameChangeEligibility = async () => {
      if (!auth.currentUser) return;
      
      try {
        const historyRef = collection(db, 'users', auth.currentUser.uid, 'usernameHistory');
        const q = query(historyRef, orderBy('changedAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const lastChange = snapshot.docs[0].data();
          const lastChangeDate = lastChange.changedAt.toDate();
          const today = new Date();
          
          const diffTime = Math.abs(today - lastChangeDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays < 14) {
            const daysLeft = 14 - diffDays;
            setUsernameChangeInfo({
              canChange: false,
              daysLeft,
              message: `You can change your username again in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
            });
          } else {
            setUsernameChangeInfo({ canChange: true });
          }
        } else {
          setUsernameChangeInfo({ canChange: true });
        }
      } catch (error) {
        console.error('Error checking username history:', error);
      }
    };
    
    checkUsernameChangeEligibility();
  }, []);

  const validateUsername = (name) => {
    if (!name || name.trim() === '') {
      return 'Username cannot be empty';
    }
    if (name.length > 30) {
      return 'Username must be less than 30 characters';
    }
    if (name.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    return null;
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);

    setLoading(true);
    try {
      const newPhotoURL = await updateProfilePicture(file);
      if (newPhotoURL) {
        setSuccess('Profile picture updated! ✨');
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate username
    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    // Check if username is available (only if changed)
    if (username !== originalUsername) {
      if (!usernameAvailable) {
        setError('This username is already taken');
        return;
      }
      
      // Check 14-day rule
      if (usernameChangeInfo && !usernameChangeInfo.canChange) {
        setError(usernameChangeInfo.message);
        return;
      }
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const userId = auth.currentUser?.uid;
      const oldDisplayName = auth.currentUser?.displayName;
      const oldUsername = originalUsername;
      
      console.log('📝 Updating profile with:', { displayName, username, bio });
      
      // Update Firebase Auth display name if changed
      if (displayName !== oldDisplayName) {
        await updateProfile(auth.currentUser, { displayName });
      }

      // Update user document
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        displayName,
        username: username.toLowerCase(),
        bio,
        updatedAt: new Date()
      });

      // Record username change in history if username changed
      if (username !== oldUsername) {
        const historyRef = collection(db, 'users', userId, 'usernameHistory');
        await addDoc(historyRef, {
          oldUsername,
          newUsername: username.toLowerCase(),
          changedAt: new Date()
        });
      }

      // Update local profile context
      await updateProfileData({ 
        displayName, 
        username: username.toLowerCase(), 
        bio 
      });
      
      setSuccess('Profile updated successfully! 🎀');
      
      // Update old posts if needed
      if (updateOldPosts && displayName !== oldDisplayName) {
        await updateAllUserPosts(userId, displayName, null);
      }
      
      setTimeout(() => {
        onClose?.();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      setError('Failed to update profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-profile-overlay" onClick={onClose}>
      <div className="edit-profile-modal" onClick={e => e.stopPropagation()}>
        <button className="edit-profile-close" onClick={onClose}>✕</button>
        
        {!isOnline && (
          <div className="network-warning">
            <span>📶</span>
            <span>You are offline. Changes may not save properly.</span>
          </div>
        )}
        
        <div className="edit-profile-header">
          <span className="edit-icon">🎀</span>
          <h2 className="edit-title">edit profile</h2>
          <span className="edit-icon">✨</span>
        </div>

        {error && (
          <div className="edit-error">
            <span>😿</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="edit-success">
            <span>✨</span>
            <span>{success}</span>
          </div>
        )}

        {usernameChangeInfo && !usernameChangeInfo.canChange && (
          <div className="username-cooldown">
            <span>⏳</span>
            <span>{usernameChangeInfo.message}</span>
          </div>
        )}

        <div className="profile-picture-section">
          <div className="profile-picture-container">
            <img 
              src={previewImage || '/images/default-avatar.png'} 
              alt="Profile" 
              className="profile-picture"
            />
            <button 
              className="change-photo-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <span>📸</span>
              <span>change photo</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          <div className="edit-input-group">
            <span className="edit-input-icon">👤</span>
            <input
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="edit-input"
            />
          </div>

          {/* Username field with availability indicator */}
          <div className="edit-input-group">
            <span className="edit-input-icon">@</span>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              required
              className={`edit-input ${!usernameAvailable && username !== originalUsername ? 'username-taken' : ''}`}
              disabled={usernameChangeInfo && !usernameChangeInfo.canChange && username === originalUsername}
            />
            {checkingUsername && <span className="username-checking">✨</span>}
            {!checkingUsername && username !== originalUsername && username.length >= 3 && (
              <span className={`username-status ${usernameAvailable ? 'available' : 'taken'}`}>
                {usernameAvailable ? '✅ available' : '❌ taken'}
              </span>
            )}
          </div>

          <div className="edit-input-group">
            <span className="edit-input-icon">📝</span>
            <textarea
              placeholder="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="edit-textarea"
              rows="3"
            />
          </div>

          {username !== originalUsername && (
            <div className="username-warning">
              <span>⚠️</span>
              <span>You can only change your username once every 14 days</span>
            </div>
          )}

          <button 
            type="submit" 
            className="edit-submit-btn" 
            disabled={loading || (username !== originalUsername && !usernameAvailable) || checkingUsername}
          >
            {loading ? '✨ saving...' : 'save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}