// src/screen/NoteDetail.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Editor } from '@toast-ui/react-editor'
import '@toast-ui/editor/dist/toastui-editor.css'
import axios from 'axios'
import { Button, Skeleton, Tabs, Chip, Badge, Card } from '../ui'
import '../css/Editor.css'
import { useSearchParams } from 'react-router-dom'

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

  const [searchParams, setSearchParams] = useSearchParams()
  const defaultTab = searchParams.get('panel') || 'summary'
  const [panelTab, setPanelTab] = useState(defaultTab)

  useEffect(() => { setPanelTab(searchParams.get('panel') || 'summary') }, [searchParams])

  if (!note) {
    return (
      <div className="nf-container" style={{ paddingTop: 'var(--nf-space-4)' }}>
        <Skeleton height={28} style={{ width: 240, marginBottom: 12 }} />
        <Skeleton height={48} />
      </div>
    )
  }

  return (
    <div className="main-container">
      <main className="main-content nf-container" style={{ paddingTop: 'var(--nf-space-4)' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
          <h1 style={{ flex: 1, margin: 0, fontSize: 'var(--nf-font-2xl)', color: 'var(--nf-text)' }}>{note.title}</h1>
          <Button onClick={handleSave} disabled={saving} variant="primary">
            {saving ? '저장중…' : '💾 저장'}
          </Button>
        </div>

        <div className="editor-layout">
          {/* 좌측 본문: 드래그&드롭 컨테이너 */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
              border: '1px dashed var(--nf-border)',
              borderRadius: 'var(--nf-radius-md)',
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

          {/* 우측 패널: 요약/키포인트/문제 프리뷰 */}
          <aside className="editor-aside">
            <Card className="editor-panel">
              <Tabs
                tabs={[{ id: 'summary', label: '요약' }, { id: 'key', label: '키포인트' }, { id: 'quiz', label: '문제' }]}
                value={panelTab}
                onChange={(id) => {
                  setPanelTab(id)
                  const next = new URLSearchParams(searchParams)
                  next.set('panel', id)
                  setSearchParams(next, { replace: true })
                }}
              />
              <div style={{ display: 'grid', gap: 12 }}>
                {/* 요약 섹션 */}
                {panelTab === 'summary' && (<div>
                  <h4 style={{ margin: '8px 0' }}>요약</h4>
                  <div style={{ color: 'var(--nf-text)' }}>
                    {(note.summary && String(note.summary).trim()) ? (
                      <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{String(note.summary)}</pre>
                    ) : (
                      <p className="editor-meta">요약이 없습니다. 하단 작업에서 요약을 실행해 보세요.</p>
                    )}
                  </div>
                </div>)}
                {/* 키포인트 */}
                {panelTab === 'key' && (<div>
                  <h4 style={{ margin: '8px 0' }}>키포인트</h4>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Array.isArray(note.key_points) && note.key_points.length > 0 ? (
                      note.key_points.map((k, i) => <Chip key={i}>{k}</Chip>)
                    ) : (
                      <span className="editor-meta">표시할 키포인트가 없습니다.</span>
                    )}
                  </div>
                </div>)}
                {/* 문제 프리뷰 */}
                {panelTab === 'quiz' && (<div>
                  <h4 style={{ margin: '8px 0' }}>연관 문제</h4>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {Array.isArray(note.quizzes) && note.quizzes.length > 0 ? (
                      note.quizzes.slice(0, 5).map((q, i) => (
                        <div key={i} style={{ border: '1px solid var(--nf-border)', borderRadius: 8, padding: 8 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{q.question || `문제 ${i + 1}`}</div>
                          {Array.isArray(q.options) && q.options.length > 0 && (
                            <ul style={{ margin: 0, paddingLeft: 16 }}>
                              {q.options.slice(0,4).map((o, oi) => <li key={oi}>{o}</li>)}
                            </ul>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="editor-meta">생성된 문제가 없습니다.</p>
                    )}
                  </div>
                </div>)}
              </div>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  )
}
