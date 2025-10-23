// src/components/ToastMarkdownEditor.jsx
import React, { useEffect, useRef } from 'react'
import Editor from '@toast-ui/editor'

// A Toast UI Markdown editor wrapper with a TipTap-like shim API
// Props:
// - html: string (existing content; can be markdown or plain text)
// - onUpdate: (markdown: string) => void
// - uploadImage: async (file: File) => Promise<string>
// - onReady: (controller|null) => void
export default function ToastMarkdownEditor({ html, onUpdate, uploadImage, onReady }) {
  const containerRef = useRef(null)
  const editorRef = useRef(null)

  // Convert incoming HTML-ish strings to a safer plain text/markdown baseline
  const toMarkdownish = (str) => {
    const s = String(str || '')
    if (!/[<>]/.test(s)) return s
    try {
      return s
        .replace(/\r/g, '')
        .replace(/<br\s*\/?\s*>/gi, '\n')
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

  // Init editor
  useEffect(() => {
    if (!containerRef.current) return
    const initialValue = toMarkdownish(html)
    const ed = new Editor({
      el: containerRef.current,
      initialEditType: 'markdown',
      previewStyle: 'tab',
      hideModeSwitch: true,
      height: 'calc(100vh - 220px)',
      usageStatistics: false,
      initialValue,
      toolbarItems: [
        ['heading', 'bold', 'italic', 'strike'],
        ['hr', 'quote'],
        ['ul', 'ol', 'task'],
        ['link', 'image'],
        ['code', 'codeblock'],
      ],
    })
    editorRef.current = ed

    // Image upload hook
    if (typeof uploadImage === 'function') {
      ed.addHook('addImageBlobHook', async (blob, callback) => {
        try {
          const url = await uploadImage(blob)
          if (url) callback(url, 'image')
        } catch (e) {
          // noop; surface errors in console only
          console.error('[ToastMarkdownEditor] image upload failed', e)
        }
      })
    }

    // Change propagation
    ed.on('change', () => {
      try {
        onUpdate?.(ed.getMarkdown())
      } catch {}
    })

    // Expose a TipTap-like shim so existing callers keep working
    if (typeof onReady === 'function') {
      const controller = {
        getHTML: () => {
          try { return ed.getMarkdown() } catch { return '' }
        },
        chain: () => {
          const api = {
            focus: () => { try { ed.focus() } catch {} return api },
            insertContent: (htmlStr) => {
              try {
                const text = String(htmlStr || '')
                  .replace(/<br\s*\/?\s*>/gi, '\n')
                  .replace(/<[^>]+>/g, '')
                ed.insertText(text)
              } catch {
                try { ed.insertText(String(htmlStr || '')) } catch {}
              }
              return api
            },
            run: () => {}
          }
          return api
        },
      }
      onReady(controller)
    }

    return () => {
      try { onReady?.(null) } catch {}
      try { ed.destroy() } catch {}
      editorRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // External value updates -> sync when changed
  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return
    try {
      const next = toMarkdownish(html)
      const cur = ed.getMarkdown()
      if (next !== cur) ed.setMarkdown(next, false)
    } catch {}
  }, [html])

  return (
    <div className="toast-md-editor" ref={containerRef} />
  )
}
/*
  Component: ToastMarkdownEditor
  Role: Alternative editor using @toast-ui/editor for Markdown authoring.
  Note: Chosen for specific UX needs; can be swapped with MarkdownEditor as required.
*/
