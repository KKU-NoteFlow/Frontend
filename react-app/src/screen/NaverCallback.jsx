// src/screen/NaverCallback.jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function NaverCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && state) {
      fetch('http://222.116.135.71:8080/api/v1/login/naver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user_id) {
            navigate('/main');
          } else {
            alert(data.message || '네이버 로그인 실패');
          }
        })
        .catch(() => alert('서버 연결 실패'));
    }
  }, [navigate, searchParams]);

  return <div>네이버 로그인 처리 중...</div>;
}
/*
  Screen: NaverCallback
  Purpose: Handle OAuth callback from Naver; exchanges code for token, stores JWT, goes to `/main`.
*/
