import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import '@toast-ui/editor/dist/toastui-editor.css';
import '../css/Main.css'
import { Skeleton, EmptyState, Card, Progress, Modal, Button } from '../ui'
import DashboardTimetable from '../components/DashboardTimetable'
import ChecklistCard from '../components/ChecklistCard'
import ToastMarkdownEditor from '../components/ToastMarkdownEditor'
import axios from 'axios'

export default function MainPage() {
  const navigate = useNavigate()
  const { folderId } = useParams()
  const parsedFolderId = folderId ? parseInt(folderId, 10) : null

  const { filter, fileUploadTimestamp } = useOutletContext()

  const [notes, setNotes]     = useState([])
  const [files, setFiles]     = useState([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [folders, setFolders] = useState([])
  const [folderName, setFolderName] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const token = localStorage.getItem('access_token')
  const API = import.meta.env.VITE_API_BASE_URL ?? ''

  const [quickOpen, setQuickOpen] = useState(false)
  const [quickNote, setQuickNote] = useState(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickContent, setQuickContent] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)

  const openQuick = (note) => {
    setQuickNote(note)
    setQuickTitle(note.title || '')
    setQuickContent(note.content || '')
    setQuickOpen(true)
  }
  const closeQuick = () => { setQuickOpen(false); setQuickNote(null) }
  const saveQuick = async () => {
    if (!quickNote) return
    setQuickSaving(true)
    try {
      const res = await fetch(`${API}/api/v1/notes/${quickNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: quickTitle, content: quickContent, folder_id: quickNote.folder_id })
      })
      if (!res.ok) throw new Error('save failed')
      const updated = await res.json()
      setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))
      closeQuick()
    } catch (e) {
      console.error('[QuickEdit] save failed', e)
      alert('저장 실패')
    } finally {
      setQuickSaving(false)
    }
  }

  const uploadImageQuick = async (file) => {
    if (!quickNote) return null
    const form = new FormData()
    form.append('upload_file', file)
    form.append('folder_id', quickNote.folder_id ?? '')
    const { data } = await axios.post(`${API}/api/v1/files/upload`, form, { headers: { Authorization: `Bearer ${token}` } })
    return data.url
  }

  useEffect(() => {
    fetch(`${API}/api/v1/folders`, { headers: { Authorization: `Bearer ${token}` }})
      .then(async (res) => {
        if (res.status === 401) {
          console.warn('[Main] 401 Unauthorized when fetching folders; redirecting to login')
          try { localStorage.removeItem('access_token') } catch {}
          navigate('/', { replace: true })
          return []
        }
        if (!res.ok) throw new Error('폴더 목록 불러오기 실패')
        return res.json()
      })
      .then(setFolders)
      .catch((err) => {
        console.error('[Main] 폴더 불러오기 실패:', err)
        setFolders([])
      })
  }, [API, token])

  useEffect(() => {
    if (!parsedFolderId) {
      setFolderName('')
      return
    }
    fetch(`${API}/api/v1/folders`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { if (!res.ok) throw new Error('폴더 목록 불러오기 실패'); return res.json() })
      .then((data) => {
        const found = data.find((f) => f.id === parsedFolderId)
        setFolderName(found ? found.name : '')
      })
      .catch((err) => { console.error('폴더명 가져오기 실패:', err); setFolderName('') })
  }, [parsedFolderId, API, token])

  // 노트 목록 로드 (favorites 포함)
  useEffect(() => {
    if (!parsedFolderId) {
      setLoadingNotes(true)
      let url = filter === 'recent' ? '/api/v1/notes/recent' : '/api/v1/notes'
      fetch(`${API}${url}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async (res) => {
          if (res.status === 401) {
            console.warn('[Main] 401 Unauthorized when fetching notes; redirecting to login')
            try { localStorage.removeItem('access_token') } catch {}
            navigate('/', { replace: true })
            return []
          }
          if (!res.ok) throw new Error('노트 불러오기 실패')
          return res.json()
        })
        .then((data) => {
          if (filter === 'favorites') {
            setNotes(data.filter((n) => Boolean(n.is_favorite)))
          } else {
            setNotes(data)
          }
        })
        .catch((err) => { console.error('노트 불러오기 실패:', err); setNotes([]) })
        .finally(() => setLoadingNotes(false))
      setFiles([])
    } else {
      setLoadingNotes(true)
      fetch(`${API}/api/v1/notes`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async (res) => {
          if (res.status === 401) {
            console.warn('[Main] 401 Unauthorized when fetching folder notes; redirecting to login')
            try { localStorage.removeItem('access_token') } catch {}
            navigate('/', { replace: true })
            return []
          }
          if (!res.ok) throw new Error('노트 불러오기 실패')
          return res.json()
        })
        .then((data) => {
          const filteredNotes = data.filter((n) => n.folder_id === parsedFolderId)
          setNotes(filteredNotes)
        })
        .catch((err) => { console.error('폴더 내 노트 불러오기 실패:', err); setNotes([]) })
        .finally(() => setLoadingNotes(false))
    }
  }, [filter, parsedFolderId, API, token])

  const fetchFiles = useCallback(() => {
    if (parsedFolderId !== null) {
      setLoadingFiles(true)
      fetch(`${API}/api/v1/files/list/${parsedFolderId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => { if (!res.ok) throw new Error('파일 목록 불러오기 실패'); return res.json() })
        .then((data) => { setFiles(data) })
        .catch((err) => { console.error('폴더 내 파일 목록 불러오기 실패:', err); setFiles([]) })
        .finally(() => setLoadingFiles(false))
    } else {
      setFiles([])
    }
  }, [parsedFolderId, API, token])

  useEffect(() => { fetchFiles() }, [fetchFiles, fileUploadTimestamp])

  useEffect(() => {
    const handler = () => {
      if (!parsedFolderId) {
        setLoadingNotes(true)
        let url = filter === 'recent' ? '/api/v1/notes/recent' : '/api/v1/notes'
        fetch(`${API}${url}`, { headers: { Authorization: `Bearer ${token}` }})
          .then(res => (res.ok ? res.json() : []))
          .then((data) => {
            if (filter === 'favorites') setNotes(data.filter(n=>Boolean(n.is_favorite)))
            else setNotes(data)
          })
          .finally(() => setLoadingNotes(false))
      } else {
        setLoadingNotes(true)
        fetch(`${API}/api/v1/notes`, { headers: { Authorization: `Bearer ${token}` }})
          .then(res => (res.ok ? res.json() : []))
          .then((data) => setNotes(data.filter(n => n.folder_id === parsedFolderId)))
          .finally(() => setLoadingNotes(false))
      }
    }
    window.addEventListener('nf:notes-refresh', handler)
    return () => window.removeEventListener('nf:notes-refresh', handler)
  }, [API, token, parsedFolderId, filter])

  const handleDragOver = (e) => { e.preventDefault() }
  const handleDragEnter = (e) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false) }

  const handleFileDrop = async (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (parsedFolderId === null) {
      alert('먼저 업로드할 폴더를 선택하세요.')
      return
    }
    const droppedFiles = e.dataTransfer.files
    if (!droppedFiles || droppedFiles.length === 0) return
    for (let i = 0; i < droppedFiles.length; i++) {
      const file = droppedFiles[i]
      const formData = new FormData()
      formData.append('upload_file', file)
      formData.append('folder_id', parsedFolderId)
      console.log(`[handleFileDrop] 파일 업로드 요청 → "${file.name}" → 폴더 ${parsedFolderId}`)
      try {
        const res = await fetch(`${API}/api/v1/files/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
        if (!res.ok) {
          console.error(`[handleFileDrop] 업로드 실패: "${file.name}"`, res.status, await res.text())
        } else {
          console.log(`[handleFileDrop] 업로드 성공: "${file.name}"`)
        }
      } catch (err) {
        console.error(`[handleFileDrop] 예외 발생: "${file.name}"`, err)
      }
    }
    fetchFiles()
  }

  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const weeklyNotes = notes.filter(n => {
    const t = new Date(n.created_at).getTime()
    return isFinite(t) && now - t < weekMs
  })
  const weekRate = notes.length ? Math.min(100, Math.round((weeklyNotes.length / notes.length) * 100)) : 0
  const recentNotes = [...notes].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0,6)

  const dayNames = ['일','월','화','수','목','금','토']
  const dayCounts = (() => {
    const arr = new Array(7).fill(0)
    notes.forEach(n => { const d = new Date(n.created_at).getDay(); if (!isNaN(d)) arr[d]++ })
    return arr
  })()
  const dayMax = Math.max(1, ...dayCounts)
  const last30 = (() => {
    const days = []
    for (let i=29;i>=0;i--) {
      const d = new Date(now - i*24*60*60*1000)
      const ymd = d.toISOString().slice(0,10)
      const c = notes.filter(n => new Date(n.created_at).toISOString().slice(0,10) === ymd).length
      days.push({ ymd, count: c })
    }
    return days
  })()
  const last30Max = Math.max(1, ...last30.map(x => x.count))
  const folderTop5 = (() => {
    const map = new Map()
    notes.forEach(n => {
      const key = n.folder_id ?? '루트'
      map.set(key, (map.get(key)||0)+1)
    })
    const arr = Array.from(map.entries()).map(([k,v]) => ({ key: k, count: v }))
    arr.sort((a,b)=>b.count-a.count)
    return arr.slice(0,5)
  })()

  const timetableRef = useRef(null)
  const leftColRef = useRef(null)
  const last30Ref = useRef(null)
  const [last30Tooltip, setLast30Tooltip] = useState({ visible: false, text: '', x: 0, y: 0 })

  useEffect(() => {
    const wrap = () => timetableRef.current
    const left = () => leftColRef.current || document.querySelector('.dashboard-left-col')
    if (!wrap()) return
    const setHeight = (h) => {
      const w = wrap()
      if (!w) return
      if (window.innerWidth <= 900) {
        w.style.height = 'auto'
      } else {
        try {
          const inner = w.querySelector('.timetable-wrap')
          let innerH = inner ? inner.getBoundingClientRect().height : 0
          if (inner) {
            const ib = inner.getBoundingClientRect()
            let maxBottom = ib.height
            const elems = inner.querySelectorAll('*')
            elems.forEach(el => {
              const cb = el.getBoundingClientRect()
              const relBottom = cb.bottom - ib.top
              if (relBottom > maxBottom) maxBottom = relBottom
            })
            innerH = Math.max(innerH, maxBottom)
          }
          const target = Math.max(h || 0, innerH || 0)
          w.style.height = target ? `${Math.round(target)}px` : 'auto'
        } catch (err) {
          w.style.height = h ? `${Math.round(h)}px` : 'auto'
        }
      }
    }
    const ro = new (window.ResizeObserver || function(){})(entries => {
      for (const entry of entries) { setHeight(entry.contentRect.height) }
    })
    const leftEl = left()
    if (leftEl && ro.observe) ro.observe(leftEl)
    const onResize = () => setHeight(left() ? left().getBoundingClientRect().height : 0)
    window.addEventListener('resize', onResize)
    setHeight(leftEl ? leftEl.getBoundingClientRect().height : 0)
    return () => {
      if (leftEl && ro.unobserve) ro.unobserve(leftEl)
      window.removeEventListener('resize', onResize)
    }
  }, [notes, folders, last30Max])

  const toggleFavoriteQuick = async (note) => {
    try {
      const res = await fetch(`${API}/api/v1/notes/${note.id}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_favorite: !note.is_favorite })
      })
      if (res.ok) {
        const updated = await res.json()
        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))
      }
    } catch {}
  }

  // ========================= RENDER =========================
  return (
    <>
    <main className="main-content nf-container" style={{ paddingTop: 'var(--nf-space-4)' }}>
      {/* ✅ 즐겨찾기 보기: 대시보드 대신 "콤팩트 카드 그리드" */}
      {parsedFolderId === null && filter === 'favorites' ? (
        <section aria-live="polite">
          <h2 style={{ margin: '0 0 12px 2px' }}>즐겨찾기 노트</h2>

          {loadingNotes ? (
            <>
              <Skeleton height={72} style={{ marginBottom: 12 }} />
              <Skeleton height={72} style={{ marginBottom: 12 }} />
            </>
          ) : notes.length === 0 ? (
            <EmptyState title="즐겨찾기한 노트가 없습니다" />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12
              }}
            >
              {notes.map((note) => {
                const preview = (note.content || '')
                  .replace(/<[^>]*>/g, '') // html 제거
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 160)

                return (
                  <Card
                    key={note.id}
                    className="nf-card"
                    style={{
                      padding: 12,
                      display: 'grid',
                      gridTemplateRows: 'auto 1fr auto',
                      gap: 8,
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    onDoubleClick={(e) => { e.preventDefault(); openQuick(note) }}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('noteId', note.id)
                      e.dataTransfer.setData('type', 'note')
                    }}
                  >
                    {/* 헤더 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <h3
                        className="main-note-title"
                        style={{
                          margin: 0,
                          fontSize: '1rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '75%'
                        }}
                      >
                        {note.title}
                      </h3>
                      <button
                        className="nf-btn"
                        onClick={(e) => { e.stopPropagation(); toggleFavoriteQuick(note) }}
                        title={note.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                        style={{ padding: '4px 8px', fontSize: 12 }}
                        aria-label={note.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                      >
                        {note.is_favorite ? '★' : '☆'}
                      </button>
                    </div>

                    {/* 본문 프리뷰 */}
                    <p
                      className="main-note-preview"
                      style={{
                        margin: 0,
                        color: 'var(--nf-muted)',
                        fontSize: '.95rem',
                        lineHeight: 1.45,
                        maxHeight: 84,
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {preview}
                    </p>

                    {/* 푸터 메타 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <button
                        className="nf-btn"
                        style={{ padding: '4px 8px', fontSize: 12 }}
                        onClick={(e) => { e.stopPropagation(); openQuick(note) }}
                      >
                        빠른 편집
                      </button>
                      <span className="main-note-date" style={{ color: 'var(--nf-muted)', fontSize: '.9rem' }}>
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      ) : (
        // ===== 기존 대시보드/폴더 화면 유지 =====
        <>
          {parsedFolderId === null && (
            <>
              <div className="dashboard-grid" style={{ marginBottom: 16 }}>
                <div className="dashboard-left-col" ref={leftColRef} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                  <Card><ChecklistCard API={API} token={token} /></Card>
                  <Card>
                    <h3 style={{ marginTop: 0 }}>최근 30일 생성 추이</h3>
                  <div ref={last30Ref} style={{ position: 'relative' }}>
                    <div style={{ display:'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: 2, alignItems: 'end', height: 80 }}>
                      {last30.map((d, idx) => (
                        <div
                          key={idx}
                          onMouseEnter={(e) => {
                            try {
                              const rect = last30Ref.current?.getBoundingClientRect()
                              const x = rect ? e.clientX - rect.left : 0
                              const y = rect ? e.clientY - rect.top : 0
                              const dayIdx = isFinite(new Date(d.ymd).getDay()) ? new Date(d.ymd).getDay() : null
                              const dayLabel = dayIdx !== null ? dayNames[dayIdx] : ''
                              setLast30Tooltip({ visible: true, text: `${d.ymd} (${dayLabel}) · ${d.count}개`, x, y })
                            } catch (err) { /* ignore */ }
                          }}
                          onMouseMove={(e) => {
                            try {
                              const rect = last30Ref.current?.getBoundingClientRect()
                              const x = rect ? e.clientX - rect.left : 0
                              const y = rect ? e.clientY - rect.top : 0
                              setLast30Tooltip(prev => ({ ...prev, x, y }))
                            } catch (err) {}
                          }}
                          onMouseLeave={() => setLast30Tooltip({ visible: false, text: '', x: 0, y: 0 })}
                          style={{ height: `${(d.count/last30Max)*80 || 2}px`, background: 'linear-gradient(180deg, var(--nf-primary), rgba(0,146,63,0.3))', borderRadius: 3 }}
                        />
                      ))}
                    </div>

                    {last30Tooltip.visible && (
                      <div
                        style={{
                          position: 'absolute',
                          left: last30Tooltip.x,
                          top: last30Tooltip.y,
                          transform: 'translate(-50%, -120%)',
                          background: 'rgba(34,51,59,0.94)',
                          color: '#fff',
                          padding: '6px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          pointerEvents: 'none',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 6px 18px rgba(10,15,10,0.12)',
                          zIndex: 60
                        }}
                      >
                        {last30Tooltip.text}
                      </div>
                    )}
                  </div>
                  </Card>
                  <Card>
                    <h3 style={{ margin: '0 0 8px 0' }}>폴더별 노트 수 Top 5</h3>
                    <div style={{ display:'grid', gap:8 }}>
                      {(() => {
                        const list = folderTop5
                        if (list.length === 0) return <div style={{ color:'var(--nf-muted)' }}>데이터가 없습니다.</div>
                        return list.map((f, idx) => {
                          const label = f.key === '루트'
                            ? '루트'
                            : (folders.find(ff => ff.id === f.key)?.name || `폴더 #${f.key}`)
                          const pct = Math.round((f.count / Math.max(1, folderTop5[0]?.count || 1)) * 100)
                          return (
                            <div key={idx} style={{ display:'grid', gap:6 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', color:'var(--nf-muted)' }}>
                                <span>{label}</span><span>{f.count}개</span>
                              </div>
                              <div className="nf-progress" aria-label={label}>
                                <div className="nf-progress__bar" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </Card>
                </div>
                <div className="dashboard-timetable-wrap" ref={el => timetableRef.current = el} style={{ minWidth: 260 }}>
                  <DashboardTimetable className="dashboard-timetable" />
                </div>
              </div>

              {/* '과목별 모아보기' 섹션 제거: 사용자 요청으로 해당 블록을 삭제했습니다. */}
            </>
          )}

          {parsedFolderId !== null && (
            <>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>
                {folderName || `폴더 #${parsedFolderId}`}
              </h2>

              <section className="main-note-list" aria-live="polite">
                {loadingNotes ? (
                  <>
                    <Skeleton height={72} style={{ marginBottom: 12 }} />
                    <Skeleton height={72} style={{ marginBottom: 12 }} />
                  </>
                ) : notes.length === 0 ? (
                  <EmptyState title="이 폴더에는 노트가 없습니다" action={<button className="nf-btn nf-btn--primary" onClick={() => navigate('/notes/new')}>새 노트</button>} />
                ) : (
                  notes.map((note) => (
                    <Card
                      key={note.id}
                      className="main-note-item nf-card"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('noteId', note.id)
                        e.dataTransfer.setData('type', 'note')
                      }}
                      onClick={() => navigate(`/notes/${note.id}`)}
                      onDoubleClick={(e) => { e.preventDefault(); openQuick(note) }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <h3 className="main-note-title">{note.title}</h3>
                        <button
                          className="nf-btn"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={(e) => { e.stopPropagation(); openQuick(note) }}
                        >
                          빠른 편집
                        </button>
                      </div>
                      <p className="main-note-preview">{note.content?.slice(0, 100) || ''}</p>
                      <span className="main-note-date">{new Date(note.created_at).toLocaleDateString()}</span>
                    </Card>
                  ))
                )}
              </section>

              <hr style={{ margin: '1.5rem 0', borderColor: '#ddd' }} />

              <h3 style={{ marginBottom: '0.5rem' }}>업로드된 파일 ({files.length})</h3>
              <section
                className={`main-file-list ${isDragOver ? 'drag-over' : ''}`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleFileDrop}
                style={{ minHeight: '150px' }}
              >
                {loadingFiles ? (
                  <>
                    <Skeleton height={48} style={{ marginBottom: 8 }} />
                    <Skeleton height={48} style={{ marginBottom: 8 }} />
                  </>
                ) : files.length === 0 ? (
                  <EmptyState title="업로드된 파일이 없습니다" description="파일을 드래그&드롭해 업로드할 수 있습니다." />
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {files.map((f) => (
                    <li
                        key={f.file_id}
                        className="main-file-item"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('fileId', String(f.file_id));
                          e.dataTransfer.setData('type', 'file');
                          e.dataTransfer.setData('application/x-nf-file', String(f.file_id));
                          e.dataTransfer.setData('text/plain', `nf-file:${f.file_id}`);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onClick={() => { window.open(`${API}/api/v1/files/download/${f.file_id}`, '_blank') }}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={(e) => (e.currentTarget.classList.add('hover'))}
                        onMouseLeave={(e) => (e.currentTarget.classList.remove('hover'))}
                      >
                        <div className="main-file-icon"></div>
                        <div className="main-file-meta">
                          <span className="main-file-name">{f.original_name}</span>
                          <span className="main-file-date">{new Date(f.created_at).toLocaleDateString()}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </>
      )}
    </main>

    {/* Quick Edit Modal */}
    <Modal open={quickOpen} onClose={closeQuick} title="빠른 편집">
      {quickNote && (
        <div>
          <input
            className="nf-input"
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            placeholder="제목"
            style={{ width: '100%', marginBottom: 8 }}
          />
          <div style={{ border: '1px solid var(--nf-border)', borderRadius: 8 }}>
            <ToastMarkdownEditor
              html={quickContent}
              onUpdate={setQuickContent}
              uploadImage={uploadImageQuick}
              onReady={() => {}}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button className="nf-btn" onClick={closeQuick}>취소</button>
            <Button onClick={saveQuick} disabled={quickSaving}>{quickSaving ? '저장중…' : '저장'}</Button>
          </div>
        </div>
      )}
    </Modal>
    </>
  )
}
