// src/components/Layout.jsx
import React, { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './Topbar'
import BottomBar from './Bottombar'
import '../css/Layout.css'
import '../css/Modal.css'    // 모달 전용 스타일

export default function Layout() {
  const navigate = useNavigate()
  const { folderId: folderIdParam } = useParams()
  const parsedFolderId = folderIdParam ? parseInt(folderIdParam, 10) : null

  // 1) 검색, 필터, 현재 노트, 현재 폴더 상태
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [currentNote, setCurrentNote] = useState(null)
  const [selectedFolderId, setSelectedFolderId] = useState(parsedFolderId)
  useEffect(() => {
    setSelectedFolderId(parsedFolderId)
  }, [parsedFolderId])

  // 2) 녹음 / 요약 상태 텍스트
  const [statusText, setStatusText] = useState('')
  const handleRecord = () => setStatusText('녹음이 진행중입니다...')
  const handleSummarize = async () => {
    if (!currentNote) return
    setStatusText('요약을 수행 중입니다...')
    const API = import.meta.env.VITE_API_BASE_URL
    const token = localStorage.getItem('access_token')

    try {
      const res = await fetch(
        `${API}/api/v1/notes/${currentNote.id}/summarize`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        alert('요약에 실패했습니다')
        setStatusText('')
        return
      }
      const updated = await res.json()
      setCurrentNote(updated)
      setStatusText('요약 완료')
    } catch (err) {
      console.error('[Layout] 요약 중 예외:', err)
      alert('요약 처리 중 오류가 발생했습니다.')
      setStatusText('')
    }
  }

  // 3) 즐겨찾기 토글
  const toggleFavorite = async () => {
    if (!currentNote) return
    const API = import.meta.env.VITE_API_BASE_URL
    const token = localStorage.getItem('access_token')
    try {
      const res = await fetch(
        `${API}/api/v1/notes/${currentNote.id}/favorite`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_favorite: !currentNote.is_favorite }),
        }
      )
      if (res.ok) {
        const updated = await res.json()
        setCurrentNote(updated)
      } else {
        alert('즐겨찾기 변경 실패')
      }
    } catch (err) {
      console.error('[Layout] 즐겨찾기 처리 중 예외:', err)
      alert('즐겨찾기 처리 중 오류가 발생했습니다.')
    }
  }

  const handleNewNote = () => navigate('/notes/new')

  // 4) 파일 업로드 처리
  const fileInputRef = useRef()
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState(null)
  const [fileUploadTimestamp, setFileUploadTimestamp] = useState(0)

  const handleUploadClick = () => {
    if (selectedFolderId == null) {
      alert('먼저 사이드바에서 업로드할 폴더를 선택하세요.')
      return
    }
    setUploadTargetFolderId(selectedFolderId)
    fileInputRef.current && fileInputRef.current.click()
  }

  const handleFilesSelected = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const API = import.meta.env.VITE_API_BASE_URL
    const token = localStorage.getItem('access_token')
    const folderIdToUpload = uploadTargetFolderId

    if (!folderIdToUpload) {
      alert('유효한 폴더 ID가 없습니다. 업로드를 취소합니다.')
      e.target.value = null
      return
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('upload_file', file)
      formData.append('folder_id', String(folderIdToUpload))

      console.log(
        `[Layout] 파일 업로드 요청 → "${file.name}" → 폴더 ${folderIdToUpload}`
      )

      try {
        const res = await fetch(`${API}/api/v1/files/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        if (!res.ok) {
          console.error(
            `[Layout] 파일 업로드 실패: "${file.name}"`,
            res.status,
            await res.text()
          )
        } else {
          console.log(`[Layout] 파일 업로드 성공: "${file.name}"`)
        }
      } catch (err) {
        console.error(`[Layout] 파일 업로드 중 예외: "${file.name}"`, err)
      }
    }

    setFileUploadTimestamp(Date.now())
    setUploadTargetFolderId(null)
    e.target.value = null
  }

  // 5) OCR 전용 파일 선택 및 처리
  const ocrInputRef = useRef()
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalBody, setModalBody] = useState('')

  const handleOcrClick = () => {
    if (selectedFolderId == null) {
      alert('OCR을 수행할 폴더를 선택하세요.')
      return
    }
    ocrInputRef.current && ocrInputRef.current.click()
  }

  const handleOcrSelected = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const baseName = file.name.replace(/\.[^/.]+$/, '')  // 수정: 확장자 제거
    const formData = new FormData()
    formData.append('ocr_file', file)

    const API = import.meta.env.VITE_API_BASE_URL
    const token = localStorage.getItem('access_token')
    setStatusText('OCR 진행중...')

    try {
      const res = await fetch(`${API}/api/v1/files/ocr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        alert('이미지 텍스트 변환에 실패했습니다.')
        setStatusText('')
        return
      }

      // 변경: 백엔드에서 노트를 생성하고 note_id 반환
      const { note_id, text, summary } = await res.json()

      // 변경: 생성된 노트 상세 정보를 한 번 더 조회하여 currentNote 설정
      const noteRes = await fetch(`${API}/api/v1/notes/${note_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const newNote = await noteRes.json()
      setCurrentNote(newNote)

      // 모달 내용 구성
      let bodyHtml = `<h3>${baseName} OCR 결과</h3><pre class="modal-pre">${text}</pre>`
      if (summary?.trim()) {
        bodyHtml += `<h3>요약 결과</h3><pre class="modal-pre">${summary}</pre>`
      }
      setModalTitle(`${baseName} OCR 결과`)
      setModalBody(bodyHtml)
      setShowModal(true)
      setStatusText('OCR 완료')
    } catch (err) {
      console.error('[Layout] OCR 중 예외:', err)
      alert('OCR 처리 중 오류가 발생했습니다.')
      setStatusText('')
    } finally {
      e.target.value = null
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setModalTitle('')
    setModalBody('')
  }

  return (
    <div className="layout-container">
      <Sidebar
        onFilterChange={setFilter}
        onSelectFolder={setSelectedFolderId}
        onNoteSelect={setCurrentNote}
      />

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
          <Outlet
            context={{
              setCurrentNote,
              toggleFavorite,
              filter,
              selectedFolderId,
              fileUploadTimestamp,
            }}
          />
        </div>

        <BottomBar
          statusText={statusText}
          onRecordClick={handleRecord}
          onSummarizeClick={handleSummarize}
          onUploadClick={handleUploadClick}
          onOcrClick={handleOcrClick}
        />
      </div>

      {/* 숨겨진 파일 input (업로드용) */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        multiple
        onChange={handleFilesSelected}
      />

      {/* 숨겨진 파일 input (OCR용) */}
      <input
        type="file"
        ref={ocrInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleOcrSelected}
      />

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalTitle}</h2>
              <button className="modal-close-btn" onClick={closeModal}>
                ×
              </button>
            </div>
            <div
              className="modal-content"
              dangerouslySetInnerHTML={{ __html: modalBody }}
            />
            <div className="modal-footer">
              <button className="modal-ok-btn" onClick={closeModal}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
