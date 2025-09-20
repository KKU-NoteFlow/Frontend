// src/screen/Main.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import '@toast-ui/editor/dist/toastui-editor.css';
import '../css/Main.css'
import { Skeleton, EmptyState, Card, Progress } from '../ui'
import DashboardTimetable from '../components/DashboardTimetable'

export default function MainPage() {
  const navigate = useNavigate()

  // URL 파라미터 :folderId
  const { folderId } = useParams()
  const parsedFolderId = folderId ? parseInt(folderId, 10) : null

  // Layout에서 내려준 context
  const {
    filter,               // 'all' | 'recent' | 'favorites'
    fileUploadTimestamp,  // 업로드 시마다 갱신되는 timestamp
  } = useOutletContext()

  // 상태: 노트 목록, 파일 목록, 그리고 폴더명
  const [notes, setNotes]     = useState([])
  const [files, setFiles]     = useState([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [folders, setFolders] = useState([])
  const [folderName, setFolderName] = useState('')

  // 드래그 오버 상태 (true면 배경색 강조)
  const [isDragOver, setIsDragOver] = useState(false)

  const token = localStorage.getItem('access_token')
  const API = import.meta.env.VITE_API_BASE_URL ?? ''

  // 폴더(과목) 목록 로드 → 과목별 카드에서 사용
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

  // ────────────────────────────────────────────────────────────────
  // 1) 폴더명 가져오기 (parsedFolderId 변경 시)
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!parsedFolderId) {
      setFolderName('')
      return
    }
    fetch(`${API}/api/v1/folders`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('폴더 목록 불러오기 실패')
        return res.json()
      })
      .then((data) => {
        const found = data.find((f) => f.id === parsedFolderId)
        setFolderName(found ? found.name : '')
      })
      .catch((err) => {
        console.error('폴더명 가져오기 실패:', err)
        setFolderName('')
      })
  }, [parsedFolderId, API, token])

  // ────────────────────────────────────────────────────────────────
  // 2) 노트 목록 가져오기 (filter, parsedFolderId 변경 시)
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!parsedFolderId) {
      setLoadingNotes(true)
      let url = filter === 'recent' ? '/api/v1/notes/recent' : '/api/v1/notes'
      fetch(`${API}${url}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
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
            setNotes(data.filter((n) => n.is_favorite))
          } else {
            setNotes(data)
          }
        })
        .catch((err) => {
          console.error('노트 불러오기 실패:', err)
          setNotes([])
        })
        .finally(() => setLoadingNotes(false))
      setFiles([])
    } else {
      setLoadingNotes(true)
      fetch(`${API}/api/v1/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      })
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
        .catch((err) => {
          console.error('폴더 내 노트 불러오기 실패:', err)
          setNotes([])
        })
        .finally(() => setLoadingNotes(false))
    }
  }, [filter, parsedFolderId, API, token])

  // ────────────────────────────────────────────────────────────────
  // 3) 파일 목록 가져오기 (parsedFolderId, fileUploadTimestamp 변경 시)
  // ────────────────────────────────────────────────────────────────
  const fetchFiles = useCallback(() => {
    if (parsedFolderId !== null) {
      setLoadingFiles(true)
      fetch(`${API}/api/v1/files/list/${parsedFolderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error('파일 목록 불러오기 실패')
          return res.json()
        })
        .then((data) => {
          setFiles(data)
        })
        .catch((err) => {
          console.error('폴더 내 파일 목록 불러오기 실패:', err)
          setFiles([])
        })
        .finally(() => setLoadingFiles(false))
    } else {
      setFiles([])
    }
  }, [parsedFolderId, API, token])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles, fileUploadTimestamp])

  // OCR로 새 노트 생성 시, 새로고침 없이 목록을 즉시 갱신
  useEffect(() => {
    const handler = () => {
      // 기존 목록 패치 로직 재사용
      if (!parsedFolderId) {
        setLoadingNotes(true)
        let url = filter === 'recent' ? '/api/v1/notes/recent' : '/api/v1/notes'
        fetch(`${API}${url}`, { headers: { Authorization: `Bearer ${token}` }})
          .then(res => (res.ok ? res.json() : []))
          .then((data) => {
            if (filter === 'favorites') setNotes(data.filter(n=>n.is_favorite))
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

  // ────────────────────────────────────────────────────────────────
  // 4) 드래그 앤 드롭: 파일 드롭 이벤트 처리 + 시각 피드백
  // ────────────────────────────────────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

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
        const res = await fetch(`${API}/api/v1/files/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        })
        if (!res.ok) {
          console.error(`[handleFileDrop] 업로드 실패: "${file.name}"`, res.status, await res.text())
        } else {
          console.log(`[handleFileDrop] 업로드 성공: "${file.name}"`)
        }
      } catch (err) {
        console.error(`[handleFileDrop] 예외 발생: "${file.name}"`, err)
      }
    }

    // 업로드 완료 후 즉시 목록 갱신
    fetchFiles()
  }

  // ────────────────────────────────────────────────────────────────
  // 5) 화면 렌더링: 폴더 선택 여부에 따라 노트 & 파일 분리 표시
  // ────────────────────────────────────────────────────────────────
  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const weeklyNotes = notes.filter(n => {
    const t = new Date(n.created_at).getTime()
    return isFinite(t) && now - t < weekMs
  })
  const weekRate = notes.length ? Math.min(100, Math.round((weeklyNotes.length / notes.length) * 100)) : 0
  const recentNotes = [...notes].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0,6)

  // 대시보드용 지표
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

  // refs for left column and timetable wrapper so we can set timetable height to match left column
  const timetableRef = useRef(null)
  const leftColRef = useRef(null)

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
        // Compute inner timetable content height (includes absolutely
        // positioned items). If the content spills beyond the left column
        // height, expand the wrapper so following content is pushed below
        // the visual bottom of the timetable.
        try {
          const inner = w.querySelector('.timetable-wrap')
          let innerH = inner ? inner.getBoundingClientRect().height : 0

          // Absolutely-positioned timetable items do NOT affect the
          // parent's bounding box. Find the bottom-most descendant and
          // include it in the computed height so the wrapper fully
          // contains visible timetable content.
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

    // use ResizeObserver to react to content/size changes of the left column
    const ro = new (window.ResizeObserver || function(){})(entries => {
      for (const entry of entries) {
        setHeight(entry.contentRect.height)
      }
    })
    const leftEl = left()
    if (leftEl && ro.observe) ro.observe(leftEl)

    // also adjust on window resize
    const onResize = () => setHeight(left() ? left().getBoundingClientRect().height : 0)
    window.addEventListener('resize', onResize)

    // initial set
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

  return (
    <main className="main-content nf-container" style={{ paddingTop: 'var(--nf-space-4)' }}>
      {/* 퀵 액션 리본 제거: 상단 ActionToolbar로 대체 */}
      {/* ──────────────────────────────────────────────────────────────── */}
      {/* 5-1) parsedFolderId가 null → 전체/최근/즐겨찾기 노트만 표시 */}
      {/* ──────────────────────────────────────────────────────────────── */}
      {parsedFolderId === null && (
        <>
        <div className="dashboard-grid" style={{ marginBottom: 16 }}>
          <div className="dashboard-left-col" ref={leftColRef} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            {/* Donut: 이번 주 비중 */}
            <Card>
              <h3 style={{ marginTop: 0 }}>이번 주 비중</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: `conic-gradient(var(--nf-primary) 0 ${weekRate}%, var(--nf-surface-2) ${weekRate}% 100%)`,
                  display: 'grid', placeItems: 'center'
                }}>
                  <div style={{ background: 'var(--nf-surface)', borderRadius: '50%', width: 48, height: 48, display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                    {weekRate}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{weeklyNotes.length}개</div>
                  <div style={{ color: 'var(--nf-muted)' }}>이번 주 생성 노트</div>
                </div>
              </div>
            </Card>

            {/* 최근 30일 생성 추이 */}
            <Card>
              <h3 style={{ marginTop: 0 }}>최근 30일 생성 추이</h3>
              <div style={{ display:'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: 2, alignItems: 'end', height: 80 }}>
                {last30.map((d,idx)=> (
                  <div key={idx} title={`${d.ymd}: ${d.count}`}
                    style={{ height: `${(d.count/last30Max)*80 || 2}px`, background: 'linear-gradient(180deg, var(--nf-primary), rgba(0,146,63,0.3))', borderRadius: 3 }} />
                ))}
              </div>
            </Card>

            {/* 제거: 요일 요약 */}
            {/* 폴더별 노트 수 Top 5 (moved into left column) */}
            <Card>
              <h3 style={{ margin: '0 0 8px 0' }}>폴더별 노트 수 Top 5</h3>
              <div style={{ display:'grid', gap:8 }}>
                {folderTop5.length === 0 && <div style={{ color:'var(--nf-muted)' }}>데이터가 없습니다.</div>}
                {folderTop5.map((f, idx) => {
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
                })}
              </div>
            </Card>
          </div>
          {/* 요일별 그래프 (제거) — 시간표를 오른쪽 빈 공간에 배치 */}
          <div className="dashboard-timetable-wrap" ref={el => timetableRef.current = el} style={{ minWidth: 260 }}>
            <DashboardTimetable className="dashboard-timetable" />
          </div>
        </div>

        {/* 과목별 모아보기(폴더 기준) - 그리드 외부로 이동해서 항상 시간표 아래에 렌더되도록 함 */}
        <div className="dashboard-grid__full" style={{ marginTop: 48 }}>
          {folders.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ margin: '24px 0 8px 0' }}>과목별 모아보기</h3>
              </div>
              {folders.slice(0, 9).map(f => (
                <Card key={f.id} style={{ padding: 12, cursor: 'default' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                  <div style={{ color: 'var(--nf-muted)', fontSize: '0.9rem' }}>노트 {notes.filter(n => n.folder_id === f.id).length}개</div>
                </Card>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--nf-muted)' }}>폴더(과목) 데이터가 없습니다.</p>
          )}
        </div>
          {/* 최근 노트 섹션 제거 (요청에 따라 텍스트 대신 차트 중심 구성) */}
        {false && (
        <section className="main-note-list" aria-live="polite">
          {loadingNotes && (
            <>
              <Skeleton height={72} style={{ marginBottom: 12 }} />
              <Skeleton height={72} style={{ marginBottom: 12 }} />
              <Skeleton height={72} style={{ marginBottom: 12 }} />
            </>
          )}
          {!loadingNotes && notes.length === 0 && (
            <EmptyState title="표시할 노트가 없습니다" description="새 노트를 작성하거나 파일을 업로드해 보세요." action={<button className="nf-btn nf-btn--primary" onClick={() => navigate('/notes/new')}>새 노트</button>} />
          )}
          {!loadingNotes && notes.map((note) => (
            <Card
              key={note.id}
              className="main-note-item nf-card"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('noteId', note.id)
                e.dataTransfer.setData('type', 'note')
              }}
              onClick={() => navigate(`/notes/${note.id}`)}
            >
              <h3 className="main-note-title">{note.title}</h3>
              <p className="main-note-preview">
                {note.content?.slice(0, 100) || ''}
              </p>
              <span className="main-note-date">
                {new Date(note.created_at).toLocaleDateString()}
              </span>
            </Card>
          ))}
        </section>
        )}
        </>
      )}

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* 5-2) parsedFolderId가 숫자 → 해당 폴더 ID 내 노트 & 파일 표시 */}
      {/* ──────────────────────────────────────────────────────────────── */}
      {parsedFolderId !== null && (
        <>
          {/* 5-2-1) 헤더 */}
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>
            {folderName || `폴더 #${parsedFolderId}`}
          </h2>

          {/* 5-2-2) 폴더 내 노트 섹션 */}
          <section className="main-note-list" aria-live="polite">
            {loadingNotes && (
              <>
                <Skeleton height={72} style={{ marginBottom: 12 }} />
                <Skeleton height={72} style={{ marginBottom: 12 }} />
              </>
            )}
            {!loadingNotes && notes.length === 0 ? (
              <EmptyState title="이 폴더에는 노트가 없습니다" action={<button className="nf-btn nf-btn--primary" onClick={() => navigate('/notes/new')}>새 노트</button>} />
            ) : (
              !loadingNotes && notes.map((note) => (
                <Card
                  key={note.id}
                  className="main-note-item nf-card"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('noteId', note.id)
                    e.dataTransfer.setData('type', 'note')
                  }}
                  onClick={() => navigate(`/notes/${note.id}`)}
                >
                  <h3 className="main-note-title">{note.title}</h3>
                  <p className="main-note-preview">
                    {note.content?.slice(0, 100) || ''}
                  </p>
                  <span className="main-note-date">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </Card>
              ))
            )}
          </section>

          {/* 5-2-3) 구분선 */}
          <hr style={{ margin: '1.5rem 0', borderColor: '#ddd' }} />

          {/* 5-2-4) 폴더 내 파일 섹션 (드래그 앤 드롭 허용) */}
          <h3 style={{ marginBottom: '0.5rem' }}>업로드된 파일 ({files.length})</h3>
          <section
            className={`main-file-list ${
              isDragOver ? 'drag-over' : ''
            }`}
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
                    onClick={() => {
                      // 클릭 시 미리보기/다운로드 (새 탭)
                      window.open(
                        `${API}/api/v1/files/download/${f.file_id}`,
                        '_blank'
                      )
                    }}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.classList.add('hover'))}
                    onMouseLeave={(e) => (e.currentTarget.classList.remove('hover'))}
                  >
                    {/* 간단한 파일 아이콘 */}
                    <div className="main-file-icon">{/* file */}</div>
                    <div className="main-file-meta">
                      <span className="main-file-name">{f.original_name}</span>
                      <span className="main-file-date">{new Date(f.created_at).toLocaleDateString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {/*
              <div style={{ textAlign: 'center', color: '#999', marginTop: '1rem' }}>
                파일을 이 영역으로 드래그 앤 드롭하면 바로 업로드됩니다.
              </div>
            */}
          </section>
        </>
      )}
    </main>
  )
}
