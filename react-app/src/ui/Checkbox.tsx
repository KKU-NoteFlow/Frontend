import React from 'react'

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className = '', ...rest },
  ref,
) {
  return <input ref={ref} type="checkbox" className={className} {...rest} />
})

export default Checkbox

