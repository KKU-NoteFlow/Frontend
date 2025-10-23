import React from 'react'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement>

const Badge: React.FC<BadgeProps> = ({ className = '', children, ...rest }) => (
  <span className={["nf-badge", className].filter(Boolean).join(' ')} {...rest}>{children}</span>
)

export default Badge
/*
  UI: Badge
  Purpose: Small label for status/count annotations.
*/
