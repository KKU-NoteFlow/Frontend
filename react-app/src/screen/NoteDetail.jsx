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
  const {
    setCurrentNote,
    setOnSummarizeClick,
    setOnSttInsert,
    setOnSttInterimInsert,
    setStatusText,
    isRecording,
    setOpProgress,
    setOnRequestEdit,
    // Layout에서 제공하는 즐겨찾기 토글 (현재 노트 기준)
    toggleFavorite
  } = useOutletContext()

  const editorRef = React.useRef(null)
  const scrollRef = React.useRef(null)
  const lastScrollRef = React.useRef(0)
  const [sttInterim, setSttInterim] = useState('')

  const token = localStorage.getItem('access_token')
  const API = import.meta.env.VITE_API_BASE_URL ?? ''

  // 노트 로드
  useEffect(() => {
    fetch(`${API}/api/v1/notes/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        if (res.status === 401) {
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
        setHtml(data.content || data.contentHTML || '')
        setTitleText(data.title || '')
        setIsEditing(false)
      })
      .catch((err) => {
        if (err && err.message === 'Unauthorized') return
        console.error('[NoteDetail] 노트 불러오기 실패:', err)
        alert('노트를 불러올 수 없습니다. 페이지에서 다시 시도해 주세요.')
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
        let body = ''
        try { body = await res.text() } catch (e) { body = String(e) }
        console.error('[NoteDetail] save failed', res.status, body)
        alert(`저장에 실패했습니다. 서버 응답: ${res.status} ${body}`)
        return
      }

      const updated = await res.json()
      setNote(updated)
      setCurrentNote?.(updated)
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
    setHtml(lastSavedHtml)
    setTitleText(note?.title || '')
    setIsEditing(false)
  }

  // 자동 저장
  const [lastSavedHtml, setLastSavedHtml] = useState(html)
  useEffect(() => { setLastSavedHtml(html) }, [html])

  useEffect(() => {
    let timer = null
    const intervalMs = 1000 * 60 * 5
    const doAutoSave = async () => {
      if (!note) return
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
    return () => { if (timer) clearInterval(timer) }
  }, [html, lastSavedHtml, note, API, token, id, setCurrentNote, setStatusText])

  // 이미지 업로드
  const handleImageUpload = async file => {
    const form = new FormData()
    form.append('upload_file', file)
    form.append('note_id', note?.id ?? '')
    const { data } = await axios.post(
      `${API}/api/v1/files/upload`,
      form,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return data.url
  }

  // 요약
  const handleSummarize = useCallback(async () => {
    if (!note) return
    setStatusText?.('⏳ 요약 중…')
    try {
      try { setOpProgress?.({ visible: true, label: '요약 중…', value: 5 }) } catch {}
      const res = await fetch(`${API}/api/v1/notes/${note.id}/summarize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('summarize start failed')

      if (res.body && res.body.getReader) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let done = false
        let buffered = ''
        let heuristicVal = 5
        const heuristicInterval = setInterval(() => {
          try {
            if (!setOpProgress) return
            heuristicVal = Math.min(85, heuristicVal + 1)
            setOpProgress(prev => ({ visible: true, label: prev?.label || '요약 중…', value: heuristicVal }))
          } catch (e) {}
        }, 700)

        try {
          while (!done) {
            const r = await reader.read()
            done = r.done
            if (r.value) {
              const chunk = decoder.decode(r.value, { stream: true })
              buffered += chunk
              const parts = buffered.split(/\n\n/)
              buffered = parts.pop() || ''
              for (const part of parts) {
                const lines = part.split(/\n/).map(l => l.trim()).filter(Boolean)
                for (const line of lines) {
                  let content = line
                  if (line.startsWith('data:')) content = line.replace(/^data:\s*/, '')
                  try {
                    const obj = JSON.parse(content)
                    const pct = obj.progress ?? obj.percent ?? obj.pct ?? obj.value
                    if (typeof pct === 'number' && setOpProgress) {
                      const v = Math.max(0, Math.min(100, Math.round(pct)))
                      setOpProgress({ visible: true, label: obj.message || '요약 중…', value: v })
                      continue
                    }
                    if (obj.message && setOpProgress) {
                      setOpProgress(prev => ({ visible: true, label: obj.message, value: prev?.value || 10 }))
                      continue
                    }
                  } catch {}
                  const m = content.match(/(\d{1,3})\s*%/)
                  if (m && setOpProgress) {
                    const v = Math.max(0, Math.min(100, parseInt(m[1], 10)))
                    setOpProgress({ visible: true, label: '요약 진행', value: v })
                    continue
                  }
                  if (setOpProgress) setOpProgress(prev => ({ visible: true, label: content.slice(0, 80), value: prev?.value || 10 }))
                }
              }
            }
          }
        } finally {
          clearInterval(heuristicInterval)
        }
      } else {
        try { await res.text() } catch {}
      }

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

      try { setOpProgress?.({ visible: true, label: '완료', value: 100 }) } catch {}
      setTimeout(() => { try { setOpProgress?.({ visible: false, label: '', value: 0 }) } catch {} }, 700)
      setStatusText?.('✅ 요약 완료')
    } catch (e) {
      console.error('[summarize] failed', e)
      try { setOpProgress?.({ visible: false, label: '', value: 0 }) } catch {}
      setStatusText?.('❌ 요약 실패')
    }
  }, [API, token, note, setStatusText, setCurrentNote])

  useEffect(() => { setOnSummarizeClick?.(() => handleSummarize) }, [handleSummarize, setOnSummarizeClick])

  // STT 삽입기 등록
  useEffect(() => {
    if (typeof setOnSttInsert !== 'function') return
    const insert = (text) => {
      if (!isEditing) {
        if (scrollRef.current) lastScrollRef.current = scrollRef.current.scrollTop
        setIsEditing(true)
        setTimeout(() => {
          try {
            setHtml(prev => (String(prev || '') + '\n\n' + String(text)).trim())
            try { editorRef.current && editorRef.current.chain().focus().run && editorRef.current.chain().focus() } catch {}
            setSttInterim('')
          } catch (e) { console.error('insert stt text failed on delayed run', e) }
        }, 150)
        return
      }
      if (!editorRef.current) return
      try {
        setHtml(prev => (String(prev || '') + '\n\n' + String(text)).trim())
        try { editorRef.current && editorRef.current.chain().focus() } catch {}
        setSttInterim('')
      } catch (e) { console.error('insert stt text failed', e) }
    }
    setOnSttInsert(() => insert)
    return () => setOnSttInsert(null)
  }, [setOnSttInsert, isEditing])

  // 편집 모드 요청기
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
            try { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight } catch {}
          } catch (e) {}
        }, 120)
      } else {
        try {
          const ed = editorRef.current
          if (ed) {
            try { ed.chain().focus() } catch (e) { try { ed.focus && ed.focus() } catch {} }
            try { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight } catch (e) {}
          }
        } catch (e) {}
      }
    }
    setOnRequestEdit(() => requestEdit)
    return () => setOnRequestEdit(null)
  }, [setOnRequestEdit, isEditing])

  // 임시 텍스트
  useEffect(() => {
    if (typeof setOnSttInterimInsert !== 'function') return
    const interimUpdater = (text) => setSttInterim(String(text || ''))
    setOnSttInterimInsert(() => interimUpdater)
    return () => setOnSttInterimInsert(null)
  }, [setOnSttInterimInsert])

  const handleDblClick = () => {
    if (!isEditing) {
      if (scrollRef.current) lastScrollRef.current = scrollRef.current.scrollTop
      setIsEditing(true)
    }
  }

  useEffect(() => {
    if (!scrollRef.current) return
    const y = lastScrollRef.current || 0
    requestAnimationFrame(() => { try { scrollRef.current.scrollTop = y } catch {} })
  }, [isEditing])

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA'
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (isEditing && !saving) handleSave()
        return
      }
      if (e.key === 'Escape' && isEditing) {
        e.preventDefault()
        handleCancelEdit()
        return
      }
      if (!isEditing && !isInput && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        if (scrollRef.current) lastScrollRef.current = scrollRef.current.scrollTop
        setIsEditing(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isEditing, saving])

  // ✅ NoteDetail 내 즐겨찾기 토글 (편집/저장 버튼 옆)
  const handleToggleFavoriteHere = async () => {
    if (!note) return
    try {
      // 즉시 UI 반영
      setNote(prev => ({ ...prev, is_favorite: !prev.is_favorite }))
      setCurrentNote?.({ ...note, is_favorite: !note.is_favorite })
      // Layout에 있는 API 토글 호출(백엔드 동기화)
      if (typeof toggleFavorite === 'function') {
        await toggleFavorite()
      } else {
        // 안전망: 직접 API 호출
        const res = await fetch(`${API}/api/v1/notes/${note.id}/favorite`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ is_favorite: !note.is_favorite })
        })
        if (!res.ok) {
          console.error('[NoteDetail] toggleFavorite fallback failed', await res.text())
          // 실패 시 롤백
          setNote(prev => ({ ...prev, is_favorite: note.is_favorite }))
          setCurrentNote?.(note)
          alert('즐겨찾기 변경 실패')
        } else {
          const updated = await res.json()
          setNote(updated)
          setCurrentNote?.(updated)
        }
      }
    } catch (e) {
      console.error('[NoteDetail] toggleFavorite exception', e)
      setNote(prev => ({ ...prev, is_favorite: note.is_favorite }))
      setCurrentNote?.(note)
      alert('즐겨찾기 처리 중 오류가 발생했습니다.')
    }
  }

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
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => { if (scrollRef.current) lastScrollRef.current = scrollRef.current.scrollTop; setIsEditing(true) }}>
                ✏️ 편집
              </Button>
              {/* ✅ 노트 화면에서 즐겨찾기 토글 */}
              <button
                className="nf-btn"
                onClick={handleToggleFavoriteHere}
                title={note.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                aria-label={note.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                style={{ minWidth: 44 }}
              >
                {note.is_favorite ? '★ 즐겨찾기' : '☆ 즐겨찾기'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? '저장중…' : '💾 저장'}
              </Button>
              <button className="nf-btn" onClick={handleCancelEdit} type="button">취소</button>
              {/* 편집 중에도 즐겨찾기 가능 */}
              <button
                className="nf-btn"
                onClick={handleToggleFavoriteHere}
                title={note.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                aria-label={note.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
              >
                {note.is_favorite ? '★' : '☆'}
              </button>
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
          {sttInterim && (
            <div className="stt-interim-overlay" aria-hidden>
              {sttInterim}
            </div>
          )}
        </div>

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
