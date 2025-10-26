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
    const root = contentRef.current
    const imgs = Array.from(root.querySelectorAll('img'))
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

  // Post-render polish: external links target, simple checklist transform
  useEffect(() => {
    const root = contentRef.current
    if (!root) return

    // Open links in new tab for user convenience
    const anchors = root.querySelectorAll('a[href]')
    anchors.forEach(a => {
      try {
        const href = a.getAttribute('href') || ''
        // Treat absolute http(s) links as external
        if (/^https?:\/\//i.test(href)) {
          a.setAttribute('target', '_blank')
          a.setAttribute('rel', 'noopener noreferrer')
        }
      } catch {}
    })

    // Convert list items starting with [ ] / [x] into checkboxes
    const lis = root.querySelectorAll('li')
    lis.forEach(li => {
      const text = (li.textContent || '').trim()
      const m = text.match(/^\[( |x|X)\]\s*(.*)$/)
      if (!m) return
      const checked = /x/i.test(m[1])
      const label = m[2] || ''
      // Clear children and rebuild structure
      while (li.firstChild) li.removeChild(li.firstChild)
      li.classList.add('task-list-item')
      const cb = document.createElement('input')
      cb.type = 'checkbox'
      cb.checked = checked
      cb.disabled = true
      cb.setAttribute('aria-readonly', 'true')
      const span = document.createElement('span')
      span.textContent = label
      li.appendChild(cb)
      li.appendChild(span)
    })

    // Wrap tables for responsive horizontal scrolling
    const tables = Array.from(root.querySelectorAll('table'))
    tables.forEach((table) => {
      try {
        if (table.parentElement && table.parentElement.classList.contains('table-wrap')) return
        const wrap = document.createElement('div')
        wrap.className = 'table-wrap'
        table.parentElement?.insertBefore(wrap, table)
        wrap.appendChild(table)
      } catch {}
    })
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
