// src/screen/Main.jsx

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import '../css/Main.css'

export default function MainPage() {
  const navigate = useNavigate()

  // URL 파라미터 :folderId
  const { folderId } = useParams()
  const parsedFolderId = folderId ? parseInt(folderId, 10) : null

  // Layout에서 내려준 context
  const {
    filter,               // 'all' | 'recent' | 'favorites'
    fileUploadTimestamp,  // 업로드 시마다 갱신되는 timestamp
  } = useOutletContext()

  // 상태: 노트 목록, 파일 목록, 그리고 폴더명
  const [notes, setNotes]     = useState([])
  const [files, setFiles]     = useState([])
  const [folderName, setFolderName] = useState('')

  // 드래그 오버 상태 (true면 배경색 강조)
  const [isDragOver, setIsDragOver] = useState(false)

  const token = localStorage.getItem('access_token')
  const API = import.meta.env.VITE_API_BASE_URL

  // ────────────────────────────────────────────────────────────────
  // 1) 폴더명 가져오기 (parsedFolderId 변경 시)
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!parsedFolderId) {
      setFolderName('')
      return
    }
    fetch(`${API}/api/v1/folders`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('폴더 목록 불러오기 실패')
        return res.json()
      })
      .then((data) => {
        const found = data.find((f) => f.id === parsedFolderId)
        setFolderName(found ? found.name : '')
      })
      .catch((err) => {
        console.error('폴더명 가져오기 실패:', err)
        setFolderName('')
      })
  }, [parsedFolderId, API, token])

  // ────────────────────────────────────────────────────────────────
  // 2) 노트 목록 가져오기 (filter, parsedFolderId 변경 시)
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!parsedFolderId) {
      let url = filter === 'recent' ? '/api/v1/notes/recent' : '/api/v1/notes'
      fetch(`${API}${url}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error('노트 불러오기 실패')
          return res.json()
        })
        .then((data) => {
          if (filter === 'favorites') {
            setNotes(data.filter((n) => n.is_favorite))
          } else {
            setNotes(data)
          }
        })
        .catch((err) => {
          console.error('노트 불러오기 실패:', err)
          setNotes([])
        })
      setFiles([])
    } else {
      fetch(`${API}/api/v1/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error('노트 불러오기 실패')
          return res.json()
        })
        .then((data) => {
          const filteredNotes = data.filter((n) => n.folder_id === parsedFolderId)
          setNotes(filteredNotes)
        })
        .catch((err) => {
          console.error('폴더 내 노트 불러오기 실패:', err)
          setNotes([])
        })
    }
  }, [filter, parsedFolderId, API, token])

  // ────────────────────────────────────────────────────────────────
  // 3) 파일 목록 가져오기 (parsedFolderId, fileUploadTimestamp 변경 시)
  // ────────────────────────────────────────────────────────────────
  const fetchFiles = useCallback(() => {
    if (parsedFolderId !== null) {
      fetch(`${API}/api/v1/files/list/${parsedFolderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error('파일 목록 불러오기 실패')
          return res.json()
        })
        .then((data) => {
          setFiles(data)
        })
        .catch((err) => {
          console.error('폴더 내 파일 목록 불러오기 실패:', err)
          setFiles([])
        })
    } else {
      setFiles([])
    }
  }, [parsedFolderId, API, token])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles, fileUploadTimestamp])

  // ────────────────────────────────────────────────────────────────
  // 4) 드래그 앤 드롭: 파일 드롭 이벤트 처리 + 시각 피드백
  // ────────────────────────────────────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleFileDrop = async (e) => {
    e.preventDefault()
    setIsDragOver(false)

    if (parsedFolderId === null) {
      alert('먼저 업로드할 폴더를 선택하세요.')
      return
    }

    const droppedFiles = e.dataTransfer.files
    if (!droppedFiles || droppedFiles.length === 0) return

    for (let i = 0; i < droppedFiles.length; i++) {
      const file = droppedFiles[i]
      const formData = new FormData()
      formData.append('upload_file', file)
      formData.append('folder_id', parsedFolderId)

      console.log(`[handleFileDrop] 파일 업로드 요청 → "${file.name}" → 폴더 ${parsedFolderId}`)

      try {
        const res = await fetch(`${API}/api/v1/files/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        })
        if (!res.ok) {
          console.error(`[handleFileDrop] 업로드 실패: "${file.name}"`, res.status, await res.text())
        } else {
          console.log(`[handleFileDrop] 업로드 성공: "${file.name}"`)
        }
      } catch (err) {
        console.error(`[handleFileDrop] 예외 발생: "${file.name}"`, err)
      }
    }

    // 업로드 완료 후 즉시 목록 갱신
    fetchFiles()
  }

  // ────────────────────────────────────────────────────────────────
  // 5) 화면 렌더링: 폴더 선택 여부에 따라 노트 & 파일 분리 표시
  // ────────────────────────────────────────────────────────────────
  return (
    <main className="main-content" style={{ padding: '1rem' }}>
      {/* ──────────────────────────────────────────────────────────────── */}
      {/* 5-1) parsedFolderId가 null → 전체/최근/즐겨찾기 노트만 표시 */}
      {/* ──────────────────────────────────────────────────────────────── */}
      {parsedFolderId === null && (
        <section className="main-note-list">
          {notes.map((note) => (
            <div
              key={note.id}
              className="main-note-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('noteId', note.id)
                e.dataTransfer.setData('type', 'note')
              }}
              onClick={() => navigate(`/notes/${note.id}`)}
            >
              <h3 className="main-note-title">{note.title}</h3>
              <p className="main-note-preview">
                {note.content?.slice(0, 100) || ''}
              </p>
              <span className="main-note-date">
                {new Date(note.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </section>
      )}

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* 5-2) parsedFolderId가 숫자 → 해당 폴더 ID 내 노트 & 파일 표시 */}
      {/* ──────────────────────────────────────────────────────────────── */}
      {parsedFolderId !== null && (
        <>
          {/* 5-2-1) 헤더: “📂 {폴더명}” */}
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>
            📂 {folderName || `폴더 #${parsedFolderId}`}
          </h2>

          {/* 5-2-2) 폴더 내 노트 섹션 */}
          <section className="main-note-list">
            {notes.length === 0 ? (
              <p style={{ color: '#777' }}>이 폴더에는 노트가 없습니다.</p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="main-note-item"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('noteId', note.id)
                    e.dataTransfer.setData('type', 'note')
                  }}
                  onClick={() => navigate(`/notes/${note.id}`)}
                >
                  <h3 className="main-note-title">{note.title}</h3>
                  <p className="main-note-preview">
                    {note.content?.slice(0, 100) || ''}
                  </p>
                  <span className="main-note-date">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </section>

          {/* 5-2-3) 구분선 */}
          <hr style={{ margin: '1.5rem 0', borderColor: '#ddd' }} />

          {/* 5-2-4) 폴더 내 파일 섹션 (드래그 앤 드롭 허용) */}
          <h3 style={{ marginBottom: '0.5rem' }}>
            📁 업로드된 파일 ({files.length})
          </h3>
          <section
            className={`main-file-list ${
              isDragOver ? 'drag-over' : ''
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleFileDrop}
            style={{ minHeight: '150px' }}
          >
            {files.length === 0 ? (
              <p style={{ color: '#777' }}>이 폴더에는 업로드된 파일이 없습니다.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {files.map((f) => (
                  <li
                    key={f.file_id}
                    className="main-file-item"
                    onClick={() => {
                      // 클릭 시 미리보기/다운로드 (새 탭)
                      window.open(
                        `${API}/api/v1/files/download/${f.file_id}`,
                        '_blank'
                      )
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderBottom: '1px solid #e8e8e8',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* 간단한 파일 아이콘 */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        background: '#f0f0f0',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '0.75rem',
                        fontSize: '1.2rem',
                      }}
                    >
                      📄
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '1rem', color: '#333' }}>
                        {f.original_name}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#555' }}>
                        {new Date(f.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {/*
              <div style={{ textAlign: 'center', color: '#999', marginTop: '1rem' }}>
                파일을 이 영역으로 드래그 앤 드롭하면 바로 업로드됩니다.
              </div>
            */}
          </section>
        </>
      )}
    </main>
  )
}
