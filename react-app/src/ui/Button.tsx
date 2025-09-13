/*
  무엇을/왜: 공통 Button 컴포넌트(프리젠테이션 레이어). 기존 호출부와 충돌 방지 위해 선택적 사용.
*/
import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  className = '',
  variant = 'default',
  size = 'md',
  loading = false,
  children,
  disabled,
  ...rest
}) => {
  const classes = [
    'nf-btn',
    variant === 'primary' ? 'nf-btn--primary' : '',
    variant === 'ghost' ? 'nf-btn--ghost' : '',
    size === 'sm' ? 'nf-btn--sm' : '',
    size === 'lg' ? 'nf-btn--lg' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={classes}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? '…' : children}
    </button>
  )
}

export default Button

