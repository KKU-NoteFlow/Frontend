// DashboardTimetable.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react'

/** 저장키 */
const STORAGE_KEY = 'nf-timetable'

/** 표시 시간 범위(분) */
const VIEW_START = 9 * 60
const VIEW_END = 18 * 60

/** 표 비율 */
const ROW_HOUR = 64
const GRID_GAP = 8
const PADDING = 8
const PX_PER_MIN = ROW_HOUR / 60

/** 가로 배치 */
const TIME_COL_W = 72
const DAYS = ['월', '화', '수', '목', '금']

/** 칼럼 폭 한계 */
const DAY_W_MIN = 68
const DAY_W_MAX = 180

/** 로컬 스토리지 */
const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } }
const save = (v) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v))

/** 유틸 */
const pad2 = (n) => String(n).padStart(2, '0')
const toMin = (hhmm) => { const [h, m] = String(hhmm ?? '00:00').split(':').map(Number); return h * 60 + (m || 0) }
const apmToHHMM = (apm, h12, m) => {
  let h = parseInt(h12, 10)
  if (apm === '오전') { if (h === 12) h = 0 } else { if (h !== 12) h += 12 }
  return `${pad2(h)}:${pad2(m)}`
}

export default function DashboardTimetable() {
  /** 데이터 */
  const [items, setItems] = useState(load)
  useEffect(() => save(items), [items])

  /** 모달 상태 */
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    day: '월',
    apmStart: '오전', hourStart: 9, minStart: 0,
    apmEnd: '오후',   hourEnd: 1,  minEnd: 0,
    place: '',
    color: '#2f9e44'
  })

  /** 시간 라인 */
  const hourRows = useMemo(
    () => Array.from({ length: (VIEW_END - VIEW_START) / 60 }, (_, i) => i),
    []
  )

  /** 카드 위치/크기 계산 */
  const calcStyle = (it) => {
    const s = toMin(it.start), e = toMin(it.end)
    const sC = Math.max(VIEW_START, Math.min(e, s))
    const eC = Math.min(VIEW_END, Math.max(s, e))
    return {
      position: 'absolute',
      left: PADDING, right: PADDING,
      top: (sC - VIEW_START) * PX_PER_MIN,
      height: Math.max(24, (eC - sC) * PX_PER_MIN),
      borderRadius: 14,
      border: '1px solid rgba(0,0,0,.08)',
      boxShadow: '0 8px 18px rgba(0,0,0,.18)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: `linear-gradient(180deg, ${it.color}, rgba(0,0,0,.22))`,
      color: '#fff',
      minHeight: 44
    }
  }

  /** 폭 자동계산 */
  const wrapRef = useRef(null)
  const [dayColW, setDayColW] = useState(140)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const calc = () => {
      const w = el.getBoundingClientRect().width
      const totalGaps = (1 + DAYS.length) * GRID_GAP
      const available = Math.max(0, w - TIME_COL_W - totalGaps)
      const per = available / DAYS.length
      const clamped = Math.max(DAY_W_MIN, Math.min(DAY_W_MAX, Math.floor(per)))
      setDayColW(clamped)
    }
    calc()
    const ro = new (window.ResizeObserver || function(){})((entries)=>{ for (const _ of entries) calc() })
    if (ro.observe) ro.observe(el)
    window.addEventListener('resize', calc)
    return () => {
      if (ro.unobserve) ro.unobserve(el)
      window.removeEventListener('resize', calc)
    }
  }, [])

  const columnHeight = hourRows.length * ROW_HOUR + (hourRows.length - 1) * GRID_GAP

  /** 추가/삭제 */
  const add = () => {
    const t = form.title.trim()
    if (!t) return
    const s = apmToHHMM(form.apmStart, form.hourStart, form.minStart)
    const e = apmToHHMM(form.apmEnd, form.hourEnd, form.minEnd)
    const sm = toMin(s), em = toMin(e)
    if (em <= sm) { alert('종료 시간은 시작 시간보다 늦어야 해요.'); return }
    setItems(prev => [...prev, {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: t, day: form.day, start: s, end: e, place: form.place.trim(), color: form.color
    }])
    setOpen(false)
  }
  const remove = (id) => setItems(prev => prev.filter(i => i.id !== id))

  return (
    <div style={{ padding: 12 }}>
      {/* 패널 카드 — 체크리스트 카드와 톤/여백 맞춤 */}
      <div
        style={{
          border: '1px solid var(--nf-border)',
          borderRadius: 18,
          boxShadow: '0 10px 30px rgba(0,0,0,.06)',
          background: 'linear-gradient(180deg,#f7fbf8,#f2f7f4)',
          padding: 12,
          width: '100%',
          overflow: 'hidden'
        }}
      >
        {/* 헤더(체크리스트 카드와 동일 높이/간격) */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding: '4px 4px 8px 4px'   // ← 체크리스트 상단과 맞춤
        }}>
          <h3 style={{ margin:0, fontSize:'1.05rem', fontWeight:800 }}>시간표</h3>
          <button className="nf-btn nf-btn--primary nf-btn--sm" onClick={() => setOpen(true)}>수업 추가</button>
        </div>

        {/* 내부 컨텐츠 래퍼 */}
        <div ref={wrapRef} style={{ width:'100%' }}>
          <div
            style={{
              display:'grid',
              gridTemplateColumns:`${TIME_COL_W}px repeat(${DAYS.length}, ${dayColW}px)`,
              gap: GRID_GAP,
              width:'100%',
              alignItems:'start'
            }}
          >
            {/* 상단 요일 헤더(시간 라벨 자리 비움) */}
            <div />
            {DAYS.map(d => (
              <div key={'hd'+d}
                   style={{
                     height: 40,
                     display:'flex', alignItems:'center', justifyContent:'center',
                     fontWeight:700,
                     border: '1px solid var(--nf-border)',
                     borderRadius: 12,
                     background: '#fff',
                     whiteSpace:'nowrap',
                     fontSize: dayColW < 90 ? '.92rem' : '1rem',
                   }}>{d}</div>
            ))}

            {/* 좌측 시간 라벨 */}
            <div style={{
              display:'grid',
              gridTemplateRows:`repeat(${hourRows.length}, ${ROW_HOUR}px)`,
              gap: GRID_GAP,
              alignContent:'start'
            }}>
              {hourRows.map((i) => {
                const h = (VIEW_START/60) + i
                return (
                  <div key={'hr'+i}
                       style={{
                         height: ROW_HOUR,
                         display:'flex', alignItems:'center', justifyContent:'center',
                         paddingRight:6,
                         border: '1px solid var(--nf-border)',
                         borderRadius: 12,
                         background:'#fff'
                       }}>
                    <span style={{ color:'var(--nf-muted)', fontSize:'0.95rem', whiteSpace:'nowrap' }}>
                      {String(h).padStart(2,'0')}:00
                    </span>
                  </div>
                )
              })}
            </div>

            {/* 5개 요일 칼럼 */}
            {DAYS.map((d) => {
              const list = items.filter(i => i.day === d)
              return (
                <div key={'col'+d}
                     style={{
                       position:'relative',
                       height: columnHeight,
                       border: '1px solid var(--nf-border)',
                       borderRadius: 16,
                       background:'#fff',
                       overflow:'hidden'
                     }}>
                  {/* 세로 안배경(표 느낌) */}
                  <div style={{
                    position:'absolute', inset:0,
                    padding:PADDING,
                    display:'grid',
                    gridTemplateRows:`repeat(${hourRows.length}, ${ROW_HOUR}px)`,
                    gap: GRID_GAP
                  }}>
                    {hourRows.map(i => (
                      <div key={d+'bg'+i}
                           style={{
                             border: '1px dashed rgba(0,0,0,.12)',
                             borderRadius: 12,
                             background:'linear-gradient(180deg, #f8fbf9, #f3f7f4)'
                           }}/>
                    ))}
                  </div>

                  {/* 수업 카드 */}
                  <div style={{ position:'absolute', inset:0 }}>
                    {list.map(it => (
                      <div key={it.id} style={calcStyle(it)}>
                        {/* 상단 바: 삭제 버튼 */}
                        <div style={{ display:'flex', justifyContent:'flex-end', padding:'6px 6px 0' }}>
                          <button
                            className="nf-btn nf-btn--sm"
                            style={{
                              background:'rgba(0,0,0,.28)', color:'#fff',
                              borderColor:'transparent', padding:'2px 8px',
                              borderRadius:999, fontSize:12
                            }}
                            onClick={() => remove(it.id)}
                          >삭제</button>
                        </div>

                        {/* 텍스트 박스 — 잘림 방지(스크롤 허용) */}
                        <div
                          title={`${it.title}${it.place ? ` · ${it.place}` : ''}`}
                          style={{
                            marginTop:4,
                            marginInline:8,
                            marginBottom:8,
                            borderRadius:10,
                            background:'rgba(0,0,0,.22)',
                            padding:'8px 10px',
                            display:'flex',
                            flexDirection:'column',
                            gap:6,
                            backdropFilter:'blur(2px)',
                            flex: 1,           // ← 카드 높이에 맞춰 영역 확보
                            minHeight: 0,      // ← 자식 스크롤 위해 필요
                            overflowY: 'auto'  // ← 내용 많으면 스크롤
                          }}
                        >
                          <div
                            style={{
                              fontWeight:800,
                              lineHeight:1.28,
                              fontSize:14,
                              whiteSpace:'pre-wrap',
                              wordBreak:'break-word',     // ← 한국어/영문 모두 줄바꿈 허용
                              overflowWrap:'anywhere',    // ← 아주 긴 토큰도 강제 줄바꿈
                              textShadow:'0 1px 2px rgba(0,0,0,.35)'
                            }}
                          >
                            {it.title}
                          </div>
                          {it.place && (
                            <div
                              style={{
                                fontWeight:600,
                                lineHeight:1.22,
                                fontSize:13,
                                opacity:.97,
                                whiteSpace:'pre-wrap',
                                wordBreak:'break-word',
                                overflowWrap:'anywhere',
                                textShadow:'0 1px 2px rgba(0,0,0,.35)'
                              }}
                            >
                              {it.place}
                            </div>
                          )}
                        </div>

                        {/* 바닥 그라디언트(시각적 마감) */}
                        <div style={{ marginTop:'auto', height:30, background:'linear-gradient(180deg, transparent, rgba(0,0,0,.18))' }}/>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 모달 */}
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-dialog" onClick={(e)=>e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h2>수업 추가</h2>
              <button className="modal-close-btn" onClick={()=>setOpen(false)}>×</button>
            </div>
            <TimetableForm form={form} setForm={setForm} onCancel={()=>setOpen(false)} onSubmit={add}/>
          </div>
        </div>
      )}
    </div>
  )
}

/** 모달 콘텐츠 분리 */
function TimetableForm({ form, setForm, onCancel, onSubmit }) {
  return (
    <>
      <div className="modal-content">
        <div style={{ display:'grid', gap:10 }}>
          <input className="nf-input" placeholder="과목명" value={form.title}
                 onChange={e=>setForm({ ...form, title:e.target.value })}/>
          <div>
            <div style={{ color:'var(--nf-muted)', marginBottom:6 }}>요일</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {DAYS.map(d=>(
                <button key={d}
                        className={`nf-btn ${form.day===d ? 'nf-btn--primary':''}`}
                        onClick={()=>setForm({ ...form, day:d })}
                        style={{ borderRadius:12, padding:'6px 12px' }}>{d}</button>
              ))}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <TimeSelect
              label="시작 시간"
              apm={form.apmStart} setApm={(v)=>setForm({...form, apmStart:v})}
              hour={form.hourStart} setHour={(v)=>setForm({...form, hourStart:v})}
              min={form.minStart} setMin={(v)=>setForm({...form, minStart:v})}
            />
            <TimeSelect
              label="종료 시간"
              apm={form.apmEnd} setApm={(v)=>setForm({...form, apmEnd:v})}
              hour={form.hourEnd} setHour={(v)=>setForm({...form, hourEnd:v})}
              min={form.minEnd} setMin={(v)=>setForm({...form, minEnd:v})}
            />
          </div>
          <input className="nf-input" placeholder="장소(선택)" value={form.place}
                 onChange={e=>setForm({ ...form, place:e.target.value })}/>
          <div>
            <label style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
              <span style={{ color:'var(--nf-muted)' }}>색상</span>
              <input type="color" value={form.color} onChange={e=>setForm({ ...form, color:e.target.value })}/>
            </label>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="nf-btn" onClick={onCancel}>취소</button>
        <button className="nf-btn nf-btn--primary" onClick={onSubmit}>추가</button>
      </div>
    </>
  )
}

/** 시간 선택 콤보(오전/오후 · 시 · 분) */
function TimeSelect({ label, apm, setApm, hour, setHour, min, setMin }) {
  const HourOptions = Array.from({ length: 12 }, (_, i) => i + 1)
  const MinOptions  = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
  const pad2 = (n) => String(n).padStart(2, '0')
  return (
    <div>
      <div style={{ color:'var(--nf-muted)', marginBottom:6 }}>{label}</div>
      <div style={{ display:'grid', gridTemplateColumns:'96px 1fr 1fr', gap:8 }}>
        <select className="nf-select" value={apm} onChange={e=>setApm(e.target.value)}>
          <option>오전</option><option>오후</option>
        </select>
        <select className="nf-select" value={hour} onChange={e=>setHour(parseInt(e.target.value,10))}>
          {HourOptions.map(h=><option key={h} value={h}>{h}시</option>)}
        </select>
        <select className="nf-select" value={min} onChange={e=>setMin(parseInt(e.target.value,10))}>
          {MinOptions.map(m=><option key={m} value={m}>{pad2(m)}분</option>)}
        </select>
      </div>
    </div>
  )
}
