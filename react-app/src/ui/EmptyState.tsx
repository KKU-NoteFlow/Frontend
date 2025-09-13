import React from 'react'

type EmptyStateProps = {
  title: string
  description?: string
  action?: React.ReactNode
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => (
  <div className="nf-card" role="status" aria-live="polite" style={{ textAlign: 'center', padding: '2rem' }}>
    <h3 style={{ marginBottom: '0.5rem' }}>{title}</h3>
    {description ? <p style={{ color: 'var(--nf-muted)', marginBottom: '1rem' }}>{description}</p> : null}
    {action}
  </div>
)

export default EmptyState

