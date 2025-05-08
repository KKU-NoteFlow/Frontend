import React, {useState} from 'react'
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
          loginId: username,     // ✅ 정확한 키 사용
          password: password
        })
      })
  
      const data = await response.json()
      
      if (response.ok) {
        console.log('로그인 성공:', data)
        navigate('/main')
      } else {
        alert(data.message || '로그인 실패')
      }
    } catch (err) {
      console.error('연결 오류:', err)
      alert('서버와의 연결에 실패했습니다.')
    }
  }
  
  // const handleLogin = (e) => {
  //   e.preventDefault()
  //   // 로그인 검증 로직은 생략하고 바로 이동
  //   navigate('/main')
  // }

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
          <input type="text" placeholder="아이디" className="login-input" value={username} onChange={(e) => setUsername(e.target.value)}/>
          <input type="password" placeholder="비밀번호" className="login-input" value={password} onChange={(e) => setPassword(e.target.value)}/>
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
