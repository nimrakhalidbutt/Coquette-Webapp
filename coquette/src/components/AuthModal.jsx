import { useState } from 'react';
import { auth, provider, signUpWithEmail, loginWithEmail } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { useProfile } from '../contexts/ProfileContext';

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setShowAuthModal } = useProfile();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    
    try {
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
      onClose?.();
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await signUpWithEmail(email, password, displayName);
      if (result.success) {
        setShowAuthModal(false);
        onClose?.();
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await loginWithEmail(email, password);
      if (result.success) {
        setShowAuthModal(false);
        onClose?.();
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>✕</button>
        
        <div className="auth-modal-header">
          <span className="auth-icon">🎀</span>
          <h2 className="auth-title">
            {mode === 'login' ? 'welcome back!' : 'create account'}
          </h2>
          <span className="auth-icon">✨</span>
        </div>

        {error && (
          <div className="auth-error">
            <span>😿</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={mode === 'login' ? handleEmailLogin : handleEmailSignUp}>
          {mode === 'signup' && (
            <div className="auth-input-group">
              <span className="auth-input-icon">👤</span>
              <input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="auth-input"
              />
            </div>
          )}

          <div className="auth-input-group">
            <span className="auth-input-icon">📧</span>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
            />
          </div>

          <div className="auth-input-group">
            <span className="auth-input-icon">🔒</span>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input"
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? '✨ please wait...' : mode === 'login' ? 'login' : 'create account'}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button 
            type="button" 
            className="auth-google-btn" 
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <span className="google-icon">G</span>
              Continue with google
          </button>

          <button 
            type="button" 
            className="auth-switch-btn"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'need an account? sign up' : 'already have an account? login'}
          </button>
        </form>
      </div>
    </div>
  );
}