// src/components/Layout.jsx
import React, { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './Topbar'
import BottomBar from './Bottombar'
// 디자인 개선: 플로팅 도크 대신 상단 툴바로 배치
// ActionToolbar removed from layout per UX request
import { Toast } from '../ui'
import '../css/Layout.css'
import '../css/Modal.css'    // 모달 전용 스타일

export default function Layout() {
  const navigate = useNavigate()
  const local = useLocation()

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      navigate('/', { replace: true })
    }
  }, [local.pathname, navigate])
  
  const { folderId: folderIdParam } = useParams()
  const parsedFolderId = folderIdParam ? parseInt(folderIdParam, 10) : null

  // 1) 검색, 필터, 현재 노트, 현재 폴더 상태
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [currentNote, setCurrentNote] = useState(null)
  const [selectedFolderId, setSelectedFolderId] = useState(parsedFolderId)
  const [statusText, setStatusText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechRecognitionRef = useRef(null);
  const [onSttInsert, setOnSttInsert] = useState(null);
  const [onSttInterimInsert, setOnSttInterimInsert] = useState(null);
  const [opProgress, setOpProgress] = useState({ visible: false, label: '', value: 0 });
  const [toast, setToast] = useState({ open: false, message: '', variant: 'info' })
  // sidebarState: 'pinned' (always visible) | 'hidden' (fully hidden; hover reveals temporarily)
  const [sidebarState, setSidebarState] = useState('pinned')

  // 외부(대시보드 등)에서 공용 액션을 트리거할 수 있게 이벤트 리스너 제공
  useEffect(() => {
    const onRecord = () => handleRecord()
    const onSummarize = () => handleSummarize()
    const onUpload = () => handleUploadClick()
    const onOcr = () => handleOcrClick()
    window.addEventListener('nf:record', onRecord)
    window.addEventListener('nf:summarize', onSummarize)
    window.addEventListener('nf:upload', onUpload)
    window.addEventListener('nf:ocr', onOcr)
    return () => {
      window.removeEventListener('nf:record', onRecord)
      window.removeEventListener('nf:summarize', onSummarize)
      window.removeEventListener('nf:upload', onUpload)
      window.removeEventListener('nf:ocr', onOcr)
    }
  }, [])
  const [onSummarizeClick, setOnSummarizeClick] = useState(null)
  useEffect(() => {
    setSelectedFolderId(parsedFolderId)
  }, [parsedFolderId])

  // ────────────────────────────────────────────────────────────────
  // 2) 녹음 / 요약 / OCR 상태 텍스트
  // ────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────
// (수정) 2) 녹음 상태
// ──────────────────────────────────────────────
const { noteId } = useParams();
const parsedNoteId = noteId ? parseInt(noteId, 10) : null;
const location = useLocation();  // 컴포넌트 함수 내 상단에 위치해야 함

const handleRecord = async () => {
  const Win = window
  const SpeechRecognition = Win.SpeechRecognition || Win.webkitSpeechRecognition
  if (!SpeechRecognition) {
    alert('이 브라우저는 Web Speech API를 지원하지 않습니다. Chrome에서 사용하세요.')
    return
  }

  if (!isRecording) {
    // 시작: 실시간 브라우저 STT (Chrome)
    const recog = new SpeechRecognition()
    recog.continuous = true
    recog.interimResults = true
    recog.lang = 'ko-KR'

    recog.onresult = (ev) => {
      let finalText = ''
      let interimText = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i]
        if (res.isFinal) finalText += res[0].transcript
        else interimText += res[0].transcript
      }
      if (finalText) {
        if (typeof onSttInsert === 'function') {
          try { onSttInsert(finalText) } catch (e) { console.error('onSttInsert failed', e) }
        } else {
          setStatusText((s) => (s ? s + '\n' + finalText : finalText))
        }
      }
      // interim handling
      if (typeof onSttInterimInsert === 'function') {
        try { onSttInterimInsert(interimText) } catch (e) { console.error('onSttInterimInsert failed', e) }
      }
    }

    recog.onerror = (e) => {
      console.error('speech recognition error', e)
      setStatusText('음성 인식 오류')
      setToast({ open: true, message: '음성 인식 오류', variant: 'error' })
      setIsRecording(false)
    }

    recog.onend = () => {
      setIsRecording(false)
      setOpProgress({ visible: false, label: '', value: 0 })
      setStatusText('녹음 종료')
    }

    speechRecognitionRef.current = recog
    try {
      recog.start()
      setIsRecording(true)
      setStatusText('음성 인식 중...')
      setOpProgress({ visible: true, label: '음성 인식', value: 30 })
    } catch (e) {
      console.error('recog start err', e)
    }
  } else {
    // 중지
    try {
      speechRecognitionRef.current && speechRecognitionRef.current.stop()
    } catch (e) {
      console.error('stop err', e)
    }
    setIsRecording(false)
    setOpProgress({ visible: false, label: '', value: 0 })
    setStatusText('')
  }
}


  // 요약 처리 (페이지 제공 핸들러가 있으면 위임, 없으면 현재 노트로 직접 처리)
  const handleSummarize = async () => {
    if (typeof onSummarizeClick === 'function') {
      try {
        await onSummarizeClick()
      } catch (e) {
        console.error('[Layout] delegated summarize failed:', e)
      }
      return
    }

    if (!currentNote) return
    setStatusText('요약을 수행 중입니다...')
    const API = import.meta.env.VITE_API_BASE_URL ?? ''
    const token = localStorage.getItem('access_token')
    try {
      const res = await fetch(`${API}/api/v1/notes/${currentNote.id}/summarize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
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
    const API = import.meta.env.VITE_API_BASE_URL ?? ''
    const token = localStorage.getItem('access_token')
    try {
      // optimistic update: reflect UI immediately
      const newFav = !currentNote.is_favorite
      const prev = currentNote
      setCurrentNote({ ...currentNote, is_favorite: newFav })

      const url = `${API}/api/v1/notes/${currentNote.id}/favorite`
      const bodyData = { is_favorite: newFav }
      try {
        console.log('[Layout] toggleFavorite request', { url, body: bodyData })
      } catch {}

      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      })

      if (res.ok) {
        const updated = await res.json()
        console.log('[Layout] toggleFavorite response', updated)
        setCurrentNote(updated)
        setToast({ open: true, message: '즐겨찾기 업데이트', variant: 'success' })
      } else {
        // revert optimistic
        setCurrentNote(prev)
        let body = ''
        try { body = await res.text() } catch {}
        console.error('[Layout] toggleFavorite failed', res.status, body)
        alert(`즐겨찾기 변경 실패: ${res.status} ${body}`)
        setToast({ open: true, message: '즐겨찾기 변경 실패', variant: 'error' })
      }
    } catch (err) {
      console.error('[Layout] 즐겨찾기 처리 중 예외:', err)
      alert('즐겨찾기 처리 중 오류가 발생했습니다. 콘솔을 확인하세요.')
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

    const API = import.meta.env.VITE_API_BASE_URL ?? ''
    const token = localStorage.getItem('access_token')
    const folderIdToUpload = uploadTargetFolderId

    if (!folderIdToUpload) {
      alert('유효한 폴더 ID가 없습니다. 업로드를 취소합니다.')
      e.target.value = null
      return
    }

    setOpProgress({ visible: true, label: '업로드 준비', value: 0 })
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
          setToast({ open: true, message: `업로드 실패: ${file.name}`, variant: 'error' })
        } else {
          console.log(`[Layout] 파일 업로드 성공: "${file.name}"`)
          setToast({ open: true, message: `업로드 성공: ${file.name}`, variant: 'success' })
        }
      } catch (err) {
        console.error(`[Layout] 파일 업로드 중 예외: "${file.name}"`, err)
        setToast({ open: true, message: `업로드 예외: ${file.name}`, variant: 'error' })
      }
      setOpProgress({ visible: true, label: `업로드 진행 (${i + 1}/${files.length})`, value: Math.round(((i + 1) / files.length) * 100) })
    }

    setFileUploadTimestamp(Date.now())
    setUploadTargetFolderId(null)
    e.target.value = null
    setOpProgress({ visible: false, label: '', value: 0 })
  }

  // 5) OCR 전용 파일 선택 및 처리
  const ocrInputRef = useRef()
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalBody, setModalBody] = useState('')

  const handleOcrClick = () => {
    // 폴더가 없어도 진행 가능: 루트에 노트 생성
    if (selectedFolderId == null) {
      console.warn('폴더 미선택 상태로 OCR을 진행합니다. 노트는 루트에 생성됩니다.')
    }
    ocrInputRef.current && ocrInputRef.current.click()
  }

  const handleOcrSelected = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const baseName = file.name.replace(/\.[^/.]+$/, '')  // 수정: 확장자 제거
    const formData = new FormData()
    formData.append('file', file)
    if (selectedFolderId != null) {
      formData.append('folder_id', String(selectedFolderId))
    }

    const API = import.meta.env.VITE_API_BASE_URL ?? ''
    const token = localStorage.getItem('access_token')
    setStatusText('OCR 진행중...')

    try {
      setOpProgress({ visible: true, label: 'OCR 업로드', value: 30 })
      const langs = 'kor+eng'
      const maxPages = 50
      const res = await fetch(`${API}/api/v1/files/ocr?langs=${encodeURIComponent(langs)}&max_pages=${encodeURIComponent(maxPages)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        alert('이미지 텍스트 변환에 실패했습니다.')
        setStatusText('')
        setOpProgress({ visible: false, label: '', value: 0 })
        setToast({ open: true, message: 'OCR 변환 실패', variant: 'error' })
        return
      }

      // 변경: 공통 OCR 응답 스키마 사용
      const ocr = await res.json()
      const { note_id, text, warnings = [], results = [] } = ocr
      // 변경: 결과는 모달 대신 새 노트 화면으로 즉시 이동
      if (note_id) {
        navigate(`/notes/${note_id}`)
        window.dispatchEvent(new Event('nf:notes-refresh'))
        setStatusText('OCR 완료')
        setOpProgress({ visible: true, label: '완료', value: 100 })
        return
      }
      if (warnings.length) console.warn('[OCR warnings]', warnings)
      setOpProgress({ visible: true, label: 'OCR 처리 중', value: 70 })

      // 변경: 생성된 노트 상세 정보를 한 번 더 조회하여 currentNote 설정
      const noteRes = await fetch(`${API}/api/v1/notes/${note_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const newNote = await noteRes.json()
      setCurrentNote(newNote)

      // 모달 내용 구성 (페이지별 결과 + 병합 텍스트 + 경고)
      let bodyHtml = `<h3>${baseName} OCR 결과</h3>`
      if (Array.isArray(results) && results.length) {
        const pages = results
          .slice()
          .sort((a,b) => (a.page||0)-(b.page||0))
          .map(r => `<h4 style="margin:8px 0">Page ${r.page}</h4><pre class="modal-pre">${(r.text||'').replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</pre>`)
          .join('')
        bodyHtml += pages
      }
      if (text?.trim()) {
        bodyHtml += `<h3>병합 텍스트</h3><pre class="modal-pre">${text.replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</pre>`
      }
      if (warnings.length) {
        bodyHtml += `<div style="background: color-mix(in oklab, var(--nf-warning) 12%, var(--nf-surface)); border:1px solid color-mix(in oklab, var(--nf-warning) 45%, var(--nf-border)); border-radius:8px; padding:8px; margin-top:8px; color: var(--nf-text)"><b>경고</b><ul style="margin:4px 0 0 18px">${warnings.map(w=>`<li>${w.replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</li>`).join('')}</ul></div>`
      }
      setModalTitle(`${baseName} OCR 결과`)
      setModalBody(bodyHtml)
      setShowModal(true)
      setStatusText('OCR 완료')
      setToast({ open: true, message: 'OCR 완료', variant: 'success' })
      setOpProgress({ visible: true, label: '완료', value: 100 })
    } catch (err) {
      console.error('[Layout] OCR 중 예외:', err)
      alert('OCR 처리 중 오류가 발생했습니다.')
      setStatusText('')
      setOpProgress({ visible: false, label: '', value: 0 })
      setToast({ open: true, message: 'OCR 예외', variant: 'error' })
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
    <div className={`layout-container ${sidebarState === 'hidden' ? 'sidebar-hidden' : ''}`}>
      <Sidebar
        sidebarState={sidebarState}
        setSidebarState={setSidebarState}
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
          onToggleSidebar={() => setSidebarState(s => s === 'pinned' ? 'hidden' : 'pinned')}
          sidebarState={sidebarState}
        />
        {/* 작업 툴바 제거됨 (녹음/요약/업로드/텍스트 변환) */}

        <div className="layout-main" id="content">
          <Outlet
            context={{
              setCurrentNote,
              toggleFavorite,
              filter,
              selectedFolderId,
              fileUploadTimestamp,
              setOnSummarizeClick,
              setOnSttInsert,
              setOnSttInterimInsert,
              isRecording,
              setStatusText,
            }}
          />
          {false && (
            <div />
          )}
        </div>

        {opProgress.visible && (
          <div style={{ position: 'sticky', bottom: 50, padding: '0.5rem 1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="nf-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={opProgress.value} aria-label={opProgress.label}>
                  <div className="nf-progress__bar" style={{ width: `${opProgress.value}%` }} />
                </div>
              </div>
              <span style={{ color: 'var(--nf-muted)', fontSize: 'var(--nf-font-sm)' }}>{opProgress.label}</span>
            </div>
          </div>
        )}

        {/* Show bottom bar only on note detail pages (file/note view).
            The main dashboard does not need the global bottom bar. */}
        {local.pathname.startsWith('/notes/') && (
          <BottomBar
            statusText={statusText}
            isRecording={isRecording}
            onRecordClick={handleRecord}
            onSummarizeClick={onSummarizeClick}
            onUploadClick={handleUploadClick}
            onOcrClick={handleOcrClick}
          />
        )}

        <Toast open={toast.open} message={toast.message} variant={toast.variant} onClose={() => setToast({ ...toast, open: false })} />
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
        accept=".png,.jpg,.jpeg,.tif,.tiff,.bmp,.pdf,.doc,.docx,.hwp"
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

      {/* STT 모달 제거: 이제 인라인(노트 편집기)로 직접 삽입합니다. */}
    </div>
  )
}
