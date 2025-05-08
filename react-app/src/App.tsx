import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './screen/Login'
import SignupPage from './screen/Signup'
import MainPage from './screen/Main'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/main" element={<MainPage />} />
      </Routes>
    </Router>
  )
}

export default App
