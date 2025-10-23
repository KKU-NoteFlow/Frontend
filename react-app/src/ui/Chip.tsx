import React from 'react'

type ChipProps = React.HTMLAttributes<HTMLSpanElement> & { selected?: boolean }

const Chip: React.FC<ChipProps> = ({ className = '', selected = false, children, ...rest }) => (
  <span
    className={["nf-chip", className].filter(Boolean).join(' ')}
    aria-pressed={selected || undefined}
    {...rest}
  >
    {children}
  </span>
)

export default Chip
/*
  UI: Chip
  Purpose: Compact pill for tags/filters.
*/
