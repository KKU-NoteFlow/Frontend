// src/components/DashboardTimetable.jsx
// 무엇을/왜: 에브리타임식 주간 시간표(로컬 저장). 업로드/마법사로 수동 입력 지원.
import React, { useMemo, useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'nf-timetable'
const BG_KEY = 'nf-timetable-bg'
const BG_OPACITY_KEY = 'nf-timetable-bg-opacity'

const days = ['월','화','수','목','금']

function loadItems() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveItems(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) }

export default function DashboardTimetable() {
  const [items, setItems] = useState(() => loadItems())
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', day: '월', start: '09:00', end: '10:15', place: '', color: '#00923F' })
  const [bg, setBg] = useState(() => {
    try { return localStorage.getItem(BG_KEY) || '' } catch { return '' }
  })
  const [bgOpacity, setBgOpacity] = useState(() => {
    try { return parseFloat(localStorage.getItem(BG_OPACITY_KEY) || '0.35') } catch { return 0.35 }
  })

  useEffect(() => { saveItems(items) }, [items])
  useEffect(() => { try { localStorage.setItem(BG_OPACITY_KEY, String(bgOpacity)) } catch {} }, [bgOpacity])

  const toMinutes = (t) => { const [h,m] = t.split(':').map(Number); return h*60+m }

  // Fixed hour range (09:00 - 18:00)
  const hours = useMemo(() => {
    const arr = []
    for (let h = 9; h <= 18; h++) arr.push(h)
    return arr
  }, [])

  const [cellPx, setCellPx] = useState(56)
  const rootRef = useRef(null)

  // compute a slightly smaller cell height than available so topbars/margins don't cause clipping
  useEffect(() => {
    const compute = () => {
      try {
        const rootTop = rootRef.current ? rootRef.current.getBoundingClientRect().top : 0
        const SAFETY_MARGIN = 200 // slightly smaller safety margin to allow larger cells
        const MIN_AVAILABLE = 160
        const available = Math.max(MIN_AVAILABLE, window.innerHeight - rootTop - SAFETY_MARGIN)
        // choose a size slightly larger than before: cap to original 56, but prefer larger mins
        const raw = Math.floor(available / hours.length)
        // increase size: prefer a larger minimum and allow a slightly bigger cap
        const hh = Math.min(60, Math.max(48, raw))
        setCellPx(hh)
      } catch (err) {
        setCellPx(56)
      }
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [hours.length])

  const addItem = () => {
    if (!form.title.trim()) return
    const newItem = { ...form, id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) }
    setItems(prev => [...prev, newItem])
    setOpen(false)
  }

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id))

  const onUploadPng = async (file) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      setBg(dataUrl)
      try { localStorage.setItem(BG_KEY, String(dataUrl)) } catch {}
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="nf-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>시간표</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {bg && <button className="nf-btn nf-btn--sm" onClick={() => { setBg(''); try { localStorage.removeItem(BG_KEY) } catch {} }}>배경 지우기</button>}
          <button className="nf-btn nf-btn--primary nf-btn--sm" onClick={() => setOpen(true)}>수업 추가</button>
        </div>
      </div>
      {bg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <label style={{ color: 'var(--nf-muted)' }}>배경 투명도</label>
          <input type="range" min={0.1} max={1} step={0.05} value={bgOpacity} onChange={e => setBgOpacity(parseFloat(e.target.value))} />
          <span style={{ color: 'var(--nf-muted)', fontSize: '0.85rem' }}>{Math.round(bgOpacity*100)}%</span>
        </div>
      )}

      {/* Grid */}
      <div className="timetable-wrap" ref={rootRef} style={{ position: 'relative' }}>
        {bg && (
          <img src={bg} alt="시간표 배경" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: bgOpacity, pointerEvents: 'none' }} />
        )}
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '64px repeat(5, 1fr)', gap: 8 }}>
          <div />
          {days.map(d => <div key={d} style={{ textAlign: 'center', color: 'var(--nf-muted)', fontWeight: 700 }}>{d}</div>)}
          {hours.map(h => (
            <React.Fragment key={h}>
              <div style={{ textAlign: 'right', paddingRight: 4, color: 'var(--nf-muted)' }}>{String(h).padStart(2,'0')}:00</div>
              {days.map(d => (
                <div key={d+String(h)} style={{ position: 'relative', border: '1px dashed var(--nf-border)', borderRadius: 10, height: cellPx, background: 'linear-gradient(180deg, var(--nf-surface), var(--nf-surface-2))' }}>
                  {items.filter(i => i.day === d && Math.floor(toMinutes(i.start)/60) === h)
                    .map(i => {
                      const startM = toMinutes(i.start)
                      const endM = toMinutes(i.end)
                      const dur = Math.max(30, endM - startM)
                      const offset = startM - h*60
                      const pxPerMin = cellPx / 60
                      // ensure small rounding doesn't make block invisible
                      return (
                        <div key={i.id} className="nf-card" style={{
                          position: 'absolute', left: 3, right: 3,
                          top: Math.max(0, offset * pxPerMin), height: Math.max(12, Math.min(cellPx, dur * pxPerMin)),
                          background: `linear-gradient(180deg, ${i.color}, rgba(0,0,0,0.15))`, color: '#fff', borderColor: 'transparent',
                          padding: 6, borderRadius: 10, boxShadow: 'var(--nf-shadow-md)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                            <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.title}</div>
                            <button className="nf-btn nf-btn--sm" style={{ background: 'rgba(0,0,0,0.2)', color: '#fff', borderColor: 'transparent' }} onClick={() => removeItem(i.id)}>삭제</button>
                          </div>
                          <div style={{ fontSize: '0.8rem' }}>{i.start}–{i.end} {i.place ? `· ${i.place}` : ''}</div>
                        </div>
                      )
                    })}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>수업 추가</h2>
              <button className="modal-close-btn" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="modal-content">
              <div style={{ display: 'grid', gap: 8 }}>
                <input className="nf-input" style={{ width: 'calc(100% - 10px)', boxSizing: 'border-box' }} placeholder="과목명" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <select className="nf-select" style={{ width: 'calc(100% - 10px)', boxSizing: 'border-box' }} value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
                  <input className="nf-input" style={{ width: 'calc(100% - 10px)', boxSizing: 'border-box' }} type="time" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} />
                  <input className="nf-input" style={{ width: 'calc(100% - 10px)', boxSizing: 'border-box' }} type="time" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} />
                </div>
                <input className="nf-input" style={{ width: 'calc(100% - 10px)', boxSizing: 'border-box' }} placeholder="장소(선택)" value={form.place} onChange={e => setForm({ ...form, place: e.target.value })} />
                <div>
                  <label>색상 <input type="color" style={{ width: 'calc(100% - 10px)', boxSizing: 'border-box' }} value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} /></label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="nf-btn" onClick={() => setOpen(false)}>취소</button>
              <button className="nf-btn nf-btn--primary" onClick={addItem}>추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
