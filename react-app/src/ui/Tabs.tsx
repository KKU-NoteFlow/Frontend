import React from 'react'

type Tab = { id: string; label: string }
type Props = { tabs: Tab[]; value: string; onChange: (id: string) => void }

const Tabs: React.FC<Props> = ({ tabs, value, onChange }) => (
  <div role="tablist" aria-label="Tabs" style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--nf-border)', marginBottom: 12 }}>
    {tabs.map(t => (
      <button
        key={t.id}
        role="tab"
        aria-selected={t.id === value}
        className="nf-btn nf-btn--ghost"
        onClick={() => onChange(t.id)}
        style={{ border: 'none', borderBottom: t.id === value ? '2px solid var(--nf-primary)' : '2px solid transparent', borderRadius: 0 }}
      >
        {t.label}
      </button>
    ))}
  </div>
)

export default Tabs

