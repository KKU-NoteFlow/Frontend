// src/components/Layout.jsx
import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './Topbar'

export default function Layout() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const handleNewNote = () => navigate('/notes/new')

  // onFilterChange 로 MainPage가 알아서 검색이나 필터 처리하게 넘김
  return (
    <div className="app-layout" style={{ display: 'flex', height: '100vh' }}>
      <Sidebar onFilterChange={(f) => {/* 전달 */}} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopBar 
          onNewNote={handleNewNote}
          searchValue={search}
          onSearchChange={setSearch}
          onFavoritesClick={() => onFilterChange('favorites')}
          onSettingsClick={() => navigate('/settings')}
        />
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
