import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, createUserProfile, updateUserProfile, uploadProfilePicture } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Load profile when user changes
  useEffect(() => {
    const loadProfile = async (user) => {
      if (user) {
        try {
          console.log('👤 Loading profile for user:', user.uid);
          console.log('📸 Auth photoURL:', user.photoURL);
          
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            console.log('✅ Profile found in Firestore:', userData);
            
            // Check if Firestore photo is different from Auth photo
            // This handles cases where user updated photo in another session
            if (userData.photoURL !== user.photoURL && user.photoURL) {
              console.log('🔄 Auth photo differs from Firestore, updating...');
              
              // Update Firestore with the latest Auth photo
              await setDoc(userRef, { photoURL: user.photoURL }, { merge: true });
              userData.photoURL = user.photoURL;
            }
            
            setProfile({
              uid: user.uid,
              ...userData
            });
          } else {
            // Create profile if it doesn't exist
            console.log('🆕 Creating new profile for user:', user.uid);
            
            const newProfile = {
              uid: user.uid,
              displayName: user.displayName || '',
              email: user.email || '',
              photoURL: user.photoURL || '',
              bio: '',
              createdAt: new Date().toISOString()
            };
            
            // Save to Firestore
            await setDoc(userRef, newProfile);
            console.log('✅ Profile created with photo:', newProfile.photoURL);
            
            setProfile(newProfile);
          }
        } catch (error) {
          console.error('❌ Error loading profile:', error);
        }
      } else {
        console.log('👤 No user logged in');
        setProfile(null);
      }
      setLoading(false);
    };

    const unsubscribe = auth.onAuthStateChanged(loadProfile);
    return () => unsubscribe();
  }, []);

  /**
   * Update profile data in Firestore
   */
  const updateProfile = async (data) => {
    if (!auth.currentUser) return false;
    
    try {
      console.log('🔄 Updating profile with:', data);
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { 
        ...data, 
        updatedAt: new Date().toISOString() 
      }, { merge: true });
      
      setProfile(prev => ({ ...prev, ...data }));
      console.log('✅ Profile updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      return false;
    }
  };

  /**
   * Upload profile picture to Cloudinary and update everywhere
   */
  const updateProfilePicture = async (file) => {
    if (!auth.currentUser) return null;
    
    try {
      console.log('📸 Uploading profile picture...');
      const photoURL = await uploadProfilePicture(auth.currentUser.uid, file);
      
      if (photoURL) {
        console.log('✅ Profile picture uploaded:', photoURL);
        
        // Update local state
        setProfile(prev => ({ ...prev, photoURL }));
      }
      
      return photoURL;
    } catch (error) {
      console.error('❌ Error uploading profile picture:', error);
      return null;
    }
  };

  /**
   * Refresh profile data from Firestore
   * Useful after profile updates from other devices
   */
  const refreshProfile = async () => {
    if (!auth.currentUser) return null;
    
    try {
      console.log('🔄 Refreshing profile from Firestore...');
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setProfile({
          uid: auth.currentUser.uid,
          ...userData
        });
        console.log('✅ Profile refreshed:', userData);
        return userData;
      }
    } catch (error) {
      console.error('❌ Error refreshing profile:', error);
    }
    return null;
  };

  /**
   * Get profile photo with fallback
   */
  const getProfilePhoto = () => {
    return profile?.photoURL || auth.currentUser?.photoURL || null;
  };

  /**
   * Get display name with fallback
   */
  const getDisplayName = () => {
    return profile?.displayName || auth.currentUser?.displayName?.split(' ')[0] || 'User';
  };

  return (
    <ProfileContext.Provider value={{
      profile,
      loading,
      showAuthModal,
      setShowAuthModal,
      showEditProfile,
      setShowEditProfile,
      updateProfile,
      updateProfilePicture,
      refreshProfile,
      getProfilePhoto,
      getDisplayName
    }}>
      {children}
    </ProfileContext.Provider>
  );
};

/**
 * Custom hook to use profile context
 */
export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
};