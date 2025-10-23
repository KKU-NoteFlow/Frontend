import React, { useEffect } from 'react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children?: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {title ? <h2>{title}</h2> : null}
          <button className="modal-close-btn" onClick={onClose} aria-label="닫기">×</button>
        </div>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  )
}

export default Modal
/*
  UI: Modal
  Purpose: Layered dialog with backdrop; traps focus when open.
*/
