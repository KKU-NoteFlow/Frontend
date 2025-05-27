// src/screen/KakaoCallback.jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function KakaoCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    console.log('Kakao code:', code);

    if (!code) {
      alert('카카오 로그인 실패: code 없음');
      return;
    }

    fetch('http://222.116.135.71:8080/api/v1/auth/kakao/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ code }), // ✅ form-encoded 방식
    })
      .then((res) => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 200 && data.user_id && data.access_token) {
          localStorage.setItem('access_token', data.access_token);
          navigate('/main');
        } else {
          alert(data.message || '카카오 로그인 실패');
        }
      })
      .catch(() => alert('서버 연결 실패'));
  }, [navigate, searchParams]);

  return <div>카카오 로그인 처리 중입니다...</div>;
}