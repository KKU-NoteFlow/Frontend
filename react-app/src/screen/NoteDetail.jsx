import React, { useState, useEffect } from 'react'
import { useParams, useNavigate }      from 'react-router-dom'
import Sidebar                          from '../components/Sidebar'
import '../css/Main.css'                // 메인과 같은 레이아웃, 스타일 재사용

export default function NoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [note, setNote] = useState(null)

  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/v1/notes/${id}`, 
      { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
    )
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then(setNote)
      .catch(() => {
        alert('노트를 불러올 수 없습니다.')
        navigate('/main')
      })
  }, [id])

  if (!note) return null

  return (
    <div className="main-container">
      <Sidebar onFilterChange={() => {}} /> {/* 필터 없이 그냥 내비 */}
      <main className="main-content">
        <header className="main-header">
          <button className="main-new-note-btn" onClick={() => navigate('/notes/new')}>
            + 새 노트
          </button>
          <input
            className="main-search"
            type="text"
            placeholder="🔍 노트 검색"
            onChange={e => {}}
            disabled
          />
        </header>
        <article className="note-detail">
          <h1 className="note-detail-title">{note.title}</h1>
          <div className="note-detail-meta">
            {new Date(note.created_at).toLocaleDateString()}
          </div>
          <div className="note-detail-content">
            {note.content?.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </article>
      </main>
    </div>
  )
}
