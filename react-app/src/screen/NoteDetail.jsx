import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Editor } from '@toast-ui/react-editor'
import '@toast-ui/editor/dist/toastui-editor.css'
import TopBar from '../components/Topbar'

export default function NoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editorRef = useRef()
  const [note, setNote] = useState(null)
  const [saving, setSaving] = useState(false)
  const [theme, setTheme] = useState('light')  // 기본값은 light
  const { setCurrentNote, toggleFavorite } = useOutletContext()


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
    const instance = editorRef.current.getInstance()
    const content = instance.getMarkdown()

    setSaving(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/notes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          title: note.title,  // 제목은 자동 추출 안 할 경우 기존 title 유지
          content,
          folder_id: note.folder_id
        })
      })
      if (!res.ok) throw new Error('Save failed')
      const updated = await res.json()
      setNote(updated)
      setCurrentNote(updated)
      alert('저장되었습니다.')
    } catch (e) {
      console.error(e)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFavorite = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/notes/${note.id}/favorite`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ is_favorite: !note.is_favorite })
    })

    if (res.ok) {
      const updated = await res.json()
      setNote(updated)
      setCurrentNote(updated)
    }
  }

  return (
    <div className="main-container">
      <main className="main-content" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <h1 style={{ flex: 1, fontSize: '1.5rem', margin: 0 }}>{note.title}</h1>
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
          {/* 다크모드 하고싶어서 버튼 만듦 근데 패키지 의존성 문제로 보류 */}
          {/* <button
            onClick={() => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '0.4rem 0.8rem',
              cursor: 'pointer',
              color: theme === 'dark' ? '#fff' : '#000',
              backgroundColor: theme === 'dark' ? '#333' : '#f9f9f9'
            }}
          >
            {theme === 'dark' ? '🌞 Light Mode' : '🌙 Dark Mode'}
          </button> */}

        </div>

        <Editor
          key={id}
          ref={editorRef}
          initialValue={note.content || ''}
          previewStyle="vertical"
          height="600px"
          initialEditType="wysiwyg"
          useCommandShortcut={true}
          // theme={theme} //다크모드
        />
      </main>
    </div>
  )
}
