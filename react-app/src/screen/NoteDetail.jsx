// src/screen/NoteDetail.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Editor } from '@toast-ui/react-editor'
import '@toast-ui/editor/dist/toastui-editor.css'
import axios from 'axios'

export default function NoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editorRef = useRef(null)
  const [note, setNote] = useState(null)
  const [saving, setSaving] = useState(false)
  const { setCurrentNote } = useOutletContext()

  const token = localStorage.getItem('access_token')
  const API = import.meta.env.VITE_API_BASE_URL

  // ────────────────────────────────────────────────────────────────
  // 1) 노트 로드
  // ────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  
  useEffect(() => {
    setNote(null)
    fetch(`${API}/api/v1/notes/${id}`, {
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
  }, [id, API, token, navigate, setCurrentNote])

  // ────────────────────────────────────────────────────────────────
  // 2) 에디터에 내용 덮어쓰기
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!note || !editorRef.current) return
    const ed = editorRef.current.getInstance()
    ed.setMarkdown(note.content ?? '')
  }, [note])

  // ────────────────────────────────────────────────────────────────
  // 3) 저장 핸들러
  // ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editorRef.current) return
    setSaving(true)
    const content = editorRef.current.getInstance().getMarkdown()
    try {
      const res = await fetch(`${API}/api/v1/notes/${id}`, {
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
      })
      if (!res.ok) throw new Error()
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

  // ────────────────────────────────────────────────────────────────
  // 4) 파일 업로드 + 에디터에 즉시 삽입
  // ────────────────────────────────────────────────────────────────
  const uploadAndInsertImage = async file => {
    const form = new FormData()
    form.append('upload_file', file, file.name)
    try {
      const { data } = await axios.post(
        `${API}/api/v1/files/upload`,
        form,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      )
      // 백엔드가 { url, original_name } 형태로 반환했다고 가정
      const { url, original_name } = data
      const ed = editorRef.current.getInstance()
      // WYSIWYG 모드에서 즉시 <img> 삽입
      ed.exec('AddImage', { imageUrl: url, altText: original_name })
    } catch (err) {
      console.error(err)
      alert('.')
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 5) 드래그&드롭 처리
  // ────────────────────────────────────────────────────────────────
  const handleDragOver = e => {
    e.preventDefault()
  }
  const handleDrop = async e => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      await uploadAndInsertImage(file)
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 6) 툴바/Paste 이미지 업로드 훅 유지
  // ────────────────────────────────────────────────────────────────
  const onImageUploadHook = async (blob, callback) => {
    const file = new File([blob], blob.name || `image-${Date.now()}.png`, { type: blob.type })
    await uploadAndInsertImage(file)
    // 마크다운 모드 일 때도 삽입할 수 있게 콜백 호출
    callback(URL.createObjectURL(blob), file.name)
    return false
  }

  if (!note) {
    return <div style={{ padding: '1rem' }}>노트 로드 중…</div>
  }

  return (
    <div className="main-container">
      <main className="main-content" style={{ padding: '1rem' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <h1 style={{ flex: 1, margin: 0, fontSize: '1.5rem' }}>{note.title}</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '.6rem 1.2rem',
              background: saving ? '#ccc' : '#007aff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            {saving ? '저장중…' : '💾 저장'}
          </button>
        </div>

        {/* 드래그&드롭 컨테이너 */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            border: '1px dashed #ddd',
            borderRadius: '4px',
            overflow: 'hidden'
          }}
        >
          <Editor
            ref={editorRef}
            initialValue={note.content ?? ''}
            height="100vh"
            initialEditType="wysiwyg"
            hideModeSwitch={true}
            toolbarItems={[]}       
            useCommandShortcut={true}
            hooks={{ addImageBlobHook: onImageUploadHook }}
          />
        </div>
      </main>
    </div>
  )
}
