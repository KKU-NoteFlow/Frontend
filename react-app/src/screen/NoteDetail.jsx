// src/screen/NoteDetail.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import ToastMarkdownEditor from '../components/ToastMarkdownEditor'
import MarkdownViewer from '../components/MarkdownViewer'
import ErrorBoundary from '../components/ErrorBoundary'
import axios from 'axios'
import { Button, Skeleton } from '../ui'
import '../css/Editor.css'
import '../css/NoteDetail.css'

export default function NoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [note, setNote] = useState(null)
  const [html, setHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [titleText, setTitleText] = useState('')
  const { setCurrentNote, setOnSummarizeClick, setOnSttInsert, setOnSttInterimInsert, setStatusText, isRecording } = useOutletContext()

  const editorRef = React.useRef(null)
  const scrollRef = React.useRef(null)
  const lastScrollRef = React.useRef(0)
  const [sttInterim, setSttInterim] = useState('')

  const token = localStorage.getItem('access_token')
  const API = import.meta.env.VITE_API_BASE_URL ?? ''

  // 저장은 Markdown 원문 그대로 보냅니다.

  // 노트 로드
  useEffect(() => {
    fetch(`${API}/api/v1/notes/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        if (res.status === 401) {
          // unauthorized — clear token and redirect to login
          console.warn('[NoteDetail] 401 Unauthorized when fetching note; redirecting to login')
          try { localStorage.removeItem('access_token') } catch {}
          navigate('/', { replace: true })
          return Promise.reject(new Error('Unauthorized'))
        }
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          return Promise.reject(new Error(text || 'Failed to fetch'))
        }
        return res.json()
      })
      .then(data => {
        setNote(data)
        setCurrentNote?.(data)
        // Markdown 우선 로드 (없으면 HTML)
        setHtml(data.content || data.contentHTML || '')
        setTitleText(data.title || '')
        setIsEditing(false)
      })
      .catch((err) => {
        if (err && err.message === 'Unauthorized') return
        console.error('[NoteDetail] 노트 불러오기 실패:', err)
        alert('노트를 불러올 수 없습니다. 페이지에서 다시 시도해 주세요.')
        // 페이지에 머물며 에러 상태를 표시할 수 있도록 최소 상태 유지
        setNote({ id, title: '불러오기 실패', created_at: new Date().toISOString() })
        setHtml('')
      })
  }, [id])

  // 저장
  const handleSave = async () => {
    if (!note) return
    setSaving(true)
    try {
      if (!token) {
        alert('저장하려면 로그인 정보가 필요합니다.')
        return
      }
      // 현재 에디터의 텍스트(Markdown)를 그대로 저장
      const currentMarkdown = editorRef.current ? editorRef.current.getHTML() : html
      const contentToSave = currentMarkdown || ''

      const res = await fetch(`${API}/api/v1/notes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
      body: JSON.stringify({
          title: titleText || note.title,
          content: contentToSave,
          folder_id: note.folder_id
        })
      })

      if (!res.ok) {
        // try to extract error body for debugging
        let body = ''
        try { body = await res.text() } catch (e) { body = String(e) }
        console.error('[NoteDetail] save failed', res.status, body)
        alert(`저장에 실패했습니다. 서버 응답: ${res.status} ${body}`)
        return
      }

      const updated = await res.json()
      setNote(updated)
      setCurrentNote?.(updated)
      // 에디터에는 계속 마크다운을 유지
      setHtml(currentMarkdown)
      setLastSavedHtml(currentMarkdown)
      setTitleText(updated.title || titleText)
      setIsEditing(false)
      alert('저장되었습니다.')
    } catch (e) {
      console.error('[NoteDetail] save exception', e)
      alert('저장에 실패했습니다. 콘솔을 확인하세요.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    // revert to last saved content and exit edit mode
    setHtml(lastSavedHtml)
    setTitleText(note?.title || '')
    setIsEditing(false)
  }

  // Auto-save: every 5 minutes (300000ms) when note is open; save only if changed
  const [lastSavedHtml, setLastSavedHtml] = useState(html) // 마지막 저장된 Markdown 값
  useEffect(() => {
    setLastSavedHtml(html)
  }, [html])

  useEffect(() => {
    let timer = null
    const intervalMs = 1000 * 60 * 5 // 5 minutes
    const doAutoSave = async () => {
      if (!note) return
      // 현재 마크다운
      const contentMarkdown = editorRef.current ? editorRef.current.getHTML() : html
      if (contentMarkdown === lastSavedHtml) return
      try {
        setStatusText?.('자동 저장 중...')
        const res = await fetch(`${API}/api/v1/notes/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          // Markdown 원문을 그대로 저장
          body: JSON.stringify({ title: note.title, content: contentMarkdown || '', folder_id: note.folder_id })
        })
        if (!res.ok) throw new Error('autosave failed')
        const updated = await res.json()
        setNote(updated)
        setCurrentNote?.(updated)
        setLastSavedHtml(contentMarkdown)
        setStatusText?.('자동 저장 완료')
      } catch (e) {
        console.error('자동 저장 실패', e)
        setStatusText?.('자동 저장 실패')
      }
    }

    timer = setInterval(doAutoSave, intervalMs)
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [html, lastSavedHtml, note, API, token, id, setCurrentNote, setStatusText])

  // 에디터 이미지 업로드
  const handleImageUpload = async file => {
    const form = new FormData()
    form.append('upload_file', file)
    form.append('folder_id', note?.folder_id ?? '')
    const { data } = await axios.post(
      `${API}/api/v1/files/upload`,
      form,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return data.url
  }

  // 요약 트리거 등록 (하단 바의 요약 버튼과 연동)
  const handleSummarize = useCallback(async () => {
    if (!note) return
    setStatusText?.('⏳ 요약 중…')
    try {
      const res = await fetch(`${API}/api/v1/notes/${note.id}/summarize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('summarize start failed')

      // Consume SSE stream until completion so we know when the server finished and saved the summary
      if (res.body && res.body.getReader) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let done = false
        // optional: accumulate chunks if needed; here we just drain
        while (!done) {
          const r = await reader.read()
          done = r.done
          if (r.value) {
            const chunk = decoder.decode(r.value, { stream: true })
            // You could parse lines starting with `data:` to show live output
          }
        }
      } else {
        // Fallback: wait for body to resolve
        try { await res.text() } catch {}
      }

      // Refresh note content after summary saved by backend
      const refreshed = await fetch(`${API}/api/v1/notes/${note.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (refreshed.ok) {
        const updated = await refreshed.json()
        setNote(updated)
        setCurrentNote?.(updated)
        const newHtml = updated.contentHTML || updated.content || ''
        setHtml(newHtml)
        setLastSavedHtml(newHtml)
      }
      setStatusText?.('✅ 요약 완료')
    } catch (e) {
      console.error('[summarize] failed', e)
      setStatusText?.('❌ 요약 실패')
    }
  }, [API, token, note, setStatusText, setCurrentNote])

  useEffect(() => {
    setOnSummarizeClick?.(() => handleSummarize)
  }, [handleSummarize, setOnSummarizeClick])

  // expose STT-insert function to layout so live STT can append text into the editor
  useEffect(() => {
    if (typeof setOnSttInsert !== 'function') return
    const insert = (text) => {
      // switch to edit mode if needed so text can be inserted
      if (!isEditing) {
        if (scrollRef.current) lastScrollRef.current = scrollRef.current.scrollTop
        setIsEditing(true)
      }
      if (!editorRef.current) return
      try {
        // insert final recognized text and clear interim
        editorRef.current.chain().focus().insertContent(`<p>${String(text).replace(/</g, '&lt;')}</p>`).run()
        setSttInterim('')
      } catch (e) {
        console.error('insert stt text failed', e)
      }
    }
    setOnSttInsert(() => insert)
    return () => setOnSttInsert(null)
  }, [setOnSttInsert, isEditing])

  // register interim updater
  useEffect(() => {
    if (typeof setOnSttInterimInsert !== 'function') return
    const interimUpdater = (text) => setSttInterim(String(text || ''))
    setOnSttInterimInsert(() => interimUpdater)
    return () => setOnSttInterimInsert(null)
  }, [setOnSttInterimInsert])

  // Double-click anywhere in content to start editing
  const handleDblClick = () => {
    if (!isEditing) {
      if (scrollRef.current) lastScrollRef.current = scrollRef.current.scrollTop
      setIsEditing(true)
    }
  }

  // Restore scroll position when toggling edit/view
  useEffect(() => {
    if (!scrollRef.current) return
    const y = lastScrollRef.current || 0
    requestAnimationFrame(() => { try { scrollRef.current.scrollTop = y } catch {} })
  }, [isEditing])

  // Keyboard shortcuts: Cmd/Ctrl+S save, Esc cancel, E to edit
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA'
      // Cmd/Ctrl+S
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (isEditing && !saving) handleSave()
        return
      }
      // Esc cancels
      if (e.key === 'Escape' && isEditing) {
        e.preventDefault()
        handleCancelEdit()
        return
      }
      // Press 'e' to edit when not in input
      if (!isEditing && !isInput && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        if (scrollRef.current) lastScrollRef.current = scrollRef.current.scrollTop
        setIsEditing(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isEditing, saving])


  if (!note) {
    return (
      <div className="nf-container" style={{ paddingTop: 'var(--nf-space-4)' }}>
        <Skeleton height={28} style={{ width: 240, marginBottom: 12 }} />
        <Skeleton height={48} />
      </div>
    )
  }

  return (
    <div className="note-detail">
      <div className="note-card">
        <div className="note-header">
          <div>
            {!isEditing ? (
              <h1 className="note-title">{note.title}</h1>
            ) : (
              <input
                value={titleText}
                onChange={e => setTitleText(e.target.value)}
                className="note-title-input"
                placeholder="제목을 입력하세요"
              />
            )}
            <div className="note-meta">{new Date(note.created_at).toLocaleString()}</div>
          </div>
          {!isEditing ? (
            <Button onClick={() => { if (scrollRef.current) lastScrollRef.current = scrollRef.current.scrollTop; setIsEditing(true) }}>
              ✏️ 편집
            </Button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? '저장중…' : '💾 저장'}
              </Button>
              <button className="nf-btn" onClick={handleCancelEdit} type="button">취소</button>
            </div>
          )}
        </div>

        <div className="note-editor" ref={scrollRef} onDoubleClick={handleDblClick}>
          <ErrorBoundary>
            {!isEditing ? (
              <MarkdownViewer content={html} />
            ) : (
              <ToastMarkdownEditor
                html={html}
                onUpdate={newHtml => setHtml(newHtml)}
                uploadImage={handleImageUpload}
                onReady={(ed) => { editorRef.current = ed }}
              />
            )}
          </ErrorBoundary>
          {/* Live interim banner when recording */}
          {isRecording && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(55,123,36,0.06)', color: '#1f6f2a', borderRadius: 6 }}>
              <strong>실시간 인식:</strong>&nbsp;{sttInterim || <em>말하고 계십니다...</em>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
