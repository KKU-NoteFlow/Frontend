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
        <div className="login-box">
          <div className="login-logo-box">
            <img src="/logo.png" alt="NoteFlow Logo" className="login-logo-img" />
            <h1 className="login-logo-text">NoteFlow</h1>
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
            <button type="submit" className="login-btn">로그인</button>
          </form>

          <div className="login-social-login">
            <button className="login-circle-btn login-kakao-btn">
              <img
                src="/kakao-icon.svg"
                alt="Kakao"
                className="login-kakao-icon"
                onClick={() => handleSocialLogin('kakao')}
              />
            </button>
            <button className="login-circle-btn login-naver-btn">
              <img
                src="/naver-icon.png"
                alt="Naver"
                className="login-naver-icon"
                onClick={() => handleSocialLogin('naver')}
              />
            </button>
            <button className="login-circle-btn login-google-btn">
              <img
                src="/google-icon.svg"
                alt="Google"
                className="login-google-icon"
                onClick={() => handleSocialLogin('google')}
              />
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
    </GoogleOAuthProvider>
  );
}
