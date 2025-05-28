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
      {/* --- 인증 관련 --- */}
      <Route path="/"            element={<LoginPage />} />
      <Route path="/signup"      element={<SignupPage />} />
      <Route path="/naver/callback" element={<NaverCallback />} />
      <Route path="/kakao/callback" element={<KakaoCallback />} />

      {/* --- 노트 관련 --- */}
      <Route element={<Layout />}>
        <Route path="/main"      element={<MainPage />} />
        <Route path="/notes/new" element={<NewNotePage />} />
        <Route path="/notes/:id" element={<NoteDetail />} />
      </Route>


      {/* --- 그 외 경로는 로그인으로 --- */}
      <Route path="*"            element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
)

export default App
