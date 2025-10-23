import React from 'react'

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = '', children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={["nf-select", className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </select>
  )
})

export default Select
/*
  UI: Select
  Purpose: Basic select styled to match inputs/buttons; keep native semantics.
*/
