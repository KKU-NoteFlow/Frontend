import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../css/NewNote.css'

export default function NewNotePage() {
  const navigate = useNavigate()
  const [title, setTitle]     = useState('')
  const [content, setContent] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({ title, content })
        }
      )
      if (res.ok) navigate('/main')
      else {
        const { detail } = await res.json()
        alert(detail || '노트 생성 실패')
      }
    } catch {
      alert('서버 연결 실패')
    }
  }

  return (
    <div className="newnote-container">
      <form className="newnote-form" onSubmit={handleSave}>
        <input
          type="text"
          placeholder="제목"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="newnote-title"
        />
        <textarea
          placeholder="내용을 입력하세요"
          value={content}
          onChange={e => setContent(e.target.value)}
          className="newnote-content"
        />
        <div className="newnote-actions">
          <button type="submit" className="newnote-save-btn">저장</button>
          <button
            type="button"
            className="newnote-cancel-btn"
            onClick={() => navigate('/main')}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
