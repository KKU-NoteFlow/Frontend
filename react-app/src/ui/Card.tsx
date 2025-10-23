import React from 'react'

type CardProps = React.HTMLAttributes<HTMLDivElement>

const Card: React.FC<CardProps> = ({ className = '', children, ...rest }) => (
  <div className={["nf-card", className].filter(Boolean).join(' ')} {...rest}>{children}</div>
)

export default Card
/*
  UI: Card
  Purpose: Surface container with border, radius, and shadow; groups related content.
*/
