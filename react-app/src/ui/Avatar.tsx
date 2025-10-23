import React from 'react'

type AvatarProps = React.ImgHTMLAttributes<HTMLImageElement> & { name?: string }

const colorFromName = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return `hsl(${hash % 360} 60% 60%)`
}

const Avatar: React.FC<AvatarProps> = ({ name = 'U', src, alt, style, ...rest }) => {
  if (src) return <img src={src} alt={alt || name} style={{ width: 32, height: 32, borderRadius: '50%' }} {...rest} />
  const initials = name.trim().split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()
  return (
    <span aria-label={alt || name} role="img" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 32, height: 32, borderRadius: '50%', background: colorFromName(name),
      color: '#fff', fontSize: 12, fontWeight: 700,
      ...style,
    }} {...rest}>{initials}</span>
  )
}

export default Avatar
/*
  UI: Avatar
  Purpose: Circular image/initials for user identity.
*/
