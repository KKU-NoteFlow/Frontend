import React from 'react'

const Kbd: React.FC<React.HTMLAttributes<HTMLElement>> = ({ children, ...rest }) => (
  <kbd style={{
    border: '1px solid var(--nf-border)', borderBottomWidth: 2,
    borderRadius: 6, padding: '0 6px', background: 'var(--nf-surface-2)',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.8em'
  }} {...rest}>{children}</kbd>
)

export default Kbd

