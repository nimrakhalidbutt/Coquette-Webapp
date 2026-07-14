import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

/**
 * Update all posts by a user with new name or photo
 */
export const updateAllUserPosts = async (userId, newName, newPhotoURL) => {
  if (!userId) {
    console.log('❌ No userId provided');
    return { success: false, count: 0, error: 'No user ID provided' };
  }
  
  // No changes to make
  if (!newName && !newPhotoURL) {
    console.log('⚠️ No changes to apply to posts');
    return { success: true, count: 0, message: 'No changes needed' };
  }
  
  console.log('🔄 Starting updateAllUserPosts for user:', userId);
  console.log('📝 New name:', newName);
  console.log('📸 New photo:', newPhotoURL);
  
  try {
    // Query all posts by this user
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, where('uid', '==', userId));
    const querySnapshot = await getDocs(q);
    
    // No posts found
    if (querySnapshot.empty) {
      console.log('📭 No posts found for this user');
      return { success: true, count: 0, message: 'No posts to update' };
    }
    
    console.log(`📊 Found ${querySnapshot.size} posts to update`);
    
    let updateCount = 0;
    let failedCount = 0;
    const failedPosts = [];
    
    // Update each post with individual error handling
    for (const postDoc of querySnapshot.docs) {
      try {
        const postRef = doc(db, 'posts', postDoc.id);
        const updates = {};
        
        if (newName) {
          updates.name = newName;
        }
        if (newPhotoURL) {
          updates.photoURL = newPhotoURL;
        }
        
        if (Object.keys(updates).length > 0) {
          await updateDoc(postRef, updates);
          updateCount++;
          console.log(`✅ Updated post ${postDoc.id}`);
        }
      } catch (postError) {
        console.error(`❌ Failed to update post ${postDoc.id}:`, postError);
        failedCount++;
        failedPosts.push(postDoc.id);
      }
    }
    
    // Some posts failed
    if (failedCount > 0) {
      console.warn(`⚠️ ${failedCount} posts failed to update`);
      return { 
        success: false, 
        count: updateCount, 
        failed: failedCount,
        failedPosts,
        error: `${failedCount} posts failed to update` 
      };
    }
    
    console.log(`✅ Successfully updated ${updateCount} posts`);
    return { success: true, count: updateCount };
    
  } catch (error) {
    console.error('❌ Error querying posts:', error);
    
    // Check for specific Firebase errors
    if (error.code === 'permission-denied') {
      return { success: false, count: 0, error: 'Permission denied. Check Firebase rules.' };
    } else if (error.code === 'not-found') {
      return { success: false, count: 0, error: 'Posts collection not found.' };
    } else if (error.code === 'unavailable') {
      return { success: false, count: 0, error: 'Network error. Please check your connection.' };
    }
    
    return { success: false, count: 0, error: error.message };
  }
};