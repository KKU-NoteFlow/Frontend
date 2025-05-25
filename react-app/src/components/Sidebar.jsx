// src/components/Sidebar.jsx
import React, { useState, useEffect, useCallback } from 'react'
import '../css/Sidebar.css'

export default function Sidebar({ onFilterChange }) {
  const [flatFolders, setFlatFolders] = useState([])
  const [treeFolders, setTreeFolders] = useState([])
  const [openMap, setOpenMap] = useState({})

  // 1) 폴더 불러오기
  const loadFolders = useCallback(async () => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/folders`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
    if (!res.ok) return
    const data = await res.json()
    setFlatFolders(data)
  }, [])

  // 2) flat → 트리 구조 변환
  useEffect(() => {
    const map = {}
    flatFolders.forEach(f => { map[f.id] = { ...f, children: [] } })
    const roots = []
    flatFolders.forEach(f => {
      if (f.parent_id == null) {
        roots.push(map[f.id])
      } else if (map[f.parent_id]) {
        map[f.parent_id].children.push(map[f.id])
      }
    })
    setTreeFolders(roots)
  }, [flatFolders])

  // 3) 처음 마운트 시 로드
  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  // 4) 폴더 접기/펼치기 토글
  const toggle = id =>
    setOpenMap(prev => ({ ...prev, [id]: !prev[id] }))

  // 5) 노트 드롭 핸들러
  const handleDrop = async (e, folderId) => {
    const noteId = e.dataTransfer.getData('noteId')
    await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/v1/notes/${noteId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ folder_id: folderId })
      }
    )
    onFilterChange('all')    // 노트 목록 갱신
    e.preventDefault()
  }

  // 6) 새 폴더 생성
  const handleNewFolder = async parentId => {
    const name = prompt('새 폴더 이름을 입력하세요')
    if (!name) return
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ name, parent_id: parentId })
    })
    loadFolders()
  }

  // 7) 재귀 렌더링
  const renderTree = list =>
    list.map(node => (
      <li key={node.id}>
        <div
          className="folder-label"
          onClick={() => toggle(node.id)}
          onDrop={e => handleDrop(e, node.id)}
          onDragOver={e => e.preventDefault()}
        >
          <span>
            {openMap[node.id] ? '▼' : '▶'} {node.name}
          </span>
          <button
            className="btn-new-child"
            onClick={e => {
              e.stopPropagation()
              handleNewFolder(node.id)
            }}
          >＋</button>
        </div>
        {openMap[node.id] && node.children.length > 0 && (
          <ul className="folder-children">
            {renderTree(node.children)}
          </ul>
        )}
      </li>
    ))

  return (
    <aside className="sidebar">
      <div className="sidebar-controls">
        <button onClick={() => onFilterChange('recent')}>
          최근 노트
        </button>
        <button onClick={() => onFilterChange('all')}>
          내 폴더
        </button>
        <button onClick={() => onFilterChange('favorites')}>
          즐겨찾기
        </button>
        <button
          className="btn-new-root"
          onClick={() => handleNewFolder(null)}
        >
          + 새 폴더
        </button>
      </div>
      <ul className="folder-list">
        {renderTree(treeFolders)}
      </ul>
    </aside>
  )
}
