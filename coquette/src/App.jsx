import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { auth } from "./firebase";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import PostForm from "./components/PostForm";
import PostList from "./components/PostList";
import SavedPosts from "./components/SavedPosts";
import Notifications from "./components/Notifications";
import NotificationToast from "./components/NotificationToast";
import Homepage from "./components/Homepage";
import ProfilePage from "./components/ProfilePage";
import SearchProfiles from "./components/SearchProfiles";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { SearchProvider, useSearch } from "./contexts/SearchContext";

import "./app.css";

// Inner component that uses hooks
function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const { searchOpen, closeSearch } = useSearch();

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Show loading screen
  if (loading) {
    return (
      <div className="loading-screen">
        <h2 className="loading-text">🌸 loading...</h2>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        {/* ✅ FIXED: Added onShowSaved prop to Navbar */}
        {user && <Navbar 
          user={user} 
          setUser={setUser} 
          onShowSaved={() => {
            console.log('📂 Opening saved posts from Navbar');
            setShowSaved(true);
          }}
        />}
        
        {/* Routes */}
        <Routes>
          {/* Home route - shows homepage if not logged in, main app if logged in */}
          <Route path="/" element={
            user ? (
              <main className="main-container">
                <PostForm />
                <PostList />
              </main>
            ) : (
              <Homepage />
            )
          } />
          
          {/* Profile page route */}
          <Route path="/profile/:userId" element={<ProfilePage />} />
        </Routes>

        {/* Bottom Navigation - only show when logged in */}
        {user && <BottomNav onShowSaved={() => {
          console.log('📂 Opening saved posts from BottomNav');
          setShowSaved(true);
        }} />}

        {/* Saved posts modal */}
        {showSaved && (
          <SavedPosts onClose={() => {
            console.log('❌ Closing saved posts');
            setShowSaved(false);
          }} />
        )}
        
        {/* Notification components */}
        <Notifications />
        <NotificationToast />
        
        {/* Search modal */}
        {searchOpen && <SearchProfiles onClose={closeSearch} />}
      </div>
    </Router>
  );
}

// Main App component with providers
export default function App() {
  return (
    <ProfileProvider>
      <NotificationProvider>
        <SearchProvider>
          <AppContent />
        </SearchProvider>
      </NotificationProvider>
    </ProfileProvider>
  );
}