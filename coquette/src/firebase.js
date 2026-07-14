import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, orderBy } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { uploadAvatarToCloudinary } from './cloudinary';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export { 
  signInWithEmailAndPassword,
  signInWithPopup 
} from "firebase/auth";
// ============================================
// PROFILE MANAGEMENT FUNCTIONS
// ============================================

/**
 * Create a user profile in Firestore when a user signs up
 */
export const createUserProfile = async (user, additionalData = {}) => {
  if (!user) return;
  
  console.log('📝 Creating profile for user:', user.uid);
  console.log('📸 Auth photoURL:', user.photoURL);
  
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  
  if (!snapshot.exists()) {
    const { displayName, email, photoURL } = user;
    const createdAt = new Date();
    
    // Generate username from email if not provided
    const username = email?.split('@')[0] || '';
    
    try {
      const profileData = {
        displayName: displayName || '',
        email: email || '',
        photoURL: photoURL || '',
        createdAt,
        bio: '',
        username: username.toLowerCase(),
        ...additionalData
      };
      
      console.log('💾 Saving profile with username:', username);
      await setDoc(userRef, profileData);
      console.log('✅ Profile created successfully');
      
      return userRef;
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      return null;
    }
  } else {
    console.log('📝 Profile already exists for user:', user.uid);
    
    // Check if existing profile is missing photoURL but auth has one
    const existingData = snapshot.data();
    if (!existingData.photoURL && user.photoURL) {
      console.log('🔄 Updating missing photoURL in profile');
      await updateDoc(userRef, { photoURL: user.photoURL });
    }
    
    return userRef;
  }
};

/**
 * Update a user's profile in Firestore
 */
export const updateUserProfile = async (userId, data) => {
  if (!userId) return false;
  
  console.log('🔄 Updating profile for user:', userId, data);
  
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date()
    });
    console.log('✅ Profile updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    return false;
  }
};

/**
 * Upload a profile picture to Cloudinary (not Firebase Storage!)
 */
export const uploadProfilePicture = async (userId, file) => {
  if (!userId || !file) {
    console.error('❌ Missing userId or file');
    return null;
  }
  
  console.log('📸 Starting profile picture upload for user:', userId);
  console.log('📁 File:', file.name, file.type, (file.size / 1024).toFixed(2) + 'KB');
  
  try {
    // Upload to Cloudinary
    console.log('🔄 Calling uploadAvatarToCloudinary...');
    const result = await uploadAvatarToCloudinary(file);
    
    if (!result || !result.url) {
      console.error('❌ No URL returned from Cloudinary');
      return null;
    }
    
    const downloadURL = result.url;
    console.log('✅ Avatar uploaded to Cloudinary:', downloadURL);
    
    // Update Firebase Auth profile
    if (auth.currentUser) {
      console.log('🔄 Updating Firebase Auth profile photo');
      await updateProfile(auth.currentUser, {
        photoURL: downloadURL
      });
      console.log('✅ Auth profile updated');
    } else {
      console.error('❌ No current user in auth');
      return null;
    }
    
    // Update Firestore profile
    console.log('🔄 Updating Firestore profile photo');
    const success = await updateUserProfile(userId, { photoURL: downloadURL });
    
    if (success) {
      console.log('✅ Profile photo updated in Firestore');
    } else {
      console.error('❌ Failed to update Firestore');
    }
    
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading profile picture:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    return null;
  }
};

/**
 * Get a user's profile from Firestore
 */
export const getUserProfile = async (userId) => {
  if (!userId) return null;
  
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data();
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting user profile:', error);
    return null;
  }
};

/**
 * Sync auth photo to Firestore if missing
 */
export const syncAuthPhotoToFirestore = async (user) => {
  if (!user) return;
  
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (!userData.photoURL && user.photoURL) {
        console.log('🔄 Syncing auth photo to Firestore');
        await updateDoc(userRef, { photoURL: user.photoURL });
      }
    } else {
      // Create profile if it doesn't exist
      await createUserProfile(user);
    }
  } catch (error) {
    console.error('❌ Error syncing photo:', error);
  }
};

// ============================================
// USERNAME MANAGEMENT FUNCTIONS
// ============================================

/**
 * Check if username is already taken
 */
