import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import { TbReload } from "react-icons/tb";
import '../css/Topbar.css'
import ColorPalette from './ColorPalette'
import { IconSearch } from '../ui/icons'

export default function TopBar({
  onNewNote,
  // 삭제: currentNote, onToggleFavorite
  onToggleSidebar,
  sidebarState
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [mode, setMode] = useState('light')
  const navigate = useNavigate()
  const btnRef = useRef(null)

  useEffect(() => {
    const savedMode = localStorage.getItem('nf-theme-mode') || 'light'
    document.body.classList.toggle('dark', savedMode === 'dark')
    document.documentElement.classList.toggle('dark', savedMode === 'dark')
    setMode(savedMode)
    try { localStorage.removeItem('nf-theme-custom') } catch {}
  }, [])

  const toggleThemeMode = () => {
    const next = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    document.body.classList.toggle('dark', next === 'dark')
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem('nf-theme-mode', next)
  }

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const API = import.meta.env.VITE_API_BASE_URL ?? ''
    fetch(`${API}/api/v1/notes`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        const filtered = data.filter(n =>
          (n.title || '').toLowerCase().includes(query.toLowerCase())
        )
        setResults(filtered)
      })
      .catch(err => {
        console.error('노트 검색 실패:', err)
      })
  }, [query])

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="icon-btn" onClick={onToggleSidebar} title={sidebarState === 'pinned' ? '사이드바 숨기기' : '사이드바 열기'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <rect x="2" y="3" width="20" height="18" rx="2" fill="currentColor" opacity="0.06" />
            <rect x="8.5" y="4" width="1" height="16" fill="currentColor" opacity="0.18" />
            {sidebarState === 'pinned' ? (
              <path d="M16 8l-3 4 3 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M14 8l3 4-3 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </div>
        <div className="icon-btn" onClick={handleRefresh} title='새로고침'>
          <TbReload />
        </div>
        <div className="icon-btn" onClick={() => navigate(-1)} title="뒤로가기">
          <BsChevronLeft />
        </div>
        <div className="icon-btn" onClick={() => navigate(1)} title="앞으로가기">
          <BsChevronRight />
        </div>
        <button className="topbar-new" onClick={onNewNote}>+ 새 노트</button>
        
        <div className="search-container">
          <div className="search-input-wrap">
            <IconSearch className="search-icon" size={18} stroke={2} />
            <input
              className="topbar-search"
              type="text"
              placeholder="노트 제목 검색"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          {results.length > 0 && (
            <ul className="search-results">
              {results.slice(0, 5).map(note => (
                <li
                  key={note.id}
                  onClick={() => {
                    navigate(`/notes/${note.id}`)
                    setQuery('')
                    setResults([])
                  }}
                >
                  {note.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="topbar-actions">
        {/* 삭제: 현재 노트 즐겨찾기 토글 버튼 */}
        <ColorPalette mode={mode} />
        <button
          ref={btnRef}
          className="topbar-settings"
          onClick={toggleThemeMode}
          aria-label="테마 전환"
          title={mode === 'dark' ? '라이트 모드' : '다크 모드'}
        >
          {mode === 'dark' ? '☀︎' : '🌙'}
        </button>
      </div>
    </header>
  )
}
