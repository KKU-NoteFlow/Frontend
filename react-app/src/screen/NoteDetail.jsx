import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Editor } from '@toast-ui/react-editor'
import '@toast-ui/editor/dist/toastui-editor.css'

// 한 글자씩 입력하는 함수
function typeWriter(editorRef, fullText, speed = 25, done = () => {}) {
  const inst = editorRef.current?.getInstance()
  if (!inst) return

  let i = 0
  inst.setMarkdown('')                // 빈 화면으로 초기화
  inst.focus()

  const step = () => {
    i += 1
    inst.setMarkdown(fullText.slice(0, i))  // 지금까지의 글자를 통째로 렌더
    if (i < fullText.length) {
      setTimeout(step, speed)
    } else {
      done()
    }
  }
  step()
}

export default function NoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editorRef = useRef()
  const [note, setNote] = useState(null)
  const [saving, setSaving] = useState(false)
  const [summarizing, setSum] = useState(false)
  const { setCurrentNote } = useOutletContext()

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/notes/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setNote(data)
        setCurrentNote(data)
      })
      .catch(() => {
        alert('노트를 불러올 수 없습니다.')
        navigate('/main')
      })
  }, [id, navigate])

  if (!note) return null

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
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
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

  const handleSummarize = async () => {
    setSum(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/notes/${id}/summarize`,
        { method: 'POST',
          headers:{ Authorization:`Bearer ${localStorage.getItem('access_token')}` } }
      )
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setNote(updated)
      setCurrentNote(updated)

      /* typewriter 효과 */
      setTimeout(() => {
        typeWriter(editorRef, updated.content ?? '', 20, () => setSum(false))
      }, 150)         // 에디터 렌더링이 끝난 뒤 실행
    } catch {
      alert('요약 실패')
      setSum(false)
    }
  }

  if (!note) return null

  return (
    <div className="main-container">
      <main className="main-content" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <h1 style={{ flex: 1, fontSize: '1.5rem', margin: 0 }}>{note.title}</h1>

          {/* 저장 버튼 */}
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
        </div>

        <Editor
          key={id}
          ref={editorRef}
          initialValue={note.content ?? ''}
          previewStyle="vertical"
          height="600px"
          initialEditType="markdown"
          useCommandShortcut={true}
        />
      </main>
    </div>
  )
}
