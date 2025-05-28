import React, { useState, useRef, useEffect } from 'react'
import '../css/Topbar.css'    // 나중에 스타일 분리

export default function TopBar({ 
  onNewNote,
  searchValue,
  onSearchChange,
  onFavoritesClick
}) {
  const [showSettings, setShowSettings] = useState(false)
  const btnRef = useRef(null)

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const onClickOutside = e => {
      if (btnRef.current && !btnRef.current.contains(e.target)) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-new" onClick={onNewNote}>+ 새 노트</button>
        <input
          className="topbar-search"
          type="text"
          placeholder="🔍 노트 검색"
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      <div className="topbar-actions">
        <button className="topbar-fav" onClick={onFavoritesClick} aria-label="즐겨찾기">
          ★
        </button>
        <button
          ref={btnRef}
          className="topbar-settings"
          onClick={() => setShowSettings(prev => !prev)}
          aria-label="설정"
        >
          ⋯
        </button>

        {showSettings && (
          <div className="settings-menu">
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
            {/* 원하는 항목을 여기 추가 */}
          </div>
        )}
      </div>
    </header>
  )
}
