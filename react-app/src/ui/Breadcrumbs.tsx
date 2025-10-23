import React from 'react'

type Crumb = { label: string; href?: string; onClick?: () => void }
type Props = { items: Crumb[]; 'aria-label'?: string }

const Breadcrumbs: React.FC<Props> = ({ items, ...rest }) => (
  <nav {...rest}>
    <ol style={{ display: 'flex', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map((c, i) => (
        <li key={i}>
          {c.href ? <a href={c.href}>{c.label}</a> : <span aria-current={i === items.length - 1 ? 'page' : undefined}>{c.label}</span>}
          {i < items.length - 1 ? <span style={{ marginInline: 6, color: 'var(--nf-muted)' }}>/</span> : null}
        </li>
      ))}
    </ol>
  </nav>
)

export default Breadcrumbs
/*
  UI: Breadcrumbs
  Purpose: Hierarchical navigation aid.
*/
