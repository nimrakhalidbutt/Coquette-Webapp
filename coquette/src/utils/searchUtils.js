import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

/**
 * Flexible search for users - matches username, display name, email, and bio
 * Returns results sorted by relevance
 */
export const searchUsers = async (searchTerm, maxResults = 20) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return [];
  }
  
  const term = searchTerm.toLowerCase().trim();
  console.log('🔍 Searching for:', term);
  
  try {
    // Get ALL users from Firestore
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    if (querySnapshot.empty) {
      console.log('📭 No users found in database');
      return [];
    }
    
    console.log(`📊 Total users in database: ${querySnapshot.size}`);
    
    // Score each user based on how well they match
    const scoredResults = [];
    
    querySnapshot.forEach(doc => {
      const userData = doc.data();
      const userId = doc.id;
      
      // Skip if no data
      if (!userData) return;
      
      // Get searchable fields
      const username = (userData.username || '').toLowerCase();
      const displayName = (userData.displayName || '').toLowerCase();
      const email = (userData.email || '').toLowerCase();
      const bio = (userData.bio || '').toLowerCase();
      
      let score = 0;
      let matchType = '';
      
      // --- EXACT MATCHES (highest priority) ---
      if (username === term) {
        score += 100;
        matchType = 'exact username';
      } else if (displayName === term) {
        score += 95;
        matchType = 'exact name';
      } else if (email === term) {
        score += 90;
        matchType = 'exact email';
      } 
      
      // --- STARTS WITH (high priority) ---
      else if (username.startsWith(term)) {
        score += 80;
        matchType = 'username starts with';
      } else if (displayName.startsWith(term)) {
        score += 75;
        matchType = 'name starts with';
      } else if (email.startsWith(term)) {
        score += 70;
        matchType = 'email starts with';
      }
      
      // --- CONTAINS (medium priority) ---
      else if (username.includes(term)) {
        score += 60;
        matchType = 'username contains';
      } else if (displayName.includes(term)) {
        score += 55;
        matchType = 'name contains';
      } else if (email.includes(term)) {
        score += 50;
        matchType = 'email contains';
      } else if (bio.includes(term)) {
        score += 40;
        matchType = 'bio contains';
      }
      
      // --- FUZZY MATCHING (typo tolerance) ---
      else {
        // Check for similar words (typo tolerance)
        const words = [...username.split(/[^a-z0-9]/), 
                      ...displayName.split(/[^a-z0-9]/),
                      ...bio.split(/[^a-z0-9]/)];
        
        for (const word of words) {
          if (word.length < 3) continue;
          
          // Levenshtein distance would be better, but this is simpler
          if (word.includes(term) || term.includes(word)) {
            score += 30;
            matchType = 'partial match';
            break;
          }
          
          // Check if they share at least 70% of characters
          const commonChars = [...term].filter(char => word.includes(char)).length;
          const similarity = commonChars / Math.max(term.length, word.length);
          
          if (similarity > 0.7) {
            score += 20;
            matchType = 'similar word';
            break;
          }
        }
      }
      
      // Only include users with a positive score
      if (score > 0) {
        scoredResults.push({
          id: userId,
          ...userData,
          searchScore: score,
          matchType: matchType,
          // Add derived fields for display
          displayName: userData.displayName || 'Anonymous',
          username: userData.username || userData.email?.split('@')[0] || 'user',
          photoURL: userData.photoURL || null,
          bio: userData.bio || ''
        });
      }
    });
    
    // Sort by score (highest first) and limit results
    const results = scoredResults
      .sort((a, b) => b.searchScore - a.searchScore)
      .slice(0, maxResults);
    
    console.log(`✅ Found ${results.length} results with scores:`, 
      results.map(r => ({ name: r.displayName, score: r.searchScore, match: r.matchType })));
    
    return results;
    
  } catch (error) {
    console.error('❌ Error searching users:', error);
    return [];
  }
};

/**
 * Search for users with autocomplete (faster, less accurate)
 */
export const autocompleteUsers = async (searchTerm, maxResults = 10) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return [];
  }
  
  const term = searchTerm.toLowerCase().trim();
  
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    const results = [];
    
    querySnapshot.forEach(doc => {
      const userData = doc.data();
      const username = (userData.username || '').toLowerCase();
      const displayName = (userData.displayName || '').toLowerCase();
      
      // Quick check for autocomplete - just starts with
      if (username.startsWith(term) || displayName.startsWith(term)) {
        results.push({
          id: doc.id,
          displayName: userData.displayName || 'Anonymous',
          username: userData.username || userData.email?.split('@')[0] || 'user',
          photoURL: userData.photoURL || null
        });
      }
    });
    
    return results.slice(0, maxResults);
    
  } catch (error) {
    console.error('Error in autocomplete:', error);
    return [];
  }
};