import { FaFolderPlus, FaStickyNote } from 'react-icons/fa';
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import '../css/Sidebar.css'

export default function Sidebar({ onFilterChange, onSelectFolder, onNoteSelect }) {
  // 1) 로컬 상태
  const [flatFolders, setFlatFolders] = useState([])       // 서버에서 받아온 폴더 리스트 (평탄화된 배열)
  const [treeFolders, setTreeFolders] = useState([])       // 트리 구조로 변환된 폴더들
  const [openMap, setOpenMap] = useState({})               // 폴더 열림/닫힘 상태
  const [folderNoteMap, setFolderNoteMap] = useState({})   // 폴더별 노트 매핑
  const [folderContextMenu, setFolderContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    folderId: null
  })
  const [noteContextMenu, setNoteContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    noteId: null,
    folderId: null
  })
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'recent' | 'favorites'

  const navigate = useNavigate()
  const contextMenuRef = useRef(null)

  // ────────────────────────────────────────────────────────────────
  // 1) 폴더 목록 불러오기 (GET /api/v1/folders)
  //    - 백엔드가 트리 형태로 리턴하므로, 이를 평탄화한 뒤 flatFolders에 저장
  // ────────────────────────────────────────────────────────────────
  const loadFolders = useCallback(async () => {
    try {
      const API = import.meta.env.VITE_API_BASE_URL
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API}/api/v1/folders`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        console.error('[loadFolders] 실패 →', res.status, await res.text())
        return
      }
      const data = await res.json()
      // 트리 형태의 JSON을 재귀 탐색하여 평탄화
      const flattenList = []
      const traverse = (node) => {
        // node에는 id, user_id, name, parent_id, children, notes 속성이 존재함
        flattenList.push({
          id: node.id,
          user_id: node.user_id,
          name: node.name,
          parent_id: node.parent_id
        })
        if (node.children && node.children.length > 0) {
          node.children.forEach((child) => traverse(child))
        }
      }
      data.forEach((root) => traverse(root))
      setFlatFolders(flattenList)
    } catch (err) {
      console.error('[loadFolders] 예외 →', err)
    }
  }, [])

  // ────────────────────────────────────────────────────────────────
  // 2) 노트 목록 불러오기 (GET /api/v1/notes) → 폴더별 매핑
  // ────────────────────────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    try {
      const API = import.meta.env.VITE_API_BASE_URL
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API}/api/v1/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        console.error('[loadNotes] 실패 →', res.status, await res.text())
        return
      }
      const notes = await res.json()
      const map = {}
      notes.forEach((n) => {
        const key = n.folder_id ?? null
        if (!map[key]) map[key] = []
        map[key].push(n)
      })
      setFolderNoteMap(map)
    } catch (err) {
      console.error('[loadNotes] 예외 →', err)
    }
  }, [])

  // ────────────────────────────────────────────────────────────────
  // 3) 마운트 시 폴더 & 노트 동시에 로드
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadFolders()
    loadNotes()
  }, [loadFolders, loadNotes])

  // ────────────────────────────────────────────────────────────────
  // 4) flatFolders + folderNoteMap → 트리 구조(treeFolders)로 변환
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    // flatFolders를 키(id) 기준으로 임시 맵핑
    const tempMap = {}
    flatFolders.forEach((f) => {
      tempMap[f.id] = {
        ...f,
        children: [],
        notes: folderNoteMap[f.id] || []
      }
    })
    // 루트 노드 배열 생성
    const roots = []
    flatFolders.forEach((f) => {
      if (f.parent_id == null) {
        roots.push(tempMap[f.id])
      } else if (tempMap[f.parent_id]) {
        tempMap[f.parent_id].children.push(tempMap[f.id])
      }
    })
    setTreeFolders(roots)
  }, [flatFolders, folderNoteMap])

  // ────────────────────────────────────────────────────────────────
  // 5) 드래그 앤 드롭: 파일 / 노트 / 폴더 드롭 이벤트 처리
  // ────────────────────────────────────────────────────────────────
  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault()
    const API = import.meta.env.VITE_API_BASE_URL
    const token = localStorage.getItem('access_token')

    const dataType = e.dataTransfer.getData('type')
    const droppedNoteId = e.dataTransfer.getData('noteId')
    const droppedFolderId = e.dataTransfer.getData('folderId')

    // 5-1) 파일 드롭 → POST /api/v1/files/upload
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      for (let i = 0; i < droppedFiles.length; i++) {
        const file = droppedFiles[i]
        const formData = new FormData()
        formData.append('upload_file', file)
        formData.append('folder_id', targetFolderId)

        console.log(`[handleDrop] 파일 업로드 요청 → "${file.name}" → 폴더 ${targetFolderId}`)

        try {
          const res = await fetch(`${API}/api/v1/files/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          })
          if (!res.ok) {
            console.error(`[handleDrop] 파일 업로드 실패: "${file.name}"`, res.status, await res.text())
          } else {
            console.log(`[handleDrop] 파일 업로드 성공: "${file.name}"`)
          }
        } catch (err) {
          console.error(`[handleDrop] 파일 업로드 중 예외: "${file.name}"`, err)
        }
      }
      await loadNotes()
      onFilterChange('all')
      return
    }

    // 5-2) 노트 드롭 → PATCH /api/v1/notes/{noteId}
    if (dataType === 'note' && droppedNoteId) {
      console.log(`[handleDrop] 노트 이동 요청 → noteId=${droppedNoteId}, targetFolderId=${targetFolderId}`)

      try {
        const res = await fetch(`${API}/api/v1/notes/${droppedNoteId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ folder_id: targetFolderId })
        })
        if (!res.ok) {
          console.error('[handleDrop] 노트 이동 실패:', res.status, await res.text())
        } else {
          console.log('[handleDrop] 노트 이동 성공:', droppedNoteId, '→', targetFolderId)
        }
        await loadNotes()
        onFilterChange('all')
      } catch (err) {
        console.error('[handleDrop] 노트 이동 중 예외:', err)
      }
      return
    }

    // 5-3) 폴더 드롭 → PATCH /api/v1/folders/{folderId}
    if (dataType === 'folder' && droppedFolderId) {
      const dfId = parseInt(droppedFolderId, 10)
      const tfId = parseInt(targetFolderId, 10)
      console.log(`[handleDrop] 폴더 이동 요청 → folderId=${dfId}, targetFolderId=${tfId}`)

      if (dfId === tfId) {
        console.warn('[handleDrop] 자기 자신 위로 드롭 시도 → 무시')
        return
      }
      if (isDescendant(dfId, tfId)) {
        console.warn('[handleDrop] 자식 위로 드롭 시도 → 무시')
        return
      }

      try {
        const res = await fetch(`${API}/api/v1/folders/${dfId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ parent_id: tfId })
        })
        if (!res.ok) {
          console.error('[handleDrop] 폴더 이동 실패:', res.status, await res.text())
        } else {
          console.log('[handleDrop] 폴더 이동 성공:', dfId, '→', tfId)
        }
        // 폴더 트리 다시 로드
        await loadFolders()
      } catch (err) {
        console.error('[handleDrop] 폴더 이동 중 예외:', err)
      }
      return
    }
  }

  const isDescendant = (droppedId, targetId) => {
    const stack = [droppedId]
    const visited = new Set()
    const childMap = {}
    flatFolders.forEach((f) => {
      if (!childMap[f.parent_id]) childMap[f.parent_id] = []
      childMap[f.parent_id].push(f.id)
    })
    while (stack.length > 0) {
      const curr = stack.pop()
      if (visited.has(curr)) continue
      visited.add(curr)
      const children = childMap[curr] || []
      if (children.includes(targetId)) return true
      stack.push(...children)
    }
    return false
  }

  // ────────────────────────────────────────────────────────────────
  // 6) 폴더 / 노트 CRUD 핸들러
  // ────────────────────────────────────────────────────────────────
  // 6-1) 새 폴더 생성
  const handleNewFolder = async (parentId) => {
    const name = prompt('새 폴더 이름을 입력하세요')
    if (!name) return

    const API = import.meta.env.VITE_API_BASE_URL
    const token = localStorage.getItem('access_token')

    try {
      const res = await fetch(`${API}/api/v1/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: name, parent_id: parentId })
      })

      if (!res.ok) {
        console.error('[handleNewFolder] 폴더 생성 실패:', res.status, await res.text())
        alert('폴더 생성 실패. 콘솔을 확인하세요.')
        return
      }

      await loadFolders()
      setActiveFilter('all')
      onFilterChange('all')

      if (parentId !== null) {
        setOpenMap((prev) => ({ ...prev, [parentId]: true }))
      }
    } catch (err) {
      console.error('[handleNewFolder] 예외 발생:', err)
      alert('폴더 생성 중 예외 발생. 콘솔을 확인하세요.')
    }
  }

  // 6-2) 새 노트 생성
  const handleNewNote = async (folderId) => {
    const title = prompt('노트 제목을 입력하세요')
    if (!title) return

    const API = import.meta.env.VITE_API_BASE_URL
    const token = localStorage.getItem('access_token')

    try {
      const res = await fetch(`${API}/api/v1/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: title, content: '', folder_id: folderId })
      })

      if (!res.ok) {
        console.error('[handleNewNote] 노트 생성 실패:', res.status, await res.text())
        alert('노트 생성 실패. 콘솔을 확인하세요.')
        return
      }

      await loadNotes()
    } catch (err) {
      console.error('[handleNewNote] 예외 발생:', err)
      alert('노트 생성 중 예외 발생. 콘솔을 확인하세요.')
    }
  }

  // 6-3) 노트 이름 변경
  const handleRenameNote = async (noteId, folderId) => {
    const newTitle = prompt('새 노트 이름을 입력하세요')
    if (!newTitle) return

    const API = import.meta.env.VITE_API_BASE_URL
    const token = localStorage.getItem('access_token')

    try {
      const res = await fetch(`${API}/api/v1/notes/${noteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle, folder_id: folderId })
      })

      if (!res.ok) {
        console.error('[handleRenameNote] 노트 이름 변경 실패:', res.status, await res.text())
        return
      }

      await loadNotes()
    } catch (err) {
      console.error('[handleRenameNote] 예외 발생:', err)
    }
  }

  // 6-4) 폴더 이름 변경
  const handleRenameFolder = async (folderId) => {
    const name = prompt('새 폴더 이름을 입력하세요')
    if (!name) return

    const API = import.meta.env.VITE_API_BASE_URL
    const token = localStorage.getItem('access_token')

    try {
      const res = await fetch(`${API}/api/v1/folders/${folderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: name })
      })

      if (!res.ok) {
        console.error('[handleRenameFolder] 폴더 이름 변경 실패:', res.status, await res.text())
        return
      }

      await loadFolders()
    } catch (err) {
      console.error('[handleRenameFolder] 예외 발생:', err)
    }
  }

  // 6-5) 노트 삭제
  const handleDeleteNote = async (noteId) => {
    if (!confirm('이 노트를 삭제하시겠습니까?')) return

    const API = import.meta.env.VITE_API_BASE_URL
    const token = localStorage.getItem('access_token')

    try {
      const res = await fetch(`${API}/api/v1/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        console.error('[handleDeleteNote] 노트 삭제 실패:', res.status, await res.text())
        return
      }

      await loadNotes()
    } catch (err) {
      console.error('[handleDeleteNote] 예외 발생:', err)
    }
  }

  // 6-6) 폴더 삭제
  const handleDeleteFolder = async (folderId) => {
    if (!confirm('정말 폴더를 삭제하시겠습니까?')) return

    const API = import.meta.env.VITE_API_BASE_URL
    const token = localStorage.getItem('access_token')

    try {
      const res = await fetch(`${API}/api/v1/folders/${folderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        console.error('[handleDeleteFolder] 폴더 삭제 실패:', res.status, await res.text())
        return
      }

      await loadFolders()
    } catch (err) {
      console.error('[handleDeleteFolder] 예외 발생:', err)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 7) 컨텍스트 메뉴 외부 클릭 시 닫기
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setFolderContextMenu({ visible: false, x: 0, y: 0, folderId: null })
        setNoteContextMenu({ visible: false, x: 0, y: 0, noteId: null, folderId: null })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ─────────────────────────────────────────────────────────────────
  // 8) 트리 렌더링: renderTree
  // ─────────────────────────────────────────────────────────────────
  const renderTree = (list) =>
    list.map((node) => (
      <li key={node.id}>
        <div
          className="folder-label"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('folderId', node.id)
            e.dataTransfer.setData('type', 'folder')
          }}
          onClick={() => {
            setOpenMap((prev) => ({ ...prev, [node.id]: !prev[node.id] }))
            if (onSelectFolder) onSelectFolder(node.id)
            navigate(`/main/${node.id}`)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            setNoteContextMenu({ visible: false, x: 0, y: 0, noteId: null, folderId: null })
            setFolderContextMenu({ visible: true, x: e.clientX, y: e.clientY, folderId: node.id })
          }}
          onDrop={(e) => handleDrop(e, node.id)}
          onDragOver={(e) => e.preventDefault()}
        >
          <span>📁 {node.name}</span>
        </div>

        {openMap[node.id] && node.children.length > 0 && (
          <ul className="folder-children">
            {renderTree(node.children)}
          </ul>
        )}

        {openMap[node.id] && node.notes.length > 0 && (
          <ul className={`note-list ${node.parent_id ? 'nested' : 'root'}`}>
            {node.notes.map((n) => (
              <li
                key={n.id}
                className="note-label"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('noteId', n.id)
                  e.dataTransfer.setData('type', 'note')
                }}
                onClick={() => {
                  navigate(`/notes/${n.id}`)
                  if (onNoteSelect) onNoteSelect(n.id)
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setFolderContextMenu({ visible: false, x: 0, y: 0, folderId: null })
                  setNoteContextMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    noteId: n.id,
                    folderId: node.id
                  })
                }}
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
      {/* – 로고 영역 – */}
      <div
        className="sidebar-logo"
        style={{ cursor: 'pointer' }}
        onClick={() => {
          if (onSelectFolder) onSelectFolder(null)
          navigate('/main')
        }}
      >
        <img src="/logo.png" alt="NoteFlow Logo" className="logo-icon" />
        <span className="logo-text">NoteFlow</span>
      </div>

      {/* 새 폴더 & 새 노트 버튼 */}
      <div className="sidebar-buttons">
        <button onClick={() => handleNewFolder(null)} className="sidebar-btn">
          <FaFolderPlus style={{ marginRight: '0.5rem' }} />
        </button>
        <button onClick={() => handleNewNote(null)} className="sidebar-btn">
          <FaStickyNote style={{ marginRight: '0.5rem' }} />
        </button>
      </div>

      <div className="sidebar-controls">
        {/* 최근 노트 버튼 */}
        <button
          className={activeFilter === 'recent' ? 'active' : ''}
          onClick={() => {
            setActiveFilter('recent')
            onFilterChange('recent')
            if (onSelectFolder) onSelectFolder(null)
            navigate('/main')
          }}
        >
          최근 노트
        </button>

        {/* 내 폴더 섹션 */}
        <div className="folder-section">
          <button
            className={activeFilter === 'all' ? 'active' : ''}
            onClick={() => {
              setActiveFilter('all')
              onFilterChange('all')
              if (onSelectFolder) onSelectFolder(null)
              navigate('/main')
            }}
          >
            내 폴더
          </button>

          {activeFilter === 'all' && (
            <ul className="folder-list">
              {/* 1) 최상위 폴더 트리 */}
              {treeFolders.length === 0 ? (
                <li style={{ color: '#777', padding: '0.5rem 1rem' }}>
                  폴더가 없습니다.
                </li>
              ) : (
                renderTree(treeFolders)
              )}

              {/* 2) 폴더 없이 생성된 루트 노트 */}
              {folderNoteMap[null]?.map((note) => (
                <li
                  key={note.id}
                  className="note-label root"
                  onClick={() => {
                    navigate(`/notes/${note.id}`)
                    if (onNoteSelect) onNoteSelect(note.id)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setFolderContextMenu({ visible: false, x: 0, y: 0, folderId: null })
                    setNoteContextMenu({
                      visible: true,
                      x: e.clientX,
                      y: e.clientY,
                      noteId: note.id,
                      folderId: null
                    })
                  }}
                >
                  📝 {note.title}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 즐겨찾기 버튼 */}
        <button
          className={activeFilter === 'favorites' ? 'active' : ''}
          onClick={() => {
            setActiveFilter('favorites')
            onFilterChange('favorites')
            if (onSelectFolder) onSelectFolder(null)
            navigate('/main')
          }}
        >
          즐겨찾기
        </button>
      </div>

      {/* 폴더 컨텍스트 메뉴 */}
      {folderContextMenu.visible && (
        <div
          className="context-menu"
          style={{
            top: folderContextMenu.y,
            left: folderContextMenu.x,
            position: 'fixed',
            zIndex: 1000
          }}
          ref={contextMenuRef}
        >
          <div
            onClick={() => {
              handleNewNote(folderContextMenu.folderId)
              setFolderContextMenu({ visible: false, x: 0, y: 0, folderId: null })
            }}
          >
            ➕ 새 노트
          </div>
          <div
            onClick={() => {
              handleNewFolder(folderContextMenu.folderId)
              setFolderContextMenu({
                visible: false,
                x: 0,
                y: 0,
                folderId: null
              })
            }}
          >
            ➕ 새 폴더
          </div>
          <div
            onClick={() => {
              handleRenameFolder(folderContextMenu.folderId)
              setFolderContextMenu({
                visible: false,
                x: 0,
                y: 0,
                folderId: null
              })
            }}
          >
            ✏️ 이름 변경
          </div>
          <div
            onClick={() => {
              handleDeleteFolder(folderContextMenu.folderId)
              setFolderContextMenu({
                visible: false,
                x: 0,
                y: 0,
                folderId: null
              })
            }}
          >
            🗑️ 폴더 삭제
          </div>
        </div>
      )}

      {/* 노트 컨텍스트 메뉴 */}
      {noteContextMenu.visible && (
        <div
          className="context-menu"
          style={{
            top: noteContextMenu.y,
            left: noteContextMenu.x,
            position: 'fixed',
            zIndex: 1000
          }}
          ref={contextMenuRef}
        >
          <div
            onClick={() => {
              handleRenameNote(noteContextMenu.noteId, noteContextMenu.folderId)
              setNoteContextMenu({
                visible: false,
                x: 0,
                y: 0,
                noteId: null,
                folderId: null
              })
            }}
          >
            ✏️ 이름 변경
          </div>
          <div
            onClick={() => {
              handleDeleteNote(noteContextMenu.noteId)
              setNoteContextMenu({
                visible: false,
                x: 0,
                y: 0,
                noteId: null,
                folderId: null
              })
            }}
          >
            🗑️ 노트 삭제
          </div>
        </div>
      )}
    </aside>
  )
}
