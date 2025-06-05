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
  const [summarizing, setSummarizing] = useState(false)
  const { setCurrentNote } = useOutletContext()
  const [files, setFiles] = useState([])
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewType, setPreviewType] = useState(null)
  const [previewName, setPreviewName] = useState(null)

  const token = localStorage.getItem('access_token')

  // ────────────────────────────────────────────────────────────────
  // 1) 노트 데이터 로드 (id가 바뀔 때마다 호출)
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setNote(null) // 로딩 중 빈 화면 방지
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

  // ────────────────────────────────────────────────────────────────
  // 2) 업로드된 파일 목록 로드 (note.folder_id가 바뀔 때마다)
  // ────────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────────
  // 3) note.content가 바뀔 때마다 에디터에 내용 덮어쓰기
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!note || !editorRef.current) return
    const editorInstance = editorRef.current.getInstance()
    // 노트 내용을 Markdown 형태로 에디터에 설정
    editorInstance.setMarkdown(note.content ?? '')
  }, [note])

  // ────────────────────────────────────────────────────────────────
  // 4) 노트 저장 핸들러
  // ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editorRef.current) return
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

  // ────────────────────────────────────────────────────────────────
  // 5) 노트 요약 핸들러
  // ────────────────────────────────────────────────────────────────
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

      // 타입라이터 효과로 요약 결과를 타이핑
      setTimeout(() => {
        const editorInstance = editorRef.current.getInstance()
        let i = 0
        const fullText = updated.content ?? ''
        editorInstance.setMarkdown('')
        const step = () => {
          i += 1
          editorInstance.setMarkdown(fullText.slice(0, i))
          if (i < fullText.length) {
            setTimeout(step, 20)
          } else {
            setSummarizing(false)
          }
        }
        step()
      }, 150)
    } catch {
      alert('요약에 실패했습니다.')
      setSummarizing(false)
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 6) 이미지 업로드 훅
  // ────────────────────────────────────────────────────────────────
  const onImageUploadHook = async (blob, callback) => {
    try {
      const formData = new FormData()
      formData.append('upload_file', blob, blob.name || 'image.png')
      // 필요하다면 note.folder_id도 함께 보낼 수 있습니다.
      // formData.append('folder_id', note.folder_id)

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/files/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      )
      if (res.status !== 200 && res.status !== 201) {
        throw new Error('업로드 실패')
      }
      // 백엔드가 { url, original_name, ... } 형태로 응답했을 때
      const { url, original_name } = res.data
      callback(url, original_name)
    } catch (err) {
      console.error('이미지 업로드 중 오류', err)
      alert('이미지 업로드에 실패했습니다.')
    }
  }

  if (!note) {
    // note가 아직 로드되지 않았으면 로딩 중 표시하거나 빈화면을 내보내도 좋습니다.
    return <div style={{ padding: '1rem' }}>노트 로드 중…</div>
  }

  return (
    <div className="main-container">
      <main className="main-content" style={{ padding: '1rem' }}>
        {/* 제목 + 저장 버튼 */}
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

          {/* 요약 버튼 예시 (필요하면 사용) */}
          {/* <button
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
          </button> */}
        </div>

        {/* Toast UI Editor */}
        <Editor
          ref={editorRef}
          initialValue={note.content ?? ''}
          previewStyle="none"    // 미리보기 제거
          height="100vh"         // 화면 전체 높이
          initialEditType="markdown"
          useCommandShortcut={true}
          hideModeSwitch={true}  // 하단 Markdown/WYSIWYG 토글 숨김
          toolbarItems={[]}      // 툴바 완전 제거(필요하면 다시 채워도 됩니다)
          hooks={{
            addImageBlobHook: onImageUploadHook
          }}
        />

        {/* 여기에 파일 목록이나 미리보기 코드가 필요하다면 추가 */}
      </main>
    </div>
  )
}
