// src/components/MarkdownEditor.jsx
import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'

export default function MarkdownEditor({ html, onUpdate, uploadImage, onReady }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
    ],
    content: html,
    onUpdate: ({ editor }) => onUpdate(editor.getHTML()),
    editorProps: {
      attributes: { class: 'prose focus:outline-none' },
      handleDOMEvents: {
        // 붙여넣기
        paste: (view, event) => {
          const files = Array.from(event.clipboardData.files)
          if (files.length === 0) return false
          event.preventDefault()
          const file = files[0]
          console.log('[Paste] file:', file)
          uploadImage(file).then(url => {
            console.log('[Paste] uploaded URL:', url)
            view.dispatch(
              view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.image.create({ src: url })
              )
            )
          })
          return true
        },
        // 드롭
        drop: (view, event) => {
          const files = Array.from(event.dataTransfer.files)
          if (files.length === 0) return false
          event.preventDefault()
          const file = files[0]
          console.log('[Drop] file:', file)
          uploadImage(file).then(url => {
            console.log('[Drop] uploaded URL:', url)
            // 커서 위치에 이미지 삽입
            editor.chain().focus().setImage({ src: url }).run()
          })
          return true
        },
      }
    }
  })

  useEffect(() => {
    if (editor) editor.commands.focus()
  }, [editor])

  // keep editor content in sync when `html` prop changes (e.g., initial load)
  useEffect(() => {
    if (!editor) return
    try {
      const current = editor.getHTML()
      if ((html || '') !== current) {
        editor.commands.setContent(html || '')
      }
    } catch (e) {
      console.error('failed to sync editor content', e)
    }
  }, [editor, html])

  useEffect(() => {
    if (typeof onReady === 'function') {
      onReady(editor)
      return () => onReady(null)
    }
  }, [editor])

  return <EditorContent editor={editor} />
}
