// src/screen/Main.jsx
import React, { useState, useEffect, useCallback } from 'react'
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
  const API = import.meta.env.VITE_API_BASE_URL

  // 폴더(과목) 목록 로드 → 과목별 카드에서 사용
  useEffect(() => {
    fetch(`${API}/api/v1/folders`, { headers: { Authorization: `Bearer ${token}` }})
      .then(res => (res.ok ? res.json() : []))
      .then(setFolders)
      .catch(() => setFolders([]))
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
        .then((res) => {
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
        .then((res) => {
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
      {/* 퀵 액션 리본: 기존 기능 그대로 트리거(이벤트) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button className="nf-btn nf-btn--primary" onClick={() => navigate('/notes/new')}>새 노트</button>
        <button className="nf-btn" onClick={() => window.dispatchEvent(new Event('nf:upload'))}>업로드</button>
        <button className="nf-btn" onClick={() => window.dispatchEvent(new Event('nf:ocr'))}>텍스트 변환</button>
        <button className="nf-btn" onClick={() => window.dispatchEvent(new Event('nf:record'))}>녹음</button>
        <button className="nf-btn" onClick={() => window.dispatchEvent(new Event('nf:summarize'))}>요약</button>
      </div>
      {/* ──────────────────────────────────────────────────────────────── */}
      {/* 5-1) parsedFolderId가 null → 전체/최근/즐겨찾기 노트만 표시 */}
      {/* ──────────────────────────────────────────────────────────────── */}
      {parsedFolderId === null && (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
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

            {/* 즐겨찾기 비율 바 차트 */}
            <Card>
              <h3 style={{ marginTop: 0 }}>즐겨찾기 비율</h3>
              {(() => {
                const fav = notes.filter(n => n.is_favorite).length
                const total = Math.max(1, notes.length)
                const favPct = Math.round((fav/total)*100)
                return (
                  <div>
                    <div className="nf-progress" aria-label="즐겨찾기 비율"><div className="nf-progress__bar" style={{ width: `${favPct}%` }} /></div>
                    <div style={{ marginTop: 6, color: 'var(--nf-muted)', fontSize: '0.9rem' }}>{fav} / {total}</div>
                  </div>
                )
              })()}
            </Card>

            {/* 미니 막대: 요일별 생성 요약 */}
            <Card>
              <h3 style={{ marginTop: 0 }}>요일 요약</h3>
              {(() => {
                const counts = new Array(7).fill(0)
                weeklyNotes.forEach(n => { const d = new Date(n.created_at).getDay(); if (!isNaN(d)) counts[d]++ })
                const max = Math.max(1, ...counts)
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 48 }}>
                    {counts.map((c,i) => (
                      <div key={i} title={String(c)} style={{ width: 10, height: `${(c/max)*48}px`, background: 'var(--nf-primary)', borderRadius: 3 }} />
                    ))}
                  </div>
                )
              })()}
            </Card>
          </div>
          {/* 요일별 그래프 */}
          <div>
            <h3 style={{ margin: '0 0 8px 0' }}>요일별 생성</h3>
            {(() => {
              const days = ['일','월','화','수','목','금','토']
              const counts = new Array(7).fill(0)
              weeklyNotes.forEach(n => { const d = new Date(n.created_at).getDay(); if (!isNaN(d)) counts[d]++ })
              const max = Math.max(1, ...counts)
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, alignItems: 'end' }}>
                  {counts.map((c,i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <div style={{ width: 12, height: `${(c/max)*60}px`, background: 'var(--nf-primary)', borderRadius: 4 }} />
                      </div>
                      <div style={{ color: 'var(--nf-muted)', fontSize: '0.8rem' }}>{days[i]}</div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
          {/* 태그별 비중(데이터 없으면 안내) */}
          <div>
            <h3 style={{ margin: '0 0 8px 0' }}>태그별 비중</h3>
            {Array.isArray(notes) && notes.some(n => Array.isArray(n.tags) && n.tags.length) ? (
              (() => {
                const map = new Map()
                notes.forEach(n => (n.tags||[]).forEach(t => map.set(t, (map.get(t)||0)+1)))
                const arr = Array.from(map.entries()).sort((a,b) => b[1]-a[1]).slice(0,6)
                const total = Math.max(1, ...Array.from(map.values()).reduce((a,b)=>a+b,0))
                return (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {arr.map(([tag,count]) => (
                      <span key={String(tag)} className="nf-chip">{String(tag)} <span style={{ color: 'var(--nf-muted)' }}>{Math.round((count/total)*100)}%</span></span>
                    ))}
                  </div>
                )
              })()
            ) : (
              <p style={{ color: 'var(--nf-muted)' }}>태그 데이터가 없습니다.</p>
            )}
          </div>
          {/* 시간표 */}
          <DashboardTimetable />

          {/* 과목별 모아보기(폴더 기준) */}
          <div>
            <h3 style={{ margin: '0 0 8px 0' }}>과목별 모아보기</h3>
            {folders.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {folders.slice(0, 9).map(f => (
                  <Card key={f.id} style={{ padding: 12, cursor: 'pointer' }} onClick={() => navigate(`/main/${f.id}`)}>
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
        </div>
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderBottom: '1px solid var(--nf-border)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--nf-surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* 간단한 파일 아이콘 */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        background: 'var(--nf-surface-2)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '0.75rem',
                        fontSize: '1.2rem',
                      }}
                    >
                      {/* file */}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '1rem', color: 'var(--nf-text)' }}>
                        {f.original_name}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--nf-muted)' }}>
                        {new Date(f.created_at).toLocaleDateString()}
                      </span>
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
