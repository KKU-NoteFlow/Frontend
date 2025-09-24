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
  const { setCurrentNote, setOnSummarizeClick, setOnSttInsert, setOnSttInterimInsert, setStatusText, isRecording, setOpProgress, setOnRequestEdit } = useOutletContext()

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
    form.append('note_id', note?.id ?? '')   // 수정: note_id로 업로드
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
      // Start progress UI (either real updates from server or heuristic)
      try { setOpProgress?.({ visible: true, label: '요약 중…', value: 5 }) } catch {}

      const res = await fetch(`${API}/api/v1/notes/${note.id}/summarize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('summarize start failed')

      // Read streaming body (SSE or plain stream). Parse `data:` lines or JSON chunks
      if (res.body && res.body.getReader) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let done = false
        let buffered = ''

        // heuristic progress increment when server doesn't send explicit progress
        let heuristicVal = 5
        const heuristicInterval = setInterval(() => {
          try {
            if (!setOpProgress) return
            heuristicVal = Math.min(85, heuristicVal + 1)
            setOpProgress(prev => ({ visible: true, label: prev?.label || '요약 중…', value: heuristicVal }))
          } catch (e) { /* ignore */ }
        }, 700)

        try {
          while (!done) {
            const r = await reader.read()
            done = r.done
            if (r.value) {
              const chunk = decoder.decode(r.value, { stream: true })
              buffered += chunk

              // Process possible SSE style lines (data: ...). Split by double newline which separates events.
              const parts = buffered.split(/\n\n/)
              // keep last partial chunk in buffer
              buffered = parts.pop() || ''

              for (const part of parts) {
                const lines = part.split(/\n/).map(l => l.trim()).filter(Boolean)
                for (const line of lines) {
                  // only process data: lines for SSE; fallback to raw text
                  let content = line
                  if (line.startsWith('data:')) content = line.replace(/^data:\s*/, '')

                  // try JSON
                  try {
                    const obj = JSON.parse(content)
                    // look for numeric progress properties
                    const pct = obj.progress ?? obj.percent ?? obj.pct ?? obj.value
                    if (typeof pct === 'number' && setOpProgress) {
                      const v = Math.max(0, Math.min(100, Math.round(pct)))
                      setOpProgress({ visible: true, label: obj.message || '요약 중…', value: v })
                      continue
                    }
                    // if message only
                    if (obj.message && setOpProgress) {
                      setOpProgress(prev => ({ visible: true, label: obj.message, value: prev?.value || 10 }))
                      continue
                    }
                  } catch (e) {
                    // not JSON, continue to regex checks
                  }

                  // look for percentage like "45%"
                  const m = content.match(/(\d{1,3})\s*%/)
                  if (m && setOpProgress) {
                    const v = Math.max(0, Math.min(100, parseInt(m[1], 10)))
                    setOpProgress({ visible: true, label: '요약 진행', value: v })
                    continue
                  }

                  // fallback: update label with any text lines
                  if (setOpProgress) setOpProgress(prev => ({ visible: true, label: content.slice(0, 80), value: prev?.value || 10 }))
                }
              }
            }
          }
        } finally {
          clearInterval(heuristicInterval)
        }
      } else {
        // Fallback: non-streaming response, drain it (may block until done)
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

      // finalize progress UI
      try { setOpProgress?.({ visible: true, label: '완료', value: 100 }) } catch {}
      setTimeout(() => { try { setOpProgress?.({ visible: false, label: '', value: 0 }) } catch {} }, 700)
      setStatusText?.('✅ 요약 완료')
    } catch (e) {
      console.error('[summarize] failed', e)
      try { setOpProgress?.({ visible: false, label: '', value: 0 }) } catch {}
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
        // allow editor to mount and onReady to set editorRef
      setTimeout(() => {
          try {
            // Append the final recognized text to the markdown state so it always goes to the end
            setHtml(prev => (String(prev || '') + '\n\n' + String(text)).trim())
            // focus editor if controller available
            try { editorRef.current && editorRef.current.chain().focus().run && editorRef.current.chain().focus() } catch (e) { /* ignore */ }
            setSttInterim('')
          } catch (e) { console.error('insert stt text failed on delayed run', e) }
        }, 150)
        return
      }
      if (!editorRef.current) return
      try {
        // Append recognized final text to html state so it appears at the end
        setHtml(prev => (String(prev || '') + '\n\n' + String(text)).trim())
        try { editorRef.current && editorRef.current.chain().focus() } catch (e) { /* ignore */ }
        setSttInterim('')
      } catch (e) {
        console.error('insert stt text failed', e)
      }
    }
    setOnSttInsert(() => insert)
    return () => setOnSttInsert(null)
  }, [setOnSttInsert, isEditing])

  // expose a request-edit handler so layout can ask this page to enter edit mode and focus end
  useEffect(() => {
    if (typeof setOnRequestEdit !== 'function') return
    const requestEdit = () => {
      if (!isEditing) {
        if (scrollRef.current) lastScrollRef.current = scrollRef.current.scrollTop
        setIsEditing(true)
        setTimeout(() => {
          try {
            const ed = editorRef.current
            if (ed) {
              try { ed.chain().focus() } catch (e) { try { ed.focus && ed.focus() } catch {} }
            }
            // ensure editor scrolls to bottom so caret appears at end
            try { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight } catch (e) {}
          } catch (e) { /* ignore */ }
        }, 120)
      } else {
        try {
          const ed = editorRef.current
          if (ed) {
            try { ed.chain().focus() } catch (e) { try { ed.focus && ed.focus() } catch {} }
            try { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight } catch (e) {}
          }
        } catch (e) { /* ignore */ }
      }
    }
    setOnRequestEdit(() => requestEdit)
    return () => setOnRequestEdit(null)
  }, [setOnRequestEdit, isEditing])

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
          {/* Live interim overlay inside editor (gray example text). Shows while interim exists. */}
          {sttInterim && (
            <div className="stt-interim-overlay" aria-hidden>
              {sttInterim}
            </div>
          )}
        </div>

        {/* 첨부파일 미리보기 */}
        {note.files && note.files.length > 0 && (
          <div className="note-attachments">
            <h3>📎 첨부 파일</h3>
            {note.files.map((file) => {
              if (file.content_type?.startsWith('image/')) {
                return (
                  <div key={file.file_id} className="attachment">
                    <img src={file.url} alt={file.original_name} style={{ maxWidth: '100%', margin: '8px 0' }} />
                  </div>
                )
              }
              if (file.content_type === 'application/pdf') {
                return (
                  <div key={file.file_id} className="attachment">
                    <embed src={file.url} type="application/pdf" width="100%" height="500px" />
                  </div>
                )
              }
              return (
                <div key={file.file_id} className="attachment">
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    {file.original_name}
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
