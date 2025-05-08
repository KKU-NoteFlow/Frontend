import React from 'react'
import '../css/Signup.css'
import { useNavigate } from 'react-router-dom'

export default function SignupPage() {
  const navigate = useNavigate()

  return (
    <div className="signup-container">
      <div className="signup-box">
        {/* 로고 + 이름 */}
        <div className="signup-logo-box">
          <img src="/logo.png" alt="NoteFlow Logo" className="signup-logo-img" />
          <h1 className="signup-logo-text">NoteFlow</h1>
        </div>

        {/* 입력폼 */}
        <form className="signup-form">
          <input type="text" placeholder="아이디" className="signup-input" />
          <input type="password" placeholder="비밀번호" className="signup-input" />
          <input type="password" placeholder="비밀번호 확인" className="signup-input" />
          <input type="email" placeholder="이메일" className="signup-input" />
          <button type="submit" className="signup-signup-btn">회원가입</button>
        </form>

        {/* SNS 버튼 */}
        <div className="signup-social-login">
          <button className="signup-circle-btn signup-kakao-btn">
            <img src="/kakao-icon.svg" alt="Kakao" className="signup-kakao-icon"/>
          </button>
          <button className="signup-circle-btn signup-naver-btn">
            <img src="/naver-icon.png" alt="Naver" className="signup-naver-icon"/>
          </button>
          <button className="signup-circle-btn signup-google-btn">
            <img src="/google-icon.svg" alt="Google" className="signup-google-icon"/>
          </button>
        </div>

        {/* 로그인 링크 */}
        <div className="signup-login-text">
          이미 계정이 있으신가요? <span className="signup-login-link" onClick={() => navigate('/')}>로그인</span>
        </div>
      </div>
    </div>
  )
}
