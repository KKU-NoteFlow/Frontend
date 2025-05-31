// src/screen/NoteDetail.jsx

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Editor } from '@toast-ui/react-editor'
import '@toast-ui/editor/dist/toastui-editor.css'

export default function NoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editorRef = useRef()
  const [note, setNote] = useState(null)
  const [saving, setSaving] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const { setCurrentNote } = useOutletContext()

  // 업로드된 파일 목록 상태
  const [files, setFiles] = useState([])

  // 미리보기 상태 (URL, MIME 타입, 파일명)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewType, setPreviewType] = useState(null)
  const [previewName, setPreviewName] = useState(null)

  const token = localStorage.getItem('access_token')

  // 1) 노트 데이터 로드
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/notes/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => {
        setNote(data)
        setCurrentNote(data)
      })
      .catch(() => {
        alert('노트를 불러올 수 없습니다.')
        navigate('/main')
      })
  }, [id, navigate, setCurrentNote, token])

  // 2) 업로드된 파일 목록 로드
  useEffect(() => {
    if (!note) return
    const folderId = note.folder_id
    if (!folderId) {
      setFiles([])
      return
    }

    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/files/list/${folderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => {
        setFiles(data)
      })
      .catch(() => {
        console.error('파일 목록을 불러오는 데 실패했습니다.')
        setFiles([])
      })
  }, [note, token])

  // 3) typeWriter 함수
  function typeWriter(editorRef, fullText, speed = 25, done = () => {}) {
    const inst = editorRef.current?.getInstance()
    if (!inst) return

    let i = 0
    inst.setMarkdown('')
    inst.focus()

    const step = () => {
      i += 1
      inst.setMarkdown(fullText.slice(0, i))
      if (i < fullText.length) {
        setTimeout(step, speed)
      } else {
        done()
      }
    }
    step()
  }

  if (!note) return null

  // 4) 노트 저장 핸들러
  const handleSave = async () => {
    const content = editorRef.current.getInstance().getMarkdown()
    setSaving(true)

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/notes/${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: note.title,
            content,
            folder_id: note.folder_id
          })
        }
      )
      if (!res.ok) throw new Error('Save failed')
      const updated = await res.json()
      setNote(updated)
      setCurrentNote(updated)
      alert('저장되었습니다.')
    } catch {
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 5) 노트 요약 핸들러
  const handleSummarize = async () => {
    setSummarizing(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/notes/${id}/summarize`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      if (!res.ok) throw new Error('Summarize failed')
      const updated = await res.json()
      setNote(updated)
      setCurrentNote(updated)

      setTimeout(() => {
        typeWriter(editorRef, updated.content ?? '', 20, () => setSummarizing(false))
      }, 150)
    } catch {
      alert('요약에 실패했습니다.')
      setSummarizing(false)
    }
  }

  // 6) 파일 클릭 시 미리보기 핸들러
  const handleFileClick = async (file_id, original_name, content_type) => {
    try {
      // 인증 없이 열리는 엔드포인트 호출
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/files/download/${file_id}`
      )
      if (!res.ok) {
        console.error('파일 로드 실패', res.status, await res.text())
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)

      setPreviewUrl(url)
      setPreviewType(content_type)
      setPreviewName(original_name)
    } catch (err) {
      console.error('미리보기 중 예외', err)
    }
  }

  // 7) 미리보기 닫기
  const closePreview = () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewType(null)
    setPreviewName(null)
  }

  return (
    <div className="main-container">
      <main className="main-content" style={{ padding: '1rem' }}>
        {/* 노트 제목 + 버튼 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}
        >
          <h1 style={{ flex: 1, fontSize: '1.5rem', margin: 0 }}>
            {note.title}
          </h1>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.6rem 1.2rem',
              background: saving ? '#ccc' : '#007aff',
              color: '#fff',
              border: 'none',
              borderRadius: '0.4rem'
            }}
          >
            {saving ? '저장중…' : '💾 저장'}
          </button>

          <button
            onClick={handleSummarize}
            disabled={summarizing}
            style={{
              padding: '0.6rem 1.2rem',
              background: summarizing ? '#ccc' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '0.4rem'
            }}
          >
            {summarizing ? '요약중…' : '🧠 요약'}
          </button>
        </div>

        {/* 토스트UI 에디터 */}
        <Editor
          key={id}
          ref={editorRef}
          initialValue={note.content ?? ''}
          previewStyle="vertical"
          height="600px"
          initialEditType="markdown"
          useCommandShortcut={true}
        />

        {/* 업로드된 파일 목록 */}
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>
            🗂️ 업로드된 파일 ({files.length})
          </h3>
          <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
            {files.map(f => (
              <li
                key={f.file_id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  background: '#f9f9f9',
                  borderRadius: '0.4rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onClick={() =>
                  handleFileClick(f.file_id, f.original_name, f.content_type)
                }
                onMouseOver={e => (e.currentTarget.style.background = '#eef')}
                onMouseOut={e => (e.currentTarget.style.background = '#f9f9f9')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* 파일 아이콘 */}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#555"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span style={{ fontSize: '1rem', color: '#333' }}>
                    {f.original_name}
                  </span>
                </div>
                <small style={{ color: '#777', marginTop: '0.25rem' }}>
                  {new Date(f.created_at).toLocaleString()}
                </small>
              </li>
            ))}
          </ul>
        </div>

        {/* 미리보기 모달 (다운로드 기능 없음) */}
        {previewUrl && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={closePreview}
          >
            <div
              style={{
                position: 'relative',
                width: '80%',
                maxWidth: '900px',
                height: '80%',
                background: '#fff',
                borderRadius: '0.4rem',
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* 닫기 버튼 */}
              <button
                onClick={closePreview}
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>

              {/* 이미지 미리보기 */}
              {previewType.startsWith('image/') && (
                <img
                  src={previewUrl}
                  alt={previewName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    background: '#000'
                  }}
                />
              )}

              {/* PDF 미리보기 */}
              {previewType === 'application/pdf' && (
                <iframe
                  src={previewUrl}
                  title={previewName}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                />
              )}

              {/* 그 외 파일: 미리보기 없음 메시지 */}
              {!previewType.startsWith('image/') &&
                previewType !== 'application/pdf' && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      padding: '1rem',
                      textAlign: 'center'
                    }}
                  >
                    <p style={{ color: '#333' }}>
                      미리보기를 지원하지 않는 파일 형식입니다.
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
