import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import '../css/Main.css'

export default function NoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [note, setNote] = useState(null)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  // 1) 노트 불러오기
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/notes/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then(data => {
        setNote(data)
        setContent(data.content || '')
      })
      .catch(() => {
        alert('노트를 불러올 수 없습니다.')
        navigate('/main')
      })
  }, [id, navigate])

  if (!note) return null

  // 첫 줄이 # 제목 패턴이면 헤딩으로 분리
  const lines = content.split('\n')
  const firstLineMatch = lines[0].match(/^#\s+(.*)/)
  const displayTitle = firstLineMatch ? firstLineMatch[1] : note.title
  const restContent = firstLineMatch ? lines.slice(1).join('\n') : content

  // 2) 저장 핸들러
  const handleSave = async () => {
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
            title: displayTitle,
            content,
            folder_id: note.folder_id  // ✅ 추가!
          })
        }
      )
      if (!res.ok) throw new Error('Save failed')
      const updated = await res.json()
      setNote(updated)
      alert('저장되었습니다.')
    } catch (e) {
      console.error(e)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="main-container">
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* 상단: 자동 제목 + 저장 버튼 */}
        <header className="main-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <h1
            className="note-detail-title"
            style={{ flex: 1, fontSize: '1.5rem', margin: 0, padding: 0 }}
          >
            {displayTitle}
          </h1>
          <button
            className="main-save-btn"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.6rem 1.2rem',
              background: saving ? '#ccc' : '#007aff',
              color: '#fff',
              border: 'none',
              borderRadius: '0.4rem',
              cursor: saving ? 'default' : 'pointer'
            }}
          >
            {saving ? '저장중…' : '💾 저장'}
          </button>
        </header>

        {/* 에디터 + 프리뷰 */}
        <div style={{ display: 'flex', flex: 1, gap: '2rem', overflow: 'hidden' }}>
          {/* Markdown 에디터 */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`# 제목\n## 부제목\n- 리스트\n\
\
\`\`\`js\nconsole.log('코드블럭')\n\`\`\``}
            style={{
              flex: 1,
              padding: '1rem',
              fontFamily: 'SFMono-Regular, Consolas, Menlo, monospace',
              fontSize: '0.9rem',
              border: '1px solid #e0e0e0',
              borderRadius: '0.4rem',
              resize: 'none',
              height: '100%'
            }}
          />

          {/* Markdown 프리뷰 */}
          <div
            className="markdown-body"
            style={{
              flex: 1,
              padding: '1rem',
              border: '1px solid #e0e0e0',
              borderRadius: '0.4rem',
              overflowY: 'auto'
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {restContent}
            </ReactMarkdown>
          </div>
        </div>
      </main>
    </div>
  )
}
