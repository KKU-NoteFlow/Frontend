import React, { useEffect, useState } from 'react'

const PALETTES = {
  green: {
    light: {
      '--nf-primary': '#2f9e44', '--nf-bg': '#c8d7cf', '--nf-surface': '#f2f7f4', '--nf-surface-2': '#e0eae4', '--nf-topbar': '#d7e3dd', '--nf-sidebar': '#a6bcb1', '--nf-border': '#6f8a7c', '--nf-text': '#0a1510', '--nf-muted': '#2f3a35'
    },
    dark: {
      '--nf-primary': '#49a23a', '--nf-bg': '#0b1410', '--nf-surface': '#101914', '--nf-surface-2': '#0e1712', '--nf-topbar': '#152219', '--nf-sidebar': '#0a120e', '--nf-border': '#244a37', '--nf-text': '#e6f4ec', '--nf-muted': '#a1b5aa'
    }
  },
  blue: {
    light: {
      '--nf-primary': '#2563eb', '--nf-bg': '#e8efff', '--nf-surface': '#ffffff', '--nf-surface-2': '#f3f7ff', '--nf-topbar': '#eef5ff', '--nf-sidebar': '#d7e7ff', '--nf-border': '#b7c9f7', '--nf-text': '#071237', '--nf-muted': '#4b5f7a'
    },
    dark: {
      '--nf-primary': '#60a5fa', '--nf-bg': '#071029', '--nf-surface': '#071827', '--nf-surface-2': '#052233', '--nf-topbar': '#08233b', '--nf-sidebar': '#041826', '--nf-border': '#083056', '--nf-text': '#e6f2ff', '--nf-muted': '#9fb7d9'
    }
  },
  purple: {
    light: {
      '--nf-primary': '#7c3aed', '--nf-bg': '#f3eefe', '--nf-surface': '#ffffff', '--nf-surface-2': '#f7f0ff', '--nf-topbar': '#f3eefe', '--nf-sidebar': '#eadcff', '--nf-border': '#d6c0f5', '--nf-text': '#230a2b', '--nf-muted': '#5a4363'
    },
    dark: {
      '--nf-primary': '#9f7aea', '--nf-bg': '#0b0710', '--nf-surface': '#12091a', '--nf-surface-2': '#160b23', '--nf-topbar': '#1a0f2b', '--nf-sidebar': '#14071c', '--nf-border': '#2b173a', '--nf-text': '#f3eaff', '--nf-muted': '#b99fd6'
    }
  },
  orange: {
    light: {
      '--nf-primary': '#d97706', '--nf-bg': '#fff6ed', '--nf-surface': '#ffffff', '--nf-surface-2': '#fff4e6', '--nf-topbar': '#fff7ee', '--nf-sidebar': '#ffecd1', '--nf-border': '#f1cfa6', '--nf-text': '#2b1a09', '--nf-muted': '#6b553a'
    },
    dark: {
      '--nf-primary': '#fb923c', '--nf-bg': '#120a05', '--nf-surface': '#1a130b', '--nf-surface-2': '#22160c', '--nf-topbar': '#23150a', '--nf-sidebar': '#140b05', '--nf-border': '#3a2411', '--nf-text': '#fff6ec', '--nf-muted': '#d7b69a'
    }
  }
}

export default function ColorPalette({ mode = 'light' }) {
  const [selected, setSelected] = useState(() => {
    try { return localStorage.getItem('nf-theme-palette') || 'green' } catch { return 'green' }
  })

  useEffect(() => {
    applyPalette(selected, mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, mode])

  function applyPalette(key, mode) {
    const pal = PALETTES[key]
    if (!pal) return
    const set = pal[mode === 'dark' ? 'dark' : 'light'] || pal.light
    const root = document.documentElement
    Object.keys(set).forEach(k => root.style.setProperty(k, set[k]))
    try { localStorage.setItem('nf-theme-palette', key) } catch {}
  }

  return (
    <div className="color-palette" title="색상 테마 선택" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {Object.keys(PALETTES).map(key => {
        const swatch = PALETTES[key].light['--nf-primary']
        return (
          <button
            key={key}
            aria-label={`테마 ${key}`}
            onClick={() => setSelected(key)}
            className={"palette-swatch" + (selected === key ? ' selected' : '')}
            style={{
              width: 20, height: 20, borderRadius: 6, border: '1px solid var(--nf-border)',
              background: swatch, padding: 0, cursor: 'pointer'
            }}
          />
        )
      })}
    </div>
  )
}

