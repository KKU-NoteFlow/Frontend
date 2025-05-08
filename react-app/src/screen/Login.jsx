import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../css/Login.css' // CSS 파일을 별도로 연결

export default function LoginPage() {

  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
  
    try {
      const response = await fetch('http://222.116.135.71:8080/api/v1/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          loginId: username,    // loginId로 보내야 함
          password: password    // password 필드
        }),
      })
  
      if (response.ok) {
        const data = await response.json()
        console.log('로그인 성공:', data)
        // 예시: user_id를 localStorage에 저장
        localStorage.setItem('user_id', data.user_id)
        navigate('/main')
      } else {
        const err = await response.json()
        alert(`로그인 실패: ${err.message || '잘못된 자격 증명입니다.'}`)
      }
    } catch (err) {
      console.error('로그인 오류:', err)
      alert('서버와의 연결에 실패했습니다.')
    }
  }

  const handleSocialLogin = (provider) => {
    window.location.href = `http://localhost:8000/auth/${provider}`;
  };

  return (
    <div className="login-container">
      <div className="login-box">
        {/* 로고 + 이름 */}
        <div className="login-logo-box">
          <img src="/logo.png" alt="NoteFlow Logo" className="login-logo-img" />
          <h1 className="login-logo-text">NoteFlow</h1>
        </div>

        {/* 로그인 입력 */}
        <form className="login-form" onSubmit={handleLogin}>
          <input type="text" placeholder="아이디" className="login-input" />
          <input type="password" placeholder="비밀번호" className="login-input" />
          <button type="submit" className="login-btn">로그인</button>
        </form>

        {/* 소셜 로그인 버튼 */}
        <div className="login-social-login">
          <button className="login-circle-btn login-kakao-btn">
            <img src="/kakao-icon.svg" alt="Kakao" className="login-kakao-icon" onClick={() => handleSocialLogin('kakao')}/>
          </button>
          <button className="login-circle-btn login-naver-btn">
            <img src="/naver-icon.png" alt="Naver" className="login-naver-icon" onClick={() => handleSocialLogin('naver')}/>
          </button>
          <button className="login-circle-btn login-google-btn">
            <img src="/google-icon.svg" alt="Google" className="login-google-icon" onClick={() => handleSocialLogin('google')}/>
          </button>
        </div>

        {/* 회원가입 링크 */}
        <div className="login-signup-text">
          계정이 없으신가요?  <a onClick={() => navigate('/signup')} style={{ cursor: 'pointer' }}>회원가입</a>
        </div>
      </div>
    </div>
  )
}
