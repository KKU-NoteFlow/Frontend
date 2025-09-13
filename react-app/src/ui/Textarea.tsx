import React from 'react'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = '', ...rest },
  ref,
) {
  return <textarea ref={ref} className={["nf-textarea", className].filter(Boolean).join(' ')} {...rest} />
})

export default Textarea

