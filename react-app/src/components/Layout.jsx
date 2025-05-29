import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './Topbar'
import BottomBar from './Bottombar'
import '../css/Layout.css'

export default function Layout() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')               // ⭐ 필터 상태
  const [currentNote, setCurrentNote] = useState(null)      // ⭐ 현재 노트 상태
  const [statusText, setStatusText] = useState('') // 녹음 상태 등

  const handleRecord = () => setStatusText('녹음이 진행중입니다')
  const handleSummarize = () => setStatusText('요약을 수행 중입니다')
  const handleUpload = () => setStatusText('업로드 중입니다')

  // 즐겨찾기 토글 핸들러
  const toggleFavorite = async () => {
    if (!currentNote) return
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/notes/${currentNote.id}/favorite`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ is_favorite: !currentNote.is_favorite })
    })

    if (res.ok) {
      const updated = await res.json()
      setCurrentNote(updated)
    } else {
      alert('즐겨찾기 변경 실패')
    }
  }

  const handleNewNote = () => navigate('/notes/new')

  return (
    <div className="layout-container">
      <Sidebar onFilterChange={setFilter} />
      <div className="layout-body">
        <TopBar
          onNewNote={handleNewNote}
          searchValue={search}
          onSearchChange={setSearch}
          onFavoritesClick={() => setFilter('favorites')}
          onSettingsClick={() => navigate('/settings')}
          currentNote={currentNote}
          onToggleFavorite={toggleFavorite}
        />
        
        <div className="layout-main">
          <Outlet context={{ setCurrentNote, toggleFavorite, filter }} />
        </div>

        <BottomBar
          statusText={statusText}
          onRecordClick={handleRecord}
          onSummarizeClick={handleSummarize}
          onUploadClick={handleUpload}
        />
      </div>
    </div>
  )
}