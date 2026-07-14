import { db, auth, rtdb } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, get } from 'firebase/database';

/**
 * Hybrid Feed Algorithm
 * 70% Following posts + 30% Popular posts
 */
export const getHybridFeed = async (userId, limitCount = 50) => {
  console.log('🔄 Generating hybrid feed for user:', userId);
  
  const startTime = Date.now();
  
  try {
    // If not logged in, show only popular posts
    if (!userId) {
      return await getPopularPosts(limitCount);
    }
    
    // Get users that this user follows
    const following = await getFollowingUsers(userId);
    
    // If user follows no one, show popular posts
    if (following.length === 0) {
      console.log('📭 User follows no one, showing popular posts');
      return await getPopularPosts(limitCount);
    }
    
    // Get posts from followed users (70% of feed)
    const followingPosts = await getFollowingPosts(following, Math.floor(limitCount * 0.7));
    
    // Get popular posts from everyone (30% of feed)
    const popularPosts = await getPopularPosts(Math.ceil(limitCount * 0.3));
    
    // Combine and sort by date
    const allPosts = [...followingPosts, ...popularPosts];
    
    // Remove duplicates (same post might appear in both)
    const uniquePosts = removeDuplicates(allPosts);
    
    // Sort by creation date (newest first)
    const sortedPosts = uniquePosts.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    
    // Limit to requested number
    const finalPosts = sortedPosts.slice(0, limitCount);
    
    console.log(`✅ Hybrid feed generated in ${Date.now() - startTime}ms`);
    console.log(`📊 Following posts: ${followingPosts.length}, Popular posts: ${popularPosts.length}`);
    
    return finalPosts;
    
  } catch (error) {
    console.error('❌ Error generating hybrid feed:', error);
    return [];
  }
};

/**
 * Get users that this user follows
 */
const getFollowingUsers = async (userId) => {
  try {
    const followingRef = ref(rtdb, `following/${userId}`);
    const followingSnap = await get(followingRef);
    
    if (followingSnap.exists()) {
      return Object.keys(followingSnap.val());
    }
    
    return [];
  } catch (error) {
    console.error('Error getting following users:', error);
    return [];
  }
};

/**
 * Get posts from followed users
 */
const getFollowingPosts = async (followingUserIds, limitCount) => {
  if (followingUserIds.length === 0) return [];
  
  try {
    const postsRef = collection(db, 'posts');
    
    // Firestore 'in' queries are limited to 10 items
    // We'll batch them if needed
    const batches = [];
    for (let i = 0; i < followingUserIds.length; i += 10) {
      const batch = followingUserIds.slice(i, i + 10);
      batches.push(batch);
    }
    
    let allPosts = [];
    
    for (const batch of batches) {
      const q = query(
        postsRef,
        where('uid', 'in', batch),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        feedType: 'following'
      }));
      
      allPosts = [...allPosts, ...posts];
    }
    
    return allPosts;
    
  } catch (error) {
    console.error('Error getting following posts:', error);
    return [];
  }
};

/**
 * Get popular posts based on engagement
 */
const getPopularPosts = async (limitCount) => {
  try {
    const postsRef = collection(db, 'posts');
    
    // For now, use a combination of recency and we'll add engagement later
    // In production, you'd have a 'score' field updated by cloud functions
    const q = query(
      postsRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount * 2) // Get more to filter later
    );
    
    const snapshot = await getDocs(q);
    let posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      feedType: 'popular'
    }));
    
    // Calculate engagement score
    posts = await addEngagementScores(posts);
    
    // Sort by engagement score
    posts.sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0));
    
    return posts.slice(0, limitCount);
    
  } catch (error) {
    console.error('Error getting popular posts:', error);
    return [];
  }
};

/**
 * Add engagement scores to posts
 */
const addEngagementScores = async (posts) => {
  try {
    const enhancedPosts = await Promise.all(posts.map(async (post) => {
      let likes = 0;
      let coquettes = 0;
      
      // Get likes count from Realtime DB
      const likesRef = ref(rtdb, `likes/${post.id}`);
      const likesSnap = await get(likesRef);
      if (likesSnap.exists()) {
        likes = Object.keys(likesSnap.val()).length;
      }
      
      // Get coquettes count from Realtime DB
      const coquettesRef = ref(rtdb, `coquettes/${post.id}`);
      const coquettesSnap = await get(coquettesRef);
      if (coquettesSnap.exists()) {
        coquettes = Object.keys(coquettesSnap.val()).length;
      }
      
      // Calculate engagement score
      // Weight: likes (1 point), coquettes (2 points)
      const engagementScore = (likes * 1) + (coquettes * 2);
      
      // Add recency bonus (posts within last 24 hours get boost)
      const postDate = post.createdAt?.toDate?.() || new Date();
      const hoursOld = (Date.now() - postDate) / (1000 * 60 * 60);
      const recencyBonus = hoursOld < 24 ? 10 : 0;
      
      return {
        ...post,
        likes,
        coquettes,
        engagementScore: engagementScore + recencyBonus
      };
    }));
    
    return enhancedPosts;
    
  } catch (error) {
    console.error('Error adding engagement scores:', error);
    return posts;
  }
};

/**
 * Remove duplicate posts
 */
const removeDuplicates = (posts) => {
  const seen = new Set();
  return posts.filter(post => {
    if (seen.has(post.id)) {
      return false;
    }
    seen.add(post.id);
    return true;
  });
};