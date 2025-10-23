import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Login.css';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import Mascot from '../components/Mascot';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const googleLoginBtnRef = useRef(null);
  const [mood, setMood] = useState('neutral'); // 'neutral' | 'happy' | 'sad'

  // Use built-in vector mascots (no image): vary tints for variety
  const tints = [
    { start: '#ecfbf2', end: '#cfeee1' },
    { start: '#eef7ff', end: '#d6e8ff' },
    { start: '#fff4e8', end: '#ffe2c7' },
    { start: '#f7ecff', end: '#e7d6ff' },
  ]

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const API = import.meta.env.VITE_API_BASE_URL ?? ''
      const response = await fetch(API + '/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: username, password })
      });
      const data = await response.json();
      if (response.ok) {
        setMood('happy');
        localStorage.setItem('access_token', data.access_token);
        navigate('/main');
      } else {
        setMood('sad');
        setTimeout(() => setMood('neutral'), 1800);
      }
    } catch (err) {
      setMood('sad');
      setTimeout(() => setMood('neutral'), 1800);
    }
  };

  const handleSocialLogin = (provider) => {
    if (provider === 'google') {
      if (googleLoginBtnRef.current) {
        const googleButton = googleLoginBtnRef.current.querySelector('div[role="button"]');
        if (googleButton) googleButton.click();
      }
    } else if (provider === 'naver') {
      const clientId = import.meta.env.VITE_NAVER_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_NAVER_REDIRECT_URI;
      const state = Math.random().toString(36).substring(2, 15);
      window.location.href = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
    } else if (provider === 'kakao') {
      const kakaoClientId = import.meta.env.VITE_KAKAO_CLIENT_ID;
      const kakaoRedirectUri = 'http://localhost:5174/kakao/callback';
      const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoClientId}&redirect_uri=${kakaoRedirectUri}&response_type=code`;
      window.location.href = kakaoAuthUrl;
    } else {
      alert(`${provider} 로그인은 아직 구현되지 않았습니다.`);
    }
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div className="login-container">
        <div className="login-card">
          <div className="login-left">
            <div className="login-logo-box">
              <img src="/logo.png" alt="NoteFlow Logo" className="login-logo-img" />
              <h1 className="login-logo-text">NoteFlow</h1>
            </div>

            <div className="form-wrap">
              <div className="avatar-circle" aria-hidden>
                <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <circle cx="12" cy="7.5" r="3.6" fill="#ffffff" />
                  <path d="M4 20c0-3.314 4.686-6 8-6s8 2.686 8 6H4z" fill="#ffffff" />
                </svg>
              </div>
              <form className="login-form" onSubmit={handleLogin}>
              <input
                type="text"
                placeholder="아이디"
                className="login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                type="password"
                placeholder="비밀번호"
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="submit" className="login-btn">LOGIN</button>
              </form>

              <div className="login-social-login">
              <button className="login-circle-btn login-kakao-btn" onClick={() => handleSocialLogin('kakao')}>
                <img src="/kakao-icon.svg" alt="Kakao" className="login-kakao-icon" />
              </button>
              <button className="login-circle-btn login-naver-btn" onClick={() => handleSocialLogin('naver')}>
                <img src="/naver-icon.png" alt="Naver" className="login-naver-icon" />
              </button>
              <button className="login-circle-btn login-google-btn" onClick={() => handleSocialLogin('google')}>
                <img src="/google-icon.svg" alt="Google" className="login-google-icon" />
              </button>
            </div>

              <div style={{ position: 'absolute', left: '-9999px' }} ref={googleLoginBtnRef}>
              <GoogleLogin
                onSuccess={async (response) => {
                  const token = response.credential;
                  const API = import.meta.env.VITE_API_BASE_URL ?? ''
                  const res = await fetch(API + '/api/v1/login/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setMood('happy');
                    localStorage.setItem('access_token', data.access_token);
                    navigate('/main');
                  } else {
                    setMood('sad');
                    setTimeout(() => setMood('neutral'), 1800);
                  }
                }}
                onError={() => { setMood('sad'); setTimeout(() => setMood('neutral'), 1800); }}
                useOneTap={false}
              />
              </div>

              <div className="login-signup-text">
                계정이 없으신가요?{' '}
                <a onClick={() => navigate('/signup')} style={{ cursor: 'pointer' }}>
                  회원가입
                </a>
              </div>
            </div>
          </div>

          <div className="login-right">
            <nav className="right-nav">
              <ul>
                <li onClick={() => navigate('/home')}>Home</li>
                <li onClick={() => navigate('/pricing')}>Pricing</li>
                <li onClick={() => navigate('/docs')}>Docs</li>
              </ul>
            </nav>
            <div className="mascot-center" aria-hidden>
              <Mascot
                mood={mood}
                variant="bear"
                tint={{ start: '#e9f7ef', end: '#cfeee1' }}
                size={0.92}
              />
            </div>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
/*
  Screen: Login
  Purpose: Email/password + social login (Google, Naver, Kakao) entry screen.
  Behavior:
   - On success, stores JWT in localStorage as `access_token` and navigates to `/main`.
   - Right-side links navigate to marketing/docs pages.
*/
