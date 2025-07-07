// src/components/Topbar.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdOutlineStarOutline, MdOutlineStarPurple500 } from "react-icons/md";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import '../css/Topbar.css'

export default function TopBar({
  onNewNote,
  currentNote,
  onToggleFavorite
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onClickOutside = e => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

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

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/', { replace: true })
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="icon-btn" onClick={() => navigate(-1)} title="뒤로가기">
          <BsChevronLeft />
        </div>
        <div className="icon-btn" onClick={() => navigate(1)} title="앞으로가기">
          <BsChevronRight />
        </div>
        <button className="topbar-new" onClick={onNewNote}>+ 새 노트</button>
        <div className="search-container">
          <input
            className="topbar-search"
            type="text"
            placeholder="🔍 노트 제목 검색"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
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
                  📝 {note.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="topbar-actions">
        {currentNote && (
          <div className="icon-btn" onClick={onToggleFavorite} title="즐겨찾기">
            {currentNote.is_favorite ? <MdOutlineStarOutline /> : <MdOutlineStarPurple500 />}
          </div>
        )}
        <button
          ref={btnRef}
          className="topbar-settings"
          onClick={() => setShowSettings(prev => !prev)}
          aria-label="설정"
        >
          ⋯
        </button>

        {showSettings && (
          <div className="settings-menu" ref={menuRef}>
            <input
              className="settings-search"
              type="text"
              placeholder="작업 검색..."
            />
            <div className="settings-item">링크 복사</div>
            <div className="settings-item disabled">옮기기</div>
            <div className="settings-item toggle">
              작은 텍스트
              <label className="switch">
                <input type="checkbox" />
                <span className="slider" />
              </label>
            </div>
            <div className="settings-item" onClick={handleLogout}>
              로그아웃
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
