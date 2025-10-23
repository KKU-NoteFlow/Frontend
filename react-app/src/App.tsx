// src/App.tsx

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom' // 👈 useParams 추가

import LoginPage       from './screen/Login'
import SignupPage      from './screen/Signup'
import MainPage        from './screen/Main'
import Layout          from './components/Layout'
import NewNotePage     from './screen/NewNotePage'
import NoteDetail      from './screen/NoteDetail' // 👈 NoteDetail 컴포넌트
import NaverCallback   from './screen/NaverCallback'
import KakaoCallback   from './screen/KakaoCallback'
import SpeechToText     from './screen/SpeechToText'
import Home            from './screen/Home'
import Pricing         from './screen/Pricing'
import Docs            from './screen/Docs'

import './App.css'

// 1. NoteDetail 컴포넌트에 key를 전달하기 위한 Wrapper 컴포넌트 생성
const NoteDetailWithKey = () => {
  const { id } = useParams();
  return <NoteDetail key={id} />;
};

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* --- 인증 관련 (로그인/회원가입/소셜 콜백) --- */}
      <Route path="/"                 element={<LoginPage />} />
      <Route path="/signup"           element={<SignupPage />} />
      <Route path="/naver/callback"   element={<NaverCallback />} />
      <Route path="/kakao/callback"   element={<KakaoCallback />} />

      {/* --- 마케팅 / 문서 페이지 --- */}
      <Route path="/home"             element={<Home />} />
      <Route path="/pricing"          element={<Pricing />} />
      <Route path="/docs"             element={<Docs />} />

      {/* --- Layout 하위 라우팅 --- */}
      <Route element={<Layout />}>
        {/* 1) 폴더 미선택(전체/최근/즐겨찾기) */}
        <Route path="/main"             element={<MainPage />} />
        {/* 2) 폴더 선택 상태 (URL에 folderId가 붙음) */}
        <Route path="/main/:folderId"   element={<MainPage />} />
        {/* 새 노트 생성 */}
        <Route path="/notes/new"        element={<NewNotePage />} />
        
        {/* 2. 기존 NoteDetail 라우트를 새로 만든 Wrapper로 교체 */}
        <Route path="/notes/:id"        element={<NoteDetailWithKey />} /> 
        <Route path="/stt"               element={<SpeechToText />} />

      </Route>

      {/* --- 그 외 모든 경로는 로그인으로 리다이렉트 --- */}
      <Route path="*"                  element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
)

export default App
/*
  NoteFlow Frontend — Routing Entry (App)
  Purpose: Declares all react-router routes for authentication, main app, notes, STT, and marketing/docs.
  Structure:
   - Public routes: `/`, `/signup`, social auth callbacks, marketing pages (`/home`, `/features`, `/pricing`, `/docs`).
   - App routes under `<Layout/>`: `/main`, `/main/:folderId`, `/notes/new`, `/notes/:id`, `/stt`.
   - Wildcard redirects to `/`.
  Notes:
   - `NoteDetailWithKey` re-renders the detail component when URL `id` changes.
*/
