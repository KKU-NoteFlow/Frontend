// src/screen/NoteDetail.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import MarkdownEditor from '../components/MarkdownEditor'
import axios from 'axios'
import '../css/NoteDetail.css'

export default function NoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [note, setNote] = useState(null)
  const [html, setHtml] = useState('')       // 에디터 HTML 상태
  const [saving, setSaving] = useState(false)
  const { setCurrentNote, setOnSummarizeClick, setStatusText } = useOutletContext()

  const token = localStorage.getItem('access_token')
  const API = import.meta.env.VITE_API_BASE_URL

  // 1) 노트 로드
  useEffect(() => {
    fetch(`${API}/api/v1/notes/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setNote(data)
        setCurrentNote(data)
        setHtml(data.contentHTML || data.content || '')  // 기존에 HTML 저장 필드가 있다면, 아니면 Markdown → HTML 처리 필요
      })
      .catch(() => {
        alert('노트를 불러올 수 없습니다.')
        navigate('/main')
      })
  }, [id])

  // 2) 저장
  const handleSave = async () => {
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
          contentHTML: html,      // 서버 스키마에 맞춰서 contentHTML 로 보내세요
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

  // 3) 이미지 업로드 (Tiptap 에디터에 직접 삽입)
  const handleImageUpload = async file => {
    const form = new FormData()
    form.append('upload_file', file)
    form.append('folder_id', note.folder_id)
    const { data } = await axios.post(
      `${API}/api/v1/files/upload`,
      form,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return data.url  // { url, original_name }
  }

  // 4) 스트리밍 요약 핸들러
  const handleSummarize = useCallback(async () => {
    if (!note) return; // 👈 note가 없으면 실행하지 않도록 추가

    setStatusText('⏳ 요약 중…');
    const ctrl = new AbortController();
    try {
      const res = await fetch(`${API}/api/v1/notes/${note.id}/summarize`, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
        },
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', summaryHTML = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Ollama 응답 형식에 맞게 파싱하는 로직이 더 안정적일 수 있습니다.
        buffer.split('\n\n').forEach(chunk => {
          if (chunk.startsWith('data: ')) {
            const txt = chunk.slice(6);
            summaryHTML += `<p>${txt}</p>`;
            setHtml(prev => prev + txt);
          }
        });
      }
      setStatusText('✅ 요약 완료');
    } catch {
      setStatusText('❌ 요약 실패');
    }
  }, [API, token, note, setHtml, setStatusText]); // 👈 함수가 의존하는 모든 외부 변수/상태를 배열에 추가

  // BottomBar 에서 호출할 함수 등록
  useEffect(() => {
    // useCallback으로 감싸진 handleSummarize는 note 상태가 바뀔 때만 변경됩니다.
    if (setOnSummarizeClick) {
      setOnSummarizeClick(() => handleSummarize);
    }
  }, [handleSummarize, setOnSummarizeClick]);

  if (!note) return <div>노트 로드 중…</div>;

  return (
    <div className="note-detail">
     {/* 1) 헤더 영역: 제목 + 저장 버튼 */}
     <div className="note-header">
       <h1 className="note-title">{note.title}</h1>
       <button className="save-btn" onClick={handleSave} disabled={saving}>
         {saving ? '저장중…' : '💾 저장'}
       </button>
     </div>

      {/* 2) 에디터 영역 */}
      <div className="note-editor">
       <MarkdownEditor
        html={html}
        onUpdate={newHtml => setHtml(newHtml)}
        uploadImage={handleImageUpload}  // 여기에 업로드 함수 전달
      />
     </div>
   </div>

  )
}
