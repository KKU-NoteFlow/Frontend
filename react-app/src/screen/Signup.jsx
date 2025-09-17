// src/screen/Signup.jsx
import React, { useState } from 'react'
import '../css/Signup.css'
import { useNavigate } from 'react-router-dom'

export default function SignupPage() {
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [email, setEmail] = useState('')

  const handleSignup = async (e) => {
    e.preventDefault()
    if (password !== confirmPw) {
      alert('비밀번호가 일치하지 않습니다')
      return
    }
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loginId, email, password })
        }
      )
      const data = await res.json()
      if (res.ok) {
        navigate('/')
      } else {
        alert(data.detail || data.message || '회원가입 실패')
      }
    } catch {
      alert('서버 연결에 실패했습니다.')
    }
  }

  return (
    <div className="signup-container">
      <div className="signup-box">
        <div className="signup-logo-box">
          <img src="/logo.png" alt="NoteFlow Logo" className="signup-logo-img" />
          <h1 className="signup-logo-text">NoteFlow</h1>
        </div>

        <form className="signup-form" onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="아이디"
            className="signup-input"
            value={loginId}
            onChange={e => setLoginId(e.target.value)}
          />
          <input
            type="password"
            placeholder="비밀번호"
            className="signup-input"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            className="signup-input"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
          />
          <input
            type="email"
            placeholder="이메일"
            className="signup-input"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button type="submit" className="signup-signup-btn">
            회원가입
          </button>
        </form>

        <div className="signup-social-login">
          <button className="signup-circle-btn signup-kakao-btn">
            <img src="/kakao-icon.svg" alt="Kakao" className="signup-kakao-icon" />
          </button>
          <button className="signup-circle-btn signup-naver-btn">
            <img src="/naver-icon.png" alt="Naver" className="signup-naver-icon" />
          </button>
          <button className="signup-circle-btn signup-google-btn">
            <img src="/google-icon.svg" alt="Google" className="signup-google-icon" />
          </button>
        </div>

        <div className="signup-login-text">
          이미 계정이 있으신가요?{' '}
          <span
            className="signup-login-link"
            onClick={() => navigate('/')}
          >
            로그인
          </span>
        </div>
      </div>
    </div>
  )
}
