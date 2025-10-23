// src/components/MarkdownViewer.jsx
import React, { useMemo, useRef, useEffect } from 'react'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

export default function MarkdownViewer({ content }) {
  const md = useMemo(() => {
    const escapeHtml = (s) => String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return new MarkdownIt({
      html: false,       // Do not render raw HTML (safe)
      linkify: true,
      breaks: true,
      typographer: true,
      highlight: (str, lang) => {
        try {
          if (lang && hljs.getLanguage(lang)) {
            return `<pre class="hljs"><code>` + hljs.highlight(str, { language: lang }).value + '</code></pre>'
          }
          return `<pre class="hljs"><code>` + escapeHtml(str) + '</code></pre>'
        } catch {
          return `<pre class="hljs"><code>` + escapeHtml(str) + '</code></pre>'
        }
      }
    })
  }, [])

  const rendered = useMemo(() => md.render(String(content || '')), [content, md])

  const contentRef = useRef(null)

  useEffect(() => {
    if (!contentRef.current) return
    const imgs = Array.from(contentRef.current.querySelectorAll('img'))
    if (imgs.length === 0) return
    const API = import.meta.env.VITE_API_BASE_URL ?? ''
    const token = localStorage.getItem('access_token')
    const createdUrls = []
    const controllers = []

    imgs.forEach(img => {
      try {
        const src = img.getAttribute('src') || ''
        // If image src points to backend download endpoint on same API base,
        // fetch it with Authorization header and replace with a blob URL so browser can display it.
        if (token && API && src.startsWith(API) && src.includes('/api/v1/files/download')) {
          const ac = new AbortController()
          controllers.push(ac)
          fetch(src, { headers: { Authorization: `Bearer ${token}` }, signal: ac.signal })
            .then(res => {
              if (!res.ok) throw new Error('fetch failed ' + res.status)
              return res.blob()
            })
            .then(blob => {
              const url = URL.createObjectURL(blob)
              createdUrls.push(url)
              img.src = url
            })
            .catch(e => {
              // on error, leave original src (may be 401) or set a small placeholder
              console.error('image fetch failed', e)
            })
        }
      } catch (e) { console.error('image handling err', e) }
    })

    return () => {
      controllers.forEach(c => { try { c.abort() } catch {} })
      createdUrls.forEach(u => { try { URL.revokeObjectURL(u) } catch {} })
    }
  }, [rendered])

  return (
    <div className="note-viewer">
      <div
        className="note-viewer__content"
        ref={contentRef}
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    </div>
  )
}
/*
  Component: MarkdownViewer
  Role: Render Markdown content with syntax highlighting and GFM support.
  Tech: Uses react-markdown, remark-gfm, rehype-highlight to format output.
*/
