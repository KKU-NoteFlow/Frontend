// Sidebar.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import '../css/Sidebar.css'

export default function Sidebar({ onFilterChange, onNoteSelect }) {
  const [flatFolders, setFlatFolders] = useState([])
  const [treeFolders, setTreeFolders] = useState([])
  const [openMap, setOpenMap] = useState({})
  const [folderNoteMap, setFolderNoteMap] = useState({})
  const [folderContextMenu, setFolderContextMenu] = useState({ visible: false, x: 0, y: 0, folderId: null })
  const [noteContextMenu, setNoteContextMenu] = useState({ visible: false, x: 0, y: 0, noteId: null, folderId: null })
  const [activeFilter, setActiveFilter] = useState('all')

  const navigate = useNavigate();
  const contextMenuRef = useRef(null)

  const loadFolders = useCallback(async () => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/folders`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
    if (!res.ok) return
    setFlatFolders(await res.json())
  }, [])

  const loadNotes = useCallback(async () => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/notes`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
    if (!res.ok) return
    const notes = await res.json()
    const map = {}
    notes.forEach(n => {
      const key = n.folder_id ?? null
      if (!map[key]) map[key] = []
      map[key].push(n)
    })
    setFolderNoteMap(map)
  }, [])

  useEffect(() => {
    loadFolders()
    loadNotes()
  }, [loadFolders, loadNotes])

  useEffect(() => {
    const map = {}
    flatFolders.forEach(f => {
      map[f.id] = {
        ...f,
        children: f.children || [],
        notes: folderNoteMap[f.id] || []
      }
    })
    const roots = []
    flatFolders.forEach(f => {
      if (f.parent_id == null) roots.push(map[f.id])
      else if (map[f.parent_id]) map[f.parent_id].children.push(map[f.id])
    })
    setTreeFolders(roots)
  }, [flatFolders, folderNoteMap])

  const toggle = id => setOpenMap(prev => ({ ...prev, [id]: !prev[id] }))

  const handleDrop = async (e, folderId) => {
    const noteId = e.dataTransfer.getData('noteId')
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/notes/${noteId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ folder_id: folderId })
    })
    loadNotes()
    onFilterChange('all')
    e.preventDefault()
  }

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

  const handleNewNote = async folderId => {
    const title = prompt('노트 제목을 입력하세요')
    if (!title) return
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ title, content: '', folder_id: folderId })
    })
    loadNotes()
  }

  const handleRenameNote = async (noteId, folderId) => {
    const newTitle = prompt('새 노트 이름을 입력하세요')
    if (!newTitle) return
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/notes/${noteId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ title: newTitle, folder_id: folderId })
    })
    loadNotes()
  }

  const handleRenameFolder = async folderId => {
    const name = prompt('새 이름을 입력하세요')
    if (!name) return
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/folders/${folderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ name })
    })
    loadFolders()
  }

  const handleDeleteNote = async noteId => {
    if (!confirm('이 노트를 삭제하시겠습니까?')) return
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/notes/${noteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
    loadNotes()
  }

  const handleDeleteFolder = async folderId => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/folders/${folderId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
    loadFolders()
  }

  useEffect(() => {
    const handleClickOutside = e => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setFolderContextMenu({ visible: false, x: 0, y: 0, folderId: null })
        setNoteContextMenu({ visible: false, x: 0, y: 0, noteId: null, folderId: null })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const renderTree = list => list.map(node => (
    <li key={node.id}>
      <div
        className="folder-label"
        onClick={() => toggle(node.id)}
        onContextMenu={e => {
          e.preventDefault()
          setNoteContextMenu({ visible: false, x: 0, y: 0, noteId: null, folderId: null })
          setFolderContextMenu({ visible: true, x: e.clientX, y: e.clientY, folderId: node.id })
        }}
        onDrop={e => handleDrop(e, node.id)}
        onDragOver={e => e.preventDefault()}
      >
        <span> {node.name}</span>
      </div>

      {openMap[node.id] && node.children.length > 0 && (
        <ul className="folder-children">{renderTree(node.children)}</ul>
      )}

      {openMap[node.id] && node.notes.length > 0 && (
        <ul className={`note-list ${node.parent_id ? 'nested' : 'root'}`}>
          {node.notes.map(n => (
            <li
              key={n.id}
              className="note-label"
              onClick={() => navigate(`/notes/${n.id}`)}
              onContextMenu={e => {
                e.preventDefault()
                setFolderContextMenu({ visible: false, x: 0, y: 0, folderId: null })
                setNoteContextMenu({ visible: true, x: e.clientX, y: e.clientY, noteId: n.id, folderId: node.id })
              }}
              draggable
              onDragStart={e => e.dataTransfer.setData('noteId', n.id)}
            >
              📝 {n.title}
            </li>
          ))}
        </ul>
      )}
    </li>
  ))

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo.png" alt="NoteFlow Logo" className="logo-icon" />
        <span className="logo-text">NoteFlow</span>
      </div>

      <div className="sidebar-controls">
        <button
          className={activeFilter === 'recent' ? 'active' : ''}
          onClick={() => {
            setActiveFilter('recent')
            onFilterChange('recent')
            navigate('/main')
          }}
        >최근 노트</button>

        <div className="folder-section">
          <button
            className={activeFilter === 'all' ? 'active' : ''}
            onClick={() => { setActiveFilter('all'); onFilterChange('all') }}
          >내 폴더</button>
          {activeFilter === 'all' && (
            <ul className="folder-list">{renderTree(treeFolders)}</ul>
          )}
        </div>

        <button
          className={activeFilter === 'favorites' ? 'active' : ''}
          onClick={() => { 
            setActiveFilter('favorites'); 
            onFilterChange('favorites');
            navigate('/main'); 
          }}
        >즐겨찾기</button>
      </div>

      {folderContextMenu.visible && (
        <div className="context-menu" style={{ top: folderContextMenu.y, left: folderContextMenu.x, position: 'fixed', zIndex: 1000 }} ref={contextMenuRef}>
          <div onClick={() => handleNewNote(folderContextMenu.folderId)}>➕ 새 노트</div>
          <div onClick={() => handleNewFolder(folderContextMenu.folderId)}>➕ 새 폴더</div>
          <div onClick={() => handleRenameFolder(folderContextMenu.folderId)}>✏️ 이름 변경</div>
          <div onClick={() => handleDeleteFolder(folderContextMenu.folderId)}>🗑️ 폴더 삭제</div>
        </div>
      )}

      {noteContextMenu.visible && (
        <div className="context-menu" style={{ top: noteContextMenu.y, left: noteContextMenu.x, position: 'fixed', zIndex: 1000 }} ref={contextMenuRef}>
          <div onClick={() => handleRenameNote(noteContextMenu.noteId, noteContextMenu.folderId)}>✏️ 이름 변경</div>
          <div onClick={() => handleDeleteNote(noteContextMenu.noteId)}>🗑️ 노트 삭제</div>
        </div>
      )}
    </aside>
  )
}
