/* 공통 IconButton: 접근성 위해 aria-label 필수 권장 */
import React from 'react'

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'sm' | 'md' | 'lg'
}

const IconButton: React.FC<IconButtonProps> = ({ size = 'md', className = '', children, ...rest }) => {
  const classes = ['nf-btn', 'nf-icon-btn', size === 'sm' ? 'nf-btn--sm' : size === 'lg' ? 'nf-btn--lg' : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}

export default IconButton

