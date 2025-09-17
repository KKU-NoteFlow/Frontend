// src/components/Topbar.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdOutlineStarOutline, MdOutlineStarPurple500 } from "react-icons/md";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import { TbReload } from "react-icons/tb";
import '../css/Topbar.css'
import ColorPalette from './ColorPalette'
import { IconStar, IconSearch } from '../ui/icons'

export default function TopBar({
  onNewNote,
  currentNote,
  onToggleFavorite,
  onToggleSidebar, // function from Layout
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
    // 사용자 지정 테마는 더 이상 지원하지 않음
    try { localStorage.removeItem('nf-theme-custom') } catch {}
  }, [])


  const toggleThemeMode = () => {
    const next = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    document.body.classList.toggle('dark', next === 'dark')
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem('nf-theme-mode', next)
  }
  // Settings menu/overlay logic removed (undefined refs/functions were causing parse errors)

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
          n.title.toLowerCase().includes(query.toLowerCase())
        )
        setResults(filtered)
      })
      .catch(err => {
        console.error('노트 검색 실패:', err)
      })
  }, [query])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/', { replace: true })
  }

  const handleRefresh = () => {
    // 현재 URL 그대로 새로고침
    window.location.reload()
    // 혹은 SPA 내에서 강제 리로드가 아니라 "다시 네비게이트"를 원하시면:
    // navigate(location.pathname + location.search, { replace: true })
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="icon-btn" onClick={onToggleSidebar} title={sidebarState === 'pinned' ? '사이드바 숨기기' : '사이드바 열기'}>
          {/* Square with 1/3 divider and arrow indicating show/hide on right 2/3 */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <rect x="2" y="3" width="20" height="18" rx="2" fill="currentColor" opacity="0.06" />
            {/* divider at ~1/3 */}
            <rect x="8.5" y="4" width="1" height="16" fill="currentColor" opacity="0.18" />
            {/* arrow on right side: points left when pinned (to hide), points right when hidden (to show) */}
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
        {currentNote && (
          <>
            <button
              className="topbar-fav"
              onClick={onToggleFavorite}
              aria-label="즐겨찾기"
            >
            <IconStar size={18} strokeWidth={currentNote.is_favorite ? 2.2 : 1.8} />
            </button>

            <div className="icon-btn-star" onClick={onToggleFavorite} title="즐겨찾기">
              {currentNote.is_favorite ? <MdOutlineStarOutline /> : <MdOutlineStarPurple500 />}
            </div>
          </>
        )}
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


        {/* Settings menu removed to avoid undefined state/refs */}

      </div>
    </header>
  )
}
