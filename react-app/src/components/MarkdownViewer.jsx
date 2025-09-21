// src/components/MarkdownViewer.jsx
import React, { useMemo } from 'react'
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

  return (
    <div className="note-viewer">
      <div
        className="note-viewer__content"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    </div>
  )
}
