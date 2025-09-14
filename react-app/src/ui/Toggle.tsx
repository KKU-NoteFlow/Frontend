import React from 'react'

type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
  label?: string
  disabled?: boolean
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, id, label, disabled }) => {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
      {label ? <span>{label}</span> : null}
      <span role="switch" aria-checked={checked} aria-disabled={disabled || undefined}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        />
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 36, height: 20,
            borderRadius: 12,
            background: checked ? 'var(--nf-primary)' : 'var(--nf-border)',
            position: 'relative', transition: 'background 150ms',
          }}
        >
          <span
            style={{
              position: 'absolute', top: 2, left: checked ? 18 : 2,
              width: 16, height: 16, borderRadius: 9999,
              background: 'var(--nf-surface)', boxShadow: 'var(--nf-shadow-sm)', transition: 'left 150ms'
            }}
          />
        </span>
      </span>
    </label>
  )
}

export default Toggle
