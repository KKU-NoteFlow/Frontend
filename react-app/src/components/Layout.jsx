/* eslint-disable no-console */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './Topbar'
import BottomBar from './Bottombar'
import { Toast } from '../ui'
import '../css/Layout.css'
import '../css/Modal.css'

export default function Layout() {
  const navigate = useNavigate()
  const local = useLocation()

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      navigate('/', { replace: true })
    }
  }, [local.pathname, navigate])
  
  const { folderId: folderIdParam, noteId } = useParams()
  const parsedFolderId = folderIdParam ? parseInt(folderIdParam, 10) : null
  const parsedNoteId = noteId ? parseInt(noteId, 10) : null

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
  const [onRequestEdit, setOnRequestEdit] = useState(null);
  const [opProgress, setOpProgress] = useState({ visible: false, label: '', value: 0 });
  const [toast, setToast] = useState({ open: false, message: '', variant: 'info' })
  const [sidebarState, setSidebarState] = useState('pinned')

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

  const handleRecord = async () => {
    const Win = window
    const SpeechRecognition = Win.SpeechRecognition || Win.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('이 브라우저는 Web Speech API를 지원하지 않습니다. Chrome에서 사용하세요.')
      return
    }

    if (!isRecording) {
      try {
        if (currentNote) {
          const target = `/notes/${currentNote.id}`
          if (!local.pathname.startsWith('/notes/') || parsedNoteId !== currentNote.id) {
            navigate(target)
          }
          const start = Date.now()
          const timeoutMs = 1500
          while ((!onRequestEdit || !onSttInsert || !onSttInterimInsert) && Date.now() - start < timeoutMs) {
            await new Promise(r => setTimeout(r, 80))
          }
          if (typeof onRequestEdit === 'function') {
            try { onRequestEdit() } catch (e) { console.error('onRequestEdit failed', e) }
          }
        }
      } catch (e) { console.error('prepare record navigation failed', e) }
      const recog = new SpeechRecognition()
      recog.continuous = true
      recog.interimResults = true
      recog.lang = 'ko-KR'

      recog.onresult = (ev) => {
        let finalText = ''
        let interimText = ''
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i]
          if (res.isFinal) finalText = res[0].transcript
          else interimText = res[0].transcript
        }
        // avoid duplicate inserts across recognition restarts
        try {
          recog._lastInsertedFinal = recog._lastInsertedFinal || ''
          if (finalText && finalText !== recog._lastInsertedFinal) {
            if (typeof onSttInsert === 'function') {
              try { onSttInsert(finalText) } catch (e) { /* ignore */ }
            } else {
              setStatusText((s) => (s ? (s + '\n' + finalText) : finalText))
            }
            recog._lastInsertedFinal = finalText
          }
        } catch (e) {}
        if (typeof onSttInterimInsert === 'function') {
          try { onSttInterimInsert(interimText) } catch (e) { console.error('onSttInterimInsert failed', e) }
        }
      }

      recog.onerror = (e) => {
        // stop on fatal errors
        if (e && (e.error === 'not-allowed' || e.error === 'service-not-allowed')) {
          try { setIsRecording(false) } catch {}
        }
      }

      // auto-restart when browser ends recognition (common ~5min limit)
      recog.onend = () => {
        // if user still intends to record, restart after short delay
        if (speechRecognitionRef.current && speechRecognitionRef.current._shouldListen) {
          try {
            setTimeout(() => {
              try { speechRecognitionRef.current.start() } catch (e) {}
            }, 500)
          } catch (e) {}
        } else {
          setIsRecording(false)
          setOpProgress({ visible: false, label: '', value: 0 })
          setStatusText('녹음 종료')
        }
      }

      recog._shouldListen = true
      speechRecognitionRef.current = recog
      try {
        recog.start()
        setIsRecording(true)
        setStatusText('녹음중입니다.')
      } catch (e) {
        console.error('recog start err', e)
      }
    } else {
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

  const handleGenerateQuiz = async () => {
    if (!currentNote) return
    const API = import.meta.env.VITE_API_BASE_URL ?? ''
    const token = localStorage.getItem('access_token')
    try {
      const res = await fetch(`${API}/api/v1/notes/${currentNote.id}/generate-quiz`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        let body = ''
        try { body = await res.text() } catch {}
        console.error('[Layout] generate-quiz failed', res.status, body)
        alert('예상 문제 생성에 실패했습니다.')
        return
      }
      const created = await res.json()
      // created is expected to be a list of NoteResponse; open the first one if present
      if (Array.isArray(created) && created.length > 0) {
        const first = created[0]
        try { window.dispatchEvent(new Event('nf:notes-refresh')) } catch (e) {}
        setCurrentNote(first)
        navigate(`/notes/${first.id}`)
        setToast({ open: true, message: '예상 문제가 생성되었습니다.', variant: 'success' })
      } else {
        alert('예상 문제가 생성되었지만 반환된 데이터가 비어있습니다.')
      }
    } catch (err) {
      console.error('[Layout] generate-quiz exception', err)
      alert('예상 문제 생성 중 오류가 발생했습니다.')
    }
  }

  

  const toggleFavorite = async () => {
    if (!currentNote) return
    const API = import.meta.env.VITE_API_BASE_URL ?? ''
    const token = localStorage.getItem('access_token')
    try {
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

  const fileInputRef = useRef()
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState(null)
  const [fileUploadTimestamp, setFileUploadTimestamp] = useState(0)

  const getDefaultUploadFolderId = () => {
    if (selectedFolderId != null) return selectedFolderId
    if (currentNote && typeof currentNote.folder_id !== 'undefined') return currentNote.folder_id ?? null
    try {
      const last = localStorage.getItem('nf-last-upload-folder')
      if (last !== null) {
        if (last === 'null') return null
        const parsed = parseInt(last, 10)
        if (!Number.isNaN(parsed)) return parsed
      }
    } catch {}
    return null
  }

  const handleUploadClick = () => {
    const fid = getDefaultUploadFolderId()
    setUploadTargetFolderId(fid)
    fileInputRef.current && fileInputRef.current.click()
  }

  const handleFilesSelected = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const API = import.meta.env.VITE_API_BASE_URL ?? ''
    const token = localStorage.getItem('access_token')
    const folderIdToUpload = uploadTargetFolderId

    setOpProgress({ visible: true, label: '업로드 준비', value: 0 })
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('upload_file', file)
      if (parsedNoteId) {
        formData.append('note_id', String(parsedNoteId))
      } else {
        if (folderIdToUpload != null) {
          formData.append('folder_id', String(folderIdToUpload))
        }
      }

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
          setToast({ open: true, message: `업로드 실패: ${file.name}`, variant: 'error' })
        } else {
          // parse uploaded file info
          let uploaded = null
          try { uploaded = await res.json() } catch(e) { uploaded = null }
          setToast({ open: true, message: `업로드 성공: ${file.name}`, variant: 'success' })
          try { localStorage.setItem('nf-last-upload-folder', String(folderIdToUpload)) } catch {}

          // If server returned a file url, create a note containing the image (to match drag-n-drop behavior)
          try {
            const fileUrl = uploaded && (uploaded.url || uploaded.file_url || uploaded.file_url)
            if (fileUrl) {
              const noteBody = {
                title: uploaded.original_name || file.name || '첨부된 파일',
                content: `![${(uploaded.original_name||file.name).replace(/"/g,'')}](${fileUrl})`,
                folder_id: folderIdToUpload,
              }
              const noteRes = await fetch(`${API}/api/v1/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(noteBody),
              })
              if (noteRes.ok) {
                // nothing else needed here; we'll refresh lists after loop
              }
            }
          } catch (e) {}
        }
      } catch (err) {
        console.error(`[Layout] 파일 업로드 중 예외: "${file.name}"`, err)
        setToast({ open: true, message: `업로드 예외: ${file.name}`, variant: 'error' })
      }
      setOpProgress({
        visible: true,
        label: `업로드 진행 (${i + 1}/${files.length})`,
        value: Math.round(((i + 1) / files.length) * 100)
      })
    }

    setFileUploadTimestamp(Date.now())
    setUploadTargetFolderId(null)
    e.target.value = null
    setOpProgress({ visible: false, label: '', value: 0 })
    try { window.dispatchEvent(new Event('nf:notes-refresh')) } catch {}
  }

  // ── OCR ──────────────────────────────────────────────────────────
  const ocrInputRef = useRef()
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalBody, setModalBody] = useState('')

  const handleOcrClick = () => {
    if (selectedFolderId == null) {
      console.warn('폴더 미선택 상태로 OCR을 진행합니다. 노트는 루트에 생성됩니다.')
    }
    ocrInputRef.current && ocrInputRef.current.click()
  }

  const handleOcrSelected = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const baseName = file.name.replace(/\.[^/.]+$/, '')
    const formData = new FormData()
    formData.append('file', file)
    // ✅ folder_id는 선택됐을 때만 보냄(422 방지)
    if (selectedFolderId != null) {
      formData.append('folder_id', String(selectedFolderId))
    }

    const API = import.meta.env.VITE_API_BASE_URL ?? ''
    const token = localStorage.getItem('access_token')
    setStatusText('OCR 진행중...')

    try {
      setOpProgress({ visible: true, label: 'OCR 업로드', value: 30 })
      // ✅ 잘못된 koreng → 올바른 kor+eng 로 고정(필요하면 설정에서 변경 가능)
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

      const ocr = await res.json()
      const { note_id, text = '', warnings = [], results = [] } = ocr

      // ✅ 결과 텍스트가 짧으면(<= 8자) 자동 생성/이동하지 않고 미리보기만 띄움
      const shortText = (text || '').trim()
      const tooShort = shortText.length <= 8

      if (note_id && !tooShort) {
        navigate(`/notes/${note_id}`)
        window.dispatchEvent(new Event('nf:notes-refresh'))
        setStatusText('OCR 완료')
        setOpProgress({ visible: true, label: '완료', value: 100 })
        if (warnings.length) {
          setToast({ open: true, message: `OCR 완료 (경고 ${warnings.length}건)`, variant: 'warning' })
        } else {
          setToast({ open: true, message: 'OCR 완료', variant: 'success' })
        }
        return
      }

      // 노트 미생성 또는 결과가 너무 짧을 때 → 모달 표시
      let bodyHtml = `<h3>${baseName} OCR 결과</h3>`
      if (Array.isArray(results) && results.length) {
        const pages = results
          .slice()
          .sort((a,b) => (a.page||0)-(b.page||0))
          .map(r => `<h4 style="margin:8px 0">Page ${r.page}</h4><pre class="modal-pre">${(r.text||'').replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</pre>`)
          .join('')
        bodyHtml = pages
      }
      if (shortText) {
        bodyHtml = `<h3>병합 텍스트</h3><pre class="modal-pre">${shortText.replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</pre>`
      }
      if (warnings.length) {
        bodyHtml += `<div style="background: color-mix(in oklab, var(--nf-warning) 12%, var(--nf-surface)); border:1px solid color-mix(in oklab, var(--nf-warning) 45%, var(--nf-border)); border-radius:8px; padding:8px; margin-top:8px; color: var(--nf-text)"><b>경고</b><ul style="margin:4px 0 0 18px">${warnings.map(w=>`<li>${w.replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</li>`).join('')}</ul></div>`
      }
      setModalTitle(`${baseName} OCR 결과${tooShort ? ' (내용이 너무 짧아 노트를 만들지 않았어요)' : ''}`)
      setModalBody(bodyHtml)
      setShowModal(true)
      setStatusText(tooShort ? 'OCR 결과가 너무 짧음' : 'OCR 완료')
      setToast({ open: true, message: tooShort ? 'OCR 결과가 너무 짧아요' : 'OCR 완료', variant: tooShort ? 'warning' : 'success' })
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
              setOpProgress,
              setOnRequestEdit,
            }}
          />
          {false && (<div />)}
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

        {local.pathname.startsWith('/notes/') && (
        <BottomBar
          statusText={statusText}
          isRecording={isRecording}
          onRecordClick={handleRecord}
          onSummarizeClick={onSummarizeClick}
          onUploadClick={handleUploadClick}
          onOcrClick={handleOcrClick}
            onGenerateClick={handleGenerateQuiz}
          />
        )}

        <Toast open={toast.open} message={toast.message} variant={toast.variant} onClose={() => setToast({ ...toast, open: false })} />
      </div>

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple onChange={handleFilesSelected} />

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
              <button className="modal-close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-content" dangerouslySetInnerHTML={{ __html: modalBody }} />
            <div className="modal-footer">
              <button className="modal-ok-btn" onClick={closeModal}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
/*
  Component: Layout
  Role: Shared shell around app pages — renders Topbar, Sidebar, and main Outlet area.
  Notes:
   - Orchestrates sidebar state (pinned/hidden/temporary) and passes handlers down.
   - Keeps consistent app chrome and spacing across nested routes.
*/
