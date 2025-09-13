// src/components/Topbar.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdOutlineStarOutline, MdOutlineStarPurple500 } from "react-icons/md";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import { TbReload } from "react-icons/tb";
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
  const [theme, setTheme] = useState({ mode: 'light', primary: '', bg: '', surface: '', text: '' })

  const clearCustomTheme = () => {
    const root = document.documentElement
    ;['--nf-primary','--nf-bg','--nf-surface','--nf-surface-2','--nf-text']
      .forEach(v => root.style.removeProperty(v))
    localStorage.removeItem('nf-theme-custom')
  }

  const syncPickersWithComputed = () => {
    const cs = getComputedStyle(document.documentElement)
    setTheme(t => ({
      ...t,
      primary: cs.getPropertyValue('--nf-primary').trim() || t.primary,
      bg: cs.getPropertyValue('--nf-bg').trim() || t.bg,
      surface: cs.getPropertyValue('--nf-surface').trim() || t.surface,
      text: cs.getPropertyValue('--nf-text').trim() || t.text,
    }))
  }

  useEffect(() => {
    const savedMode = localStorage.getItem('nf-theme-mode') || 'light'
    document.body.classList.toggle('dark', savedMode === 'dark')
    document.documentElement.classList.toggle('dark', savedMode === 'dark')
    setTheme(t => ({ ...t, mode: savedMode }))
    const saved = localStorage.getItem('nf-theme-custom')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setTheme(t => ({ ...t, ...parsed }))
        const root = document.documentElement
        if (parsed.primary) root.style.setProperty('--nf-primary', parsed.primary)
        if (parsed.bg) root.style.setProperty('--nf-bg', parsed.bg)
        if (parsed.surface) {
          root.style.setProperty('--nf-surface', parsed.surface)
          root.style.setProperty('--nf-surface-2', parsed.surface)
        }
        if (parsed.text) root.style.setProperty('--nf-text', parsed.text)
      } catch {}
    } else {
      // ensure pickers reflect current defaults
      syncPickersWithComputed()
    }
  }, [])

  useEffect(() => {
    const onClickOutside = e => {
      const btn = btnRef.current
      const menu = menuRef.current
      const target = e.target
      const clickedInsideBtn = btn && btn.contains(target)
      const clickedInsideMenu = menu && menu.contains(target)
      if (!clickedInsideBtn && !clickedInsideMenu) {
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

  const handleRefresh = () => {
    // 현재 URL 그대로 새로고침
    window.location.reload()
    // 혹은 SPA 내에서 강제 리로드가 아니라 "다시 네비게이트"를 원하시면:
    // navigate(location.pathname + location.search, { replace: true })
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
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
                  {note.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="topbar-actions">
        {currentNote && (
          <div className="icon-btn-star" onClick={onToggleFavorite} title="즐겨찾기">
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
            <div className="settings-item" style={{ fontWeight: 600 }}>테마 설정</div>
            <div className="settings-item" style={{ display: 'grid', gap: 6 }}>
              <label>모드
                <select className="nf-select" value={theme.mode} onChange={(e) => {
                  const mode = e.target.value
                  setTheme(t => ({ ...t, mode }))
                  document.body.classList.toggle('dark', mode === 'dark')
                  document.documentElement.classList.toggle('dark', mode === 'dark')
                  localStorage.setItem('nf-theme-mode', mode)
                  // reset to fixed presets for the selected mode
                  clearCustomTheme()
                  // update pickers to current computed defaults
                  syncPickersWithComputed()
                }}>
                  <option value="light">라이트</option>
                  <option value="dark">다크</option>
                </select>
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
              <label>Primary <input className="nf-input" type="color" value={theme.primary || '#00923F'} onChange={(e) => setTheme(t => ({ ...t, primary: e.target.value }))} /></label>
              <label>배경(bg) <input className="nf-input" type="color" value={theme.bg || '#f3f7f4'} onChange={(e) => setTheme(t => ({ ...t, bg: e.target.value }))} /></label>
              <label>표면(surface) <input className="nf-input" type="color" value={theme.surface || '#ffffff'} onChange={(e) => setTheme(t => ({ ...t, surface: e.target.value }))} /></label>
              <label>텍스트 <input className="nf-input" type="color" value={theme.text || '#0b1720'} onChange={(e) => setTheme(t => ({ ...t, text: e.target.value }))} /></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="nf-btn nf-btn--primary" onClick={() => {
                  const root = document.documentElement
                  if (theme.primary) root.style.setProperty('--nf-primary', theme.primary)
                  if (theme.bg) root.style.setProperty('--nf-bg', theme.bg)
                  if (theme.surface) {
                    root.style.setProperty('--nf-surface', theme.surface)
                    root.style.setProperty('--nf-surface-2', theme.surface)
                  }
                  if (theme.text) root.style.setProperty('--nf-text', theme.text)
                  localStorage.setItem('nf-theme-custom', JSON.stringify(theme))
                }}>적용</button>
                <button className="nf-btn" onClick={async () => {
                  if ('EyeDropper' in window) {
                    // @ts-ignore
                    const ed = new window.EyeDropper()
                    try {
                      const result = await ed.open()
                      setTheme(t => ({ ...t, primary: result.sRGBHex }))
                    } catch {}
                  } else {
                    alert('이 브라우저는 스포이더를 지원하지 않습니다.')
                  }
                }}>스포이드(Primary)</button>
                <button className="nf-btn" onClick={() => {
                  clearCustomTheme();
                  localStorage.removeItem('nf-theme-mode');
                  document.body.classList.remove('dark');
                  document.documentElement.classList.remove('dark');
                  setTheme({ mode: 'light', primary: '', bg: '', surface: '', text: '' })
                  syncPickersWithComputed()
                }}>초기화</button>
              </div>
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
