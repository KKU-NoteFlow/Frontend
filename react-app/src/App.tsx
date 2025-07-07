// src/App.tsx

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import LoginPage       from './screen/Login'
import SignupPage      from './screen/Signup'
import MainPage        from './screen/Main'
import Layout          from './components/Layout'
import NewNotePage     from './screen/NewNotePage'
import NoteDetail      from './screen/NoteDetail'
import NaverCallback   from './screen/NaverCallback'
import KakaoCallback   from './screen/KakaoCallback'

import './App.css'

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* --- 인증 관련 (로그인/회원가입/소셜 콜백) --- */}
      <Route path="/"                 element={<LoginPage />} />
      <Route path="/signup"           element={<SignupPage />} />
      <Route path="/naver/callback"   element={<NaverCallback />} />
      <Route path="/kakao/callback"   element={<KakaoCallback />} />

      {/* --- Layout 하위 라우팅 --- */}
      <Route element={<Layout />}>
        {/* 1) 폴더 미선택(전체/최근/즐겨찾기) */}
        <Route path="/main"             element={<MainPage />} />
        {/* 2) 폴더 선택 상태 (URL에 folderId가 붙음) */}
        <Route path="/main/:folderId"   element={<MainPage />} />
        {/* 새 노트 생성 */}
        <Route path="/notes/new"        element={<NewNotePage />} />
        {/* 노트 상세 보기 */}
        <Route path="/notes/:id"        element={<NoteDetail />} />
      </Route>

      {/* --- 그 외 모든 경로는 로그인으로 리다이렉트 --- */}
      <Route path="*"                  element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
)

export default App
