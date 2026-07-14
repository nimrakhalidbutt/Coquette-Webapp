import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, provider, signInWithEmailAndPassword } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

export default function Homepage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid email or password.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Try again later.');
          break;
        default:
          setError('Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="instagram-homepage">
      {/* Navigation */}
      <nav className="instagram-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">🎀</span>
            <span className="logo-text">Coquette</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="instagram-hero">
        <div className="hero-container">
          {/* Left side - App mockup */}
          <div className="hero-mockup">
            <div className="mockup-grid">
              <div className="mockup-card card-1">
                <div className="card-header">
                  <div className="card-avatar"></div>
                  <div className="card-name"></div>
                </div>
                <div className="card-image"></div>
                <div className="card-actions">
                  <span className="action-heart">❤️</span>
                  <span className="action-bow">🎀</span>
                </div>
                <div className="card-likes">128 likes</div>
                <div className="card-caption">
                  <span className="caption-user">user</span> manifesting my life ✨
                </div>
              </div>
              
              <div className="mockup-card card-2">
                <div className="card-header">
                  <div className="card-avatar"></div>
                  <div className="card-name"></div>
                </div>
                <div className="card-image"></div>
                <div className="card-actions">
                  <span className="action-heart">❤️</span>
                  <span className="action-bow">🎀</span>
                </div>
                <div className="card-likes">89 likes</div>
                <div className="card-caption">
                  <span className="caption-user">dreamer</span> living my best life 🌸
                </div>
              </div>
            </div>
          </div>

          {/* Right side - DIRECT LOGIN FORM (NO POPUP!) */}
          <div className="hero-auth">
            <div className="auth-card">
              <h1 className="auth-title">Coquette</h1>
              <p className="auth-subtitle">Sign in to continue</p>
              
              {error && (
                <div className="auth-error">
                  <span>😿</span>
                  <span>{error}</span>
                </div>
              )}
              
              <button 
                onClick={handleGoogleSignIn} 
                className="auth-google"
                disabled={loading}
              >
                <span className="google-icon">G</span>
                Continue with Google
              </button>
              
              <div className="auth-divider">
                <span>OR</span>
              </div>
              
              <form className="auth-form" onSubmit={handleEmailSignIn}>
                <input 
                  type="email" 
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  required
                  disabled={loading}
                />
                <input 
                  type="password" 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  required
                  disabled={loading}
                />
                
                <button 
                  type="submit" 
                  className="auth-submit"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Log in'}
                </button>
              </form>
              
              <div className="auth-forgot">
                <button className="forgot-link">
                  Forgot password?
                </button>
              </div>
              
              <div className="auth-signup-prompt">
                <span>Don't have an account?</span>
                <button className="signup-link">
                  Sign up
                </button>
              </div>
              
              <div className="auth-apps">
                <p>Get the app.</p>
                <div className="app-badges">
                  <span className="app-badge">📱 App Store</span>
                  <span className="app-badge">📲 Google Play</span>
                </div>
              </div>
            </div>
            
            <div className="auth-footer">
              <span>© 2026 Coquette</span>
            </div>
          </div>
        </div>
      </section>

      {/* NO MORE AUTH MODAL - COMPLETELY REMOVED! */}
    </div>
  );
}