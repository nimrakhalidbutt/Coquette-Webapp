import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

export const refreshAllProfilesInPosts = async () => {
  console.log('🔄 Refreshing all profiles in posts...');
  
  try {
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    let totalUpdated = 0;
    
    // For each user, update their posts with latest profile data
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Get all posts by this user
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, where('uid', '==', userId));
      const postsSnap = await getDocs(q);
      
      let userUpdated = 0;
      
      for (const postDoc of postsSnap.docs) {
        const postRef = doc(db, 'posts', postDoc.id);
        const updates = {};
        
        if (userData.photoURL) {
          updates.photoURL = userData.photoURL;
        }
        if (userData.displayName) {
          updates.name = userData.displayName;
        }
        
        if (Object.keys(updates).length > 0) {
          await updateDoc(postRef, updates);
          userUpdated++;
        }
      }
      
      if (userUpdated > 0) {
        console.log(`✅ Updated ${userUpdated} posts for user ${userId}`);
        totalUpdated += userUpdated;
      }
    }
    
    console.log(`✅✅✅ Total updated: ${totalUpdated} posts`);
    return totalUpdated;
    
  } catch (error) {
    console.error('❌ Error refreshing profiles:', error);
    return 0;
  }
};