export const isUsernameTaken = async (username, excludeUserId = null) => {
  if (!username) return false;
  
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return false;
    
    // If we're excluding a user (for updates), check if the only match is that user
    if (excludeUserId) {
      const matchingUsers = querySnapshot.docs.filter(doc => doc.id !== excludeUserId);
      return matchingUsers.length > 0;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking username:', error);
    return false;
  }
};

/**
 * Get username change history for a user
 */
export const getUsernameHistory = async (userId) => {
  if (!userId) return [];
  
  try {
    const historyRef = collection(db, 'users', userId, 'usernameHistory');
    const q = query(historyRef, orderBy('changedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      changedAt: doc.data().changedAt?.toDate?.() || doc.data().changedAt
    }));
  } catch (error) {
    console.error('❌ Error getting username history:', error);
    return [];
  }
};

/**
 * Record a username change
 */
export const recordUsernameChange = async (userId, oldUsername, newUsername) => {
  if (!userId || !newUsername) return false;
  
  try {
    const historyRef = collection(db, 'users', userId, 'usernameHistory');
    await addDoc(historyRef, {
      oldUsername: oldUsername || null,
      newUsername: newUsername.toLowerCase(),
      changedAt: new Date()
    });
    console.log('✅ Username change recorded');
    return true;
  } catch (error) {
    console.error('❌ Error recording username change:', error);
    return false;
  }
};

/**
 * Check if user can change username (14 day rule)
 */
export const canChangeUsername = async (userId) => {
  if (!userId) return { allowed: false, reason: 'No user ID', daysLeft: 0 };
  
  try {
    const history = await getUsernameHistory(userId);
    
    // If no history, user can change
    if (history.length === 0) {
      return { allowed: true, daysLeft: 0 };
    }
    
    // Get most recent change
    const lastChange = history[0];
    const lastChangeDate = lastChange.changedAt instanceof Date 
      ? lastChange.changedAt 
      : new Date(lastChange.changedAt);
    
    const today = new Date();
    
    // Calculate days difference
    const diffTime = Math.abs(today - lastChangeDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 14) {
      const daysLeft = 14 - diffDays;
      return { 
        allowed: false, 
        reason: `You can change your username again in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
        daysLeft
      };
    }
    
    return { allowed: true, daysLeft: 0 };
  } catch (error) {
    console.error('❌ Error checking username change eligibility:', error);
    return { allowed: false, reason: 'Error checking eligibility', daysLeft: 0 };
  }
};

/**
 * Validate username format
 */
export const validateUsername = (username) => {
  if (!username || username.trim() === '') {
    return { valid: false, error: 'Username cannot be empty' };
  }
  
  const cleaned = username.toLowerCase().trim();
  
  if (cleaned.length > 30) {
    return { valid: false, error: 'Username must be less than 30 characters' };
  }
  
  if (cleaned.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  // Only allow letters, numbers, underscores
  if (!/^[a-z0-9_]+$/.test(cleaned)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  
  return { valid: true, username: cleaned };
};

// ============================================
// EMAIL/PASSWORD AUTHENTICATION HELPERS
// ============================================

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (email, password, displayName, requestedUsername = null) => {
  try {
    // If username is requested, check if it's available
    if (requestedUsername) {
      const validation = validateUsername(requestedUsername);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      
      const taken = await isUsernameTaken(validation.username);
      if (taken) {
        return { success: false, error: 'Username is already taken' };
      }
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    await updateProfile(user, { displayName });
    
    // Create profile in Firestore with username
    const username = requestedUsername 
      ? requestedUsername.toLowerCase() 
      : email.split('@')[0].toLowerCase();
    
    await createUserProfile(user, { displayName, username });
    
    return { success: true, user };
  } catch (error) {
    console.error('❌ Sign up error:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, error: 'Email is already in use' };
    } else if (error.code === 'auth/weak-password') {
      return { success: false, error: 'Password is too weak (min 6 characters)' };
    } else if (error.code === 'auth/invalid-email') {
      return { success: false, error: 'Invalid email address' };
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Login with email and password
 */
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('❌ Login error:', error);
    
    if (error.code === 'auth/user-not-found') {
      return { success: false, error: 'No account found with this email' };
    } else if (error.code === 'auth/wrong-password') {
      return { success: false, error: 'Incorrect password' };
    } else if (error.code === 'auth/too-many-requests') {
      return { success: false, error: 'Too many failed attempts. Try again later' };
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Get user by username
 */
export const getUserByUsername = async (username) => {
  if (!username) return null;
  
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase()));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting user by username:', error);
    return null;
  }
};