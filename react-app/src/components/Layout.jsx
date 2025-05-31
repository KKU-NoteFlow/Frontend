// src/components/Layout.jsx

import React, { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './Topbar'
import BottomBar from './Bottombar'
import '../css/Layout.css'
import '../css/Modal.css' // 모달 전용 스타일 (아래에 설명)

export default function Layout() {
  const navigate = useNavigate()
  const { folderId: folderIdParam } = useParams()
  const parsedFolderId = folderIdParam ? parseInt(folderIdParam, 10) : null

  // ────────────────────────────────────────────────────────────────
  // 1) 검색, 필터, 현재 노트, 현재 폴더 상태
  // ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [currentNote, setCurrentNote] = useState(null)
  const [selectedFolderId, setSelectedFolderId] = useState(parsedFolderId)

  useEffect(() => {
    setSelectedFolderId(parsedFolderId)
  }, [parsedFolderId])

  // ────────────────────────────────────────────────────────────────
  // 2) 녹음 / 요약 / OCR 상태 텍스트
  // ────────────────────────────────────────────────────────────────
  const [statusText, setStatusText] = useState('')
  const handleRecord = () => setStatusText('🔴 녹음이 진행중입니다...')
  const handleSummarize = async () => {
    if (!currentNote) return
    setStatusText('⏳ 요약을 수행 중입니다...')
    const API = import.meta.env.VITE_API_BASE_URL
    const token = localStorage.getItem('access_token')

    try {
      const res = await fetch(
        `${API}/api/v1/notes/${currentNote.id}/summarize`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      if (!res.ok) {
        alert('요약에 실패했습니다')
        setStatusText('')
        return
      }
      const updated = await res.json()
      setCurrentNote(updated)
      setStatusText('✅ 요약 완료')
    } catch (err) {
      console.error('[Layout] 요약 중 예외:', err)
      alert('요약 처리 중 오류가 발생했습니다.')
      setStatusText('')
    }
  }

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
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ is_favorite: !currentNote.is_favorite })
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

  // ────────────────────────────────────────────────────────────────
  // 3) 파일 업로드 처리
  // ────────────────────────────────────────────────────────────────
  const fileInputRef = useRef()
  const ocrInputRef = useRef()                 // OCR 전용 파일 input ref
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState(null)

  const handleUploadClick = () => {
    if (selectedFolderId == null) {
      alert('먼저 사이드바에서 업로드할 폴더를 선택하세요.')
      return
    }
    setUploadTargetFolderId(selectedFolderId)
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const [fileUploadTimestamp, setFileUploadTimestamp] = useState(0)

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

      console.log(`[Layout] 파일 업로드 요청 → "${file.name}" → 폴더 ${folderIdToUpload}`)

      try {
        const res = await fetch(`${API}/api/v1/files/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
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

  // ────────────────────────────────────────────────────────────────
  // 4) OCR 전용 파일 선택 처리 (OCR → 요약 → 노트 저장 → 모달 띄우기)
  // ────────────────────────────────────────────────────────────────
  // (1) 모달 표시를 위한 상태
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalBody, setModalBody] = useState('')

  const handleOcrClick = () => {
    if (selectedFolderId == null) {
      alert('먼저 사이드바에서 OCR을 수행할 폴더를 선택하세요.')
      return
    }
    if (ocrInputRef.current) ocrInputRef.current.click()
  }

  const handleOcrSelected = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]  // 첫 번째 파일만 처리
    const formData = new FormData()
    formData.append('ocr_file', file)

    const API = import.meta.env.VITE_API_BASE_URL
    const token = localStorage.getItem('access_token')

    // OCR → 요약 진행 상태 표시
    setStatusText('⏳ OCR 및 요약을 수행 중입니다...')

    try {
      const res = await fetch(`${API}/api/v1/files/ocr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      if (!res.ok) {
        alert('이미지 텍스트 변환에 실패했습니다.')
        setStatusText('')
        return
      }

      // 서버로부터 { text, summary } 형태의 JSON 응답을 받음
      const { text, summary } = await res.json()

      // (2) 요약 결과를 새로운 노트로 저장
      let newNoteData = null
      if (summary && summary.trim().length > 0) {
        const notePayload = {
          title: `[OCR 요약] ${file.name}`, 
          content: summary,
          folder_id: selectedFolderId
        }
        const noteRes = await fetch(`${API}/api/v1/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(notePayload)
        })
        if (noteRes.ok) {
          newNoteData = await noteRes.json()
        } else {
          console.error(
            '[Layout] 요약 노트 생성 실패:',
            noteRes.status,
            await noteRes.text()
          )
        }
      }

      // (3) 모달에 렌더링할 내용 구성
      let bodyHtml = `<h3>OCR 결과</h3><pre class="modal-pre">${text}</pre>`
      if (summary && summary.trim().length > 0) {
        bodyHtml += `<h3>요약 결과</h3><pre class="modal-pre">${summary}</pre>`
        if (newNoteData) {
          bodyHtml += `<p>✅ 요약을 새 노트로 저장했습니다: “${newNoteData.title}”</p>`
        } else {
          bodyHtml += `<p style="color: #d00;">⚠️ 요약 노트 저장에 실패했습니다.</p>`
        }
      } else {
        bodyHtml += `<p>⚠️ 요약된 내용이 없습니다.</p>`
      }

      // (4) 모달 표시
      setModalTitle('OCR & 요약 결과')
      setModalBody(bodyHtml)
      setShowModal(true)
      setStatusText('✅ OCR 및 요약 완료')
    } catch (err) {
      console.error('[Layout] OCR 중 예외:', err)
      alert('OCR 처리 중 오류가 발생했습니다.')
      setStatusText('')
    } finally {
      e.target.value = null
    }
  }

  // 모달 닫기 함수
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
          onOcrClick={handleOcrClick}  // BottomBar에 OCR 클릭 핸들러 전달
        />
      </div>

      {/* 숨겨진 파일 input (폴더 업로드용) */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        multiple
        onChange={handleFilesSelected}
      />

      {/* 숨겨진 파일 input (OCR용, single 파일 처리) */}
      <input
        type="file"
        ref={ocrInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleOcrSelected}
      />

      {/*
        ───────────────────────────────────────────────────────────────────
        모달 컴포넌트 (showModal=true일 때 화면 중앙에 오버레이)
        ───────────────────────────────────────────────────────────────────
      */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalTitle}</h2>
              <button className="modal-close-btn" onClick={closeModal}>×</button>
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
