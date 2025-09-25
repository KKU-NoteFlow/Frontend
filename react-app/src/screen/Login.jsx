import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Login.css';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const googleLoginBtnRef = useRef(null);

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
        localStorage.setItem('access_token', data.access_token);
        navigate('/main');
      } else {
        alert(data.message || '로그인 실패');
      }
    } catch (err) {
      alert('서버와의 연결에 실패했습니다.');
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
                    localStorage.setItem('access_token', data.access_token);
                    navigate('/main');
                  } else {
                    alert(data.message || '구글 로그인 실패');
                  }
                }}
                onError={() => alert('구글 로그인 실패')}
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
                <li>Home</li>
                <li>Features</li>
                <li>Pricing</li>
                <li>Docs</li>
              </ul>
            </nav>
            <svg className="decorative-blob" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(300,300)">
                <path d="M120,-150C165,-120,200,-80,210,-30C220,20,205,70,180,110C155,150,120,180,70,200C20,220,-40,220,-80,190C-120,160,-150,110,-170,60C-190,10,-200,-40,-180,-80C-160,-120,-120,-150,-70,-170C-20,-190,40,-190,90,-170C120,-155,80,-180,120,-150Z" fill="#2f6b7b" opacity="0.12"/>
              </g>
            </svg>

            <div className="welcome-text">
              <h2 className="welcome-title">Welcome.</h2>
              <p className="welcome-sub">Nice to see you. Please login to continue to your dashboard and manage your notes.</p>
            </div>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
