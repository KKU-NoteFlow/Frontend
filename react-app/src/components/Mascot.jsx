import React, { useEffect, useRef, useState } from 'react'
import '../css/Mascot.css'

/*
  Component: Mascot
  Role: Playful character on the login screen.
  Interactions:
   - Eyes follow the mouse within a small range.
   - Mouth reflects mood: neutral | happy | sad.
*/
export default function Mascot({
  mood = 'neutral',
  asset,
  tint,
  variant = 'circle', // 'circle' | 'blob' | 'bear' | 'bunny'
  size = 1,
  rotate = 0,
  className,
  style,
}) {
  const ref = useRef(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [offsetL, setOffsetL] = useState({ x: 0, y: 0 })
  const [offsetR, setOffsetR] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()

      // Default center-based tracking
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const max = 7
      const len = Math.hypot(dx, dy) || 1
      setOffset({ x: (dx / len) * Math.min(max, len), y: (dy / len) * Math.min(max, len) })

      // Per-eye tracking when custom asset is provided
      if (asset && asset.leftEye && asset.rightEye) {
        const scaleX = rect.width / (asset.width || 260)
        const scaleY = rect.height / (asset.height || 260)
        const pMax = asset.pupilMax ?? 7
        const eyeDom = (eye) => ({
          x: rect.left + (eye.x * scaleX),
          y: rect.top + (eye.y * scaleY)
        })
        const L = eyeDom(asset.leftEye)
        const R = eyeDom(asset.rightEye)
        const ldx = e.clientX - L.x
        const ldy = e.clientY - L.y
        const rdx = e.clientX - R.x
        const rdy = e.clientY - R.y
        const llen = Math.hypot(ldx, ldy) || 1
        const rlen = Math.hypot(rdx, rdy) || 1
        setOffsetL({ x: (ldx / llen) * Math.min(pMax, llen), y: (ldy / llen) * Math.min(pMax, llen) })
        setOffsetR({ x: (rdx / rlen) * Math.min(pMax, rlen), y: (rdy / rlen) * Math.min(pMax, rlen) })
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // Mouth path by mood
  const defaultMouth = mood === 'happy'
    ? 'M85 120 Q100 135 115 120'
    : mood === 'sad'
    ? 'M85 130 Q100 115 115 130'
    : 'M85 125 L115 125'

  // Custom asset mode: embed raster as <image> and overlay vector pupils/mouth
  if (asset && asset.src) {
    const w = asset.width || 260
    const h = asset.height || 260
    const pr = asset.pupilRadius || 6
    const mouth = (asset.mouthPaths && asset.mouthPaths[mood]) || ''
    const uid = React.useRef(`m${Math.random().toString(36).slice(2)}`).current
    const hasEllipses = asset.leftEye && asset.leftEye.rx && asset.leftEye.ry
    return (
      <div className={`mascot ${mood}`} ref={ref} aria-label="NoteFlow mascot" role="img">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
          <image href={asset.src} x="0" y="0" width={w} height={h} preserveAspectRatio="xMidYMid meet" />
          {hasEllipses && (
            <defs>
              <clipPath id={`${uid}-L`}>
                <ellipse cx={asset.leftEye.x} cy={asset.leftEye.y} rx={asset.leftEye.rx} ry={asset.leftEye.ry}
                  transform={asset.leftEye.rotate ? `rotate(${asset.leftEye.rotate} ${asset.leftEye.x} ${asset.leftEye.y})` : undefined} />
              </clipPath>
              <clipPath id={`${uid}-R`}>
                <ellipse cx={asset.rightEye.x} cy={asset.rightEye.y} rx={asset.rightEye.rx} ry={asset.rightEye.ry}
                  transform={asset.rightEye.rotate ? `rotate(${asset.rightEye.rotate} ${asset.rightEye.x} ${asset.rightEye.y})` : undefined} />
              </clipPath>
            </defs>
          )}
          {hasEllipses && asset.debug && (
            <g>
              <ellipse cx={asset.leftEye.x} cy={asset.leftEye.y} rx={asset.leftEye.rx} ry={asset.leftEye.ry}
                transform={asset.leftEye.rotate ? `rotate(${asset.leftEye.rotate} ${asset.leftEye.x} ${asset.leftEye.y})` : undefined}
                fill="none" stroke="#20a36b" strokeDasharray="4 4" strokeWidth="1" />
              <ellipse cx={asset.rightEye.x} cy={asset.rightEye.y} rx={asset.rightEye.rx} ry={asset.rightEye.ry}
                transform={asset.rightEye.rotate ? `rotate(${asset.rightEye.rotate} ${asset.rightEye.x} ${asset.rightEye.y})` : undefined}
                fill="none" stroke="#20a36b" strokeDasharray="4 4" strokeWidth="1" />
            </g>
          )}
          {/* Pupils (clipped if ellipse provided) */}
          {asset.leftEye && (
            <g className="pupil left" clipPath={hasEllipses ? `url(#${uid}-L)` : undefined}>
              <circle cx={(asset.leftEye.x) + offsetL.x} cy={(asset.leftEye.y) + offsetL.y} r={pr} fill="#123229" />
            </g>
          )}
          {asset.rightEye && (
            <g className="pupil right" clipPath={hasEllipses ? `url(#${uid}-R)` : undefined}>
              <circle cx={(asset.rightEye.x) + offsetR.x} cy={(asset.rightEye.y) + offsetR.y} r={pr} fill="#123229" />
            </g>
          )}
          {/* Optional mouth overlay if provided */}
          {mouth ? <path d={mouth} className="mouth" /> : null}
        </svg>
      </div>
    )
  }

  // Default simple mascot (vector variants)
  const start = (tint && tint.start) || '#e9fbf3'
  const end = (tint && tint.end) || '#cfeee1'
  return (
    <div
      className={`mascot ${mood} ${className || ''}`}
      ref={ref}
      aria-label="NoteFlow mascot"
      role="img"
      style={{ transform: `scale(${size}) rotate(${rotate}deg)`, ...style }}
    >
      <svg width="260" height="260" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={start} />
            <stop offset="100%" stopColor={end} />
          </radialGradient>
        </defs>

        {/* Decorative sparkles */}
        <g opacity=".35">
          <circle cx="30" cy="40" r="2" fill="#ffffff" />
          <circle cx="170" cy="48" r="2" fill="#ffffff" />
          <circle cx="24" cy="150" r="1.6" fill="#ffffff" />
          <circle cx="182" cy="160" r="1.8" fill="#ffffff" />
        </g>

        {/* Body variants */}
        {variant === 'circle' && (
          <circle cx="100" cy="100" r="78" fill="url(#grad)" stroke="#d1e6dc" />
        )}
        {variant === 'blob' && (
          <path d="M100,24c22,-6 48,4 60,20 12,16 16,40 8,58 -8,18 -26,30 -44,40 -18,10 -36,18 -54,12 -18,-6 -34,-24 -38,-46 -4,-22 4,-48 20,-62 16,-14 26,-16 48,-22z" fill="url(#grad)" stroke="#d1e6dc" />
        )}
        {variant === 'bear' && (
          <g>
            <circle cx="100" cy="104" r="76" fill="url(#grad)" stroke="#d1e6dc" />
            {/* ears */}
            <circle cx="62" cy="48" r="20" fill="url(#grad)" stroke="#d1e6dc" />
            <circle cx="138" cy="48" r="20" fill="url(#grad)" stroke="#d1e6dc" />
          </g>
        )}
        {variant === 'bunny' && (
          <g>
            <circle cx="100" cy="112" r="72" fill="url(#grad)" stroke="#d1e6dc" />
            {/* ears */}
            <ellipse cx="72" cy="42" rx="16" ry="30" fill="url(#grad)" stroke="#d1e6dc" />
            <ellipse cx="128" cy="42" rx="16" ry="30" fill="url(#grad)" stroke="#d1e6dc" />
          </g>
        )}

        {/* Eyes */}
        <circle cx="70" cy="90" r="16" fill="#fff" stroke="#ced9d3" />
        <circle cx="130" cy="90" r="16" fill="#fff" stroke="#ced9d3" />
        <circle className="pupil left" cx={70 + offset.x * 0.5} cy={90 + offset.y * 0.5} r="6" fill="#123229" />
        <circle className="pupil right" cx={130 + offset.x * 0.5} cy={90 + offset.y * 0.5} r="6" fill="#123229" />

        {/* Brows/Mouth/Cheeks */}
        <path d="M55 72 Q70 65 85 72" className="brow left" />
        <path d="M115 72 Q130 65 145 72" className="brow right" />
        <path d={defaultMouth} className="mouth" />
        <circle cx="52" cy="112" r="6" className="cheek" />
        <circle cx="148" cy="112" r="6" className="cheek" />
      </svg>
    </div>
  )
}
