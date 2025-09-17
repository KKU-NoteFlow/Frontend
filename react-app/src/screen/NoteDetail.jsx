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
  const { setCurrentNote, setOnSummarizeClick, setStatusText } = useOutletContext()

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
      const res = await fetch(`${API}/api/v1/notes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: note.title,
          contentHTML: html,
          folder_id: note.folder_id
        })
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setNote(updated)
      setCurrentNote?.(updated)
      alert('저장되었습니다.')
    } catch {
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

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
          />
        </div>
      </div>
    </div>
  )
}
