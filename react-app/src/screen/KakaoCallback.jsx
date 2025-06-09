// src/screen/KakaoCallback.jsx
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function KakaoCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasRun = useRef(false); // ✅ 중복 방지

  useEffect(() => {
    const code = searchParams.get('code');
    console.log('🔐 Kakao code:', code);

    // 이미 요청한 경우 중복 방지
    if (hasRun.current) return;
    hasRun.current = true;

    if (!code) {
      alert('카카오 로그인 실패: code 없음');
      return;
    }

    const loginWithKakao = async () => {
      try {
        const response = await fetch('http://222.116.135.71:8080/api/v1/auth/kakao/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ code }), // ✅ form-urlencoded
        });

        const data = await response.json();
        console.log('🎯 서버 응답:', data);

        if (response.ok && data.user_id && data.access_token) {
          localStorage.setItem('access_token', data.access_token);
          navigate('/main');
        } else {
          alert(data.detail || data.message || '카카오 로그인 실패 (응답 오류)');
        }
      } catch (error) {
        console.error('❌ 요청 실패:', error);
        alert('카카오 로그인 중 서버 연결에 실패했습니다.');
      }
    };

    loginWithKakao();
  }, [navigate, searchParams]);

  return <div>카카오 로그인 처리 중입니다...</div>;
}