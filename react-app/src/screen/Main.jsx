// src/screen/Main.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import '../css/Main.css'

export default function MainPage() {
  const navigate = useNavigate()
  const { filter } = useOutletContext()      // ⭐ Layout에서 전달받은 filter
  const [notes, setNotes] = useState([])

  useEffect(() => {
    let url =
      filter === 'recent'
        ? '/api/v1/notes/recent'
        : '/api/v1/notes'

    fetch(`${import.meta.env.VITE_API_BASE_URL}${url}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (filter === 'favorites') {
          setNotes(data.filter(n => n.is_favorite))   // ⭐ 즐겨찾기 필터링
        } else {
          setNotes(data)
        }
      })
  }, [filter])

  return (
    <main className="main-content" style={{ padding: '1rem' }}>
      <section className="main-note-list">
        {notes.map(note => (
          <div
            key={note.id}
            className="main-note-item"
            draggable
            onDragStart={e =>
              e.dataTransfer.setData('noteId', note.id)
            }
            onClick={() => navigate(`/notes/${note.id}`)}
          >
            <h3 className="main-note-title">{note.title}</h3>
            <p className="main-note-preview">
              {note.content?.slice(0, 100) || ''}
            </p>
            <span className="main-note-date">
              {new Date(note.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
      </section>
    </main>
  )
}
