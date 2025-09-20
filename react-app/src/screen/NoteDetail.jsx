// src/screen/NoteDetail.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import MarkdownEditor from '../components/MarkdownEditor'
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
  const { setCurrentNote, setOnSummarizeClick, setOnSttInsert, setOnSttInterimInsert, setStatusText, isRecording } = useOutletContext()

  const editorRef = React.useRef(null)
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
        setHtml(data.contentHTML || data.content || '')
      })
      .catch((err) => {
        if (err && err.message === 'Unauthorized') return
        console.error('[NoteDetail] 노트 불러오기 실패:', err)
        alert('노트를 불러올 수 없습니다.')
        navigate('/main')
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
      // prefer the editor's current HTML (ensure latest content)
      const contentToSave = editorRef.current ? editorRef.current.getHTML() : html

      const res = await fetch(`${API}/api/v1/notes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
      body: JSON.stringify({
          title: note.title,
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
      // sync editor/html state with server truth
      const newHtml = updated.contentHTML || updated.content || contentToSave
      setHtml(newHtml)
      setLastSavedHtml(newHtml)
      alert('저장되었습니다.')
    } catch (e) {
      console.error('[NoteDetail] save exception', e)
      alert('저장에 실패했습니다. 콘솔을 확인하세요.')
    } finally {
      setSaving(false)
    }
  }

  // Auto-save: every 5 minutes (300000ms) when note is open; save only if changed
  const [lastSavedHtml, setLastSavedHtml] = useState(html)
  useEffect(() => {
    setLastSavedHtml(html)
  }, [html])

  useEffect(() => {
    let timer = null
    const intervalMs = 1000 * 60 * 5 // 5 minutes
    const doAutoSave = async () => {
      if (!note) return
      // use editor content if available
      const contentToCheck = editorRef.current ? editorRef.current.getHTML() : html
      if (contentToCheck === lastSavedHtml) return
      try {
        setStatusText?.('자동 저장 중...')
        const res = await fetch(`${API}/api/v1/notes/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ title: note.title, content: contentToCheck, folder_id: note.folder_id })
        })
        if (!res.ok) throw new Error('autosave failed')
        const updated = await res.json()
        setNote(updated)
        setCurrentNote?.(updated)
        setLastSavedHtml(contentToCheck)
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
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (!res.ok) throw new Error()
      setStatusText?.('✅ 요약 완료')
    } catch {
      setStatusText?.('❌ 요약 실패')
    }
  }, [API, token, note, setStatusText])

  useEffect(() => {
    setOnSummarizeClick?.(() => handleSummarize)
  }, [handleSummarize, setOnSummarizeClick])

  // expose STT-insert function to layout so live STT can append text into the editor
  useEffect(() => {
    if (typeof setOnSttInsert !== 'function') return
    const insert = (text) => {
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
  }, [setOnSttInsert])

  // register interim updater
  useEffect(() => {
    if (typeof setOnSttInterimInsert !== 'function') return
    const interimUpdater = (text) => setSttInterim(String(text || ''))
    setOnSttInterimInsert(() => interimUpdater)
    return () => setOnSttInterimInsert(null)
  }, [setOnSttInterimInsert])


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
            <h1 className="note-title">{note.title}</h1>
            <div className="note-meta">{new Date(note.created_at).toLocaleString()}</div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '저장중…' : '💾 저장'}
          </Button>
        </div>

        <div className="note-editor">
          <MarkdownEditor
            html={html}
            onUpdate={newHtml => setHtml(newHtml)}
            uploadImage={handleImageUpload}
            onReady={(ed) => { editorRef.current = ed }}
          />
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
