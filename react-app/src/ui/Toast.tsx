/*
  무엇을/왜: 상단 토스트 알림(성공/오류/정보) 경량 구현. 접근성 역할/aria-live 포함.
*/
import React, { useEffect } from 'react'

type ToastProps = {
  open: boolean
  message: string
  variant?: 'success' | 'error' | 'info'
  onClose: () => void
  duration?: number
}

const bgByVariant = {
  success: 'linear-gradient(90deg, #16a34a, #22c55e)',
  error: 'linear-gradient(90deg, #ef4444, #f87171)',
  info: 'linear-gradient(90deg, #2563eb, #3b82f6)'
}

const Toast: React.FC<ToastProps> = ({ open, message, variant = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [open, duration, onClose])

  if (!open) return null
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', top: 16, right: 16, zIndex: 2000,
        minWidth: 240, maxWidth: 360,
        color: 'white', padding: '10px 14px', borderRadius: 10,
        boxShadow: 'var(--nf-shadow-lg)', background: bgByVariant[variant],
      }}
    >
      {message}
    </div>
  )
}

export default Toast

