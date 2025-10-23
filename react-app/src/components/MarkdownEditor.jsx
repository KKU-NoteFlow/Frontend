// src/components/MarkdownEditor.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

// 단순한 마크다운 에디터: 좌측 textarea, 우측 미리보기
// - 이미지 붙여넣기/드래그앤드롭 시 업로드 후 `![](url)` 삽입
// - onReady로 간단한 컨트롤러를 노출(getHTML, chain().focus().insertContent().run())
export default function MarkdownEditor({ html, onUpdate, uploadImage, onReady }) {
  // `html` prop은 기존 명칭을 유지하지만, 여기서는 마크다운 문자열로 사용합니다.
  const [markdown, setMarkdown] = useState(html || '')
  const textareaRef = useRef(null)

  // 외부에서 값이 바뀌면 동기화
  const toPlainFromHtml = (str) => {
    const s = String(str || '')
    if (!/[<>]/.test(s)) return s
    try {
      return s
        .replace(/\r/g, '')
        .replace(/<br\s*\/>/gi, '\n')
        .replace(/<br\s*>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n')
        .replace(/<li>/gi, '- ')
        .replace(/<pre[^>]*>/gi, '\n```\n')
        .replace(/<\/pre>/gi, '\n```\n')
        .replace(/<code[^>]*>/gi, '`')
        .replace(/<\/code>/gi, '`')
        .replace(/<[^>]+>/g, '')
    } catch {
      return s.replace(/<[^>]+>/g, '')
    }
  }

  useEffect(() => {
    // 서버가 HTML을 주는 경우가 있어, 간단히 텍스트로 정리해서 보여줍니다.
    setMarkdown(toPlainFromHtml(html))
  }, [html])

  const insertAtCursor = (text) => {
    const el = textareaRef.current
    if (!el) {
      const next = (markdown || '') + text
      setMarkdown(next)
      onUpdate?.(next)
      return
    }
    const start = el.selectionStart ?? markdown.length
    const end = el.selectionEnd ?? markdown.length
    const next = (markdown || '').slice(0, start) + text + (markdown || '').slice(end)
    setMarkdown(next)
    onUpdate?.(next)
    // 커서를 삽입한 텍스트 뒤로 이동
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + text.length
      el.setSelectionRange(pos, pos)
    })
  }

  const handleChange = (e) => {
    const value = e.target.value
    setMarkdown(value)
    onUpdate?.(value)
  }

  const handlePaste = async (e) => {
    const files = Array.from(e.clipboardData?.files || [])
    if (files.length === 0) return
    e.preventDefault()
    const file = files[0]
    try {
      const url = await uploadImage?.(file)
      if (url) insertAtCursor(`![](${url})`)
    } catch (err) {
      console.error('[MarkdownEditor] paste upload failed', err)
    }
  }

  const handleDrop = async (e) => {
    const files = Array.from(e.dataTransfer?.files || [])
    if (files.length === 0) return
    e.preventDefault()
    const file = files[0]
    try {
      const url = await uploadImage?.(file)
      if (url) insertAtCursor(`![](${url})`)
    } catch (err) {
      console.error('[MarkdownEditor] drop upload failed', err)
    }
  }

  // TipTap과 호환을 위한 간단한 컨트롤러(shim)
  useEffect(() => {
    if (typeof onReady !== 'function') return
    const controller = {
      // NoteDetail에서 getHTML()을 호출하므로 현재 마크다운 문자열을 반환
      getHTML: () => markdown || '',
      // 체이닝 API 흉내 (focus, insertContent('<p>text</p>'))
      chain: () => {
        const api = {
          focus: () => api,
          insertContent: (htmlStr) => {
            try {
              // 매우 단순한 HTML -> 텍스트 변환: 태그 제거 및 br -> \n 처리
              const text = String(htmlStr || '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]+>/g, '')
              insertAtCursor(text)
            } catch (e) {
              insertAtCursor(String(htmlStr || ''))
            }
            return api
          },
          run: () => {}
        }
        return api
      },
    }
    onReady(controller)
    return () => onReady(null)
  }, [onReady, markdown])

  const Preview = useMemo(() => (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} className="prose">
      {markdown || ''}
    </ReactMarkdown>
  ), [markdown])

  return (
    <div className="markdown-editor" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <textarea
        ref={textareaRef}
        className="nf-textarea"
        style={{ minHeight: 360, resize: 'vertical', width: '100%' }}
        value={markdown}
        onChange={handleChange}
        onPaste={handlePaste}
        onDrop={handleDrop}
        placeholder="여기에 마크다운을 입력하세요..."
      />
      <div className="markdown-preview nf-card" style={{ padding: 12, overflow: 'auto' }}>
        {Preview}
      </div>
    </div>
  )
}
/*
  Component: MarkdownEditor
  Role: Rich text editing with Markdown features (via Tiptap/Milkdown stack if enabled here).
  Note: Pairs with MarkdownViewer for read-only rendering.
*/
