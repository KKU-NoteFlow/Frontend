import React, { useId, useState } from 'react'

type Props = { content: string; children: React.ReactElement }

const Tooltip: React.FC<Props> = ({ content, children }) => {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <span
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {React.cloneElement(children as React.ReactElement<any>, { 'aria-describedby': id } as any)}
      {open && (
        <span role="tooltip" id={id} style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--nf-text)', color: 'white', padding: '2px 6px', borderRadius: 4,
          whiteSpace: 'nowrap', fontSize: '0.8em', marginBottom: 6
        }}>
          {content}
        </span>
      )}
    </span>
  )
}

export default Tooltip
