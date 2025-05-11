import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './screen/Login';
import SignupPage from './screen/Signup';
import MainPage from './screen/Main';
import NaverCallback from './screen/NaverCallback'; // 네이버 콜백 페이지
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/naver/callback" element={<NaverCallback />} /> {/* ✅ 네이버 콜백 라우트 */}
      </Routes>
    </Router>
  );
}

export default App;
