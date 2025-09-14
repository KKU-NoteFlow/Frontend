// src/components/Topbar.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import '../css/Topbar.css'
import { IconStar, IconSearch } from '../ui/icons'

export default function TopBar({
  onNewNote,
  currentNote,
  onToggleFavorite
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

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/notes`, {
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

  return (
    <header className="topbar">
      <div className="topbar-left">
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
          <button
            className="topbar-fav"
            onClick={onToggleFavorite}
            aria-label="즐겨찾기"
          >
            <IconStar size={18} stroke={currentNote.is_favorite ? 2.2 : 1.8} />
          </button>
        )}
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
