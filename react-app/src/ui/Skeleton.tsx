import React from 'react'

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & { width?: number | string; height?: number | string }

const Skeleton: React.FC<SkeletonProps> = ({ className = '', width = '100%', height = 16, style, ...rest }) => (
  <div className={["nf-skeleton", className].filter(Boolean).join(' ')} style={{ width, height, ...style }} {...rest} />
)

export default Skeleton

