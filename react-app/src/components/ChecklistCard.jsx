import React, { useState, useEffect } from 'react'

export default function ChecklistCard({ API, token }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/v1/checklists`, { headers })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      // only show items with is_clear === 0 (server returns `is_clear` and `title`)
      const filtered = list.filter(it => Number(it.is_clear) === 0)
      // normalize fields so UI code can rely on `checklist_title`
      const normalized = filtered.map(it => ({ ...it, checklist_title: it.title ?? it.checklist_title }))
      // Use server-provided order (do not sort on client)
      setItems(normalized)
    } catch (err) {
      console.error('[Checklist] fetch failed', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const createItem = async () => {
    const title = (newTitle || '').trim()
    if (!title) return
    try {
      // backend expects `title` as a query parameter for this endpoint
      const res = await fetch(`${API}/api/v1/checklists?title=${encodeURIComponent(title)}`, {
        method: 'POST',
        headers
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        console.error('[Checklist] create failed', res.status, txt)
        alert(`체크리스트 생성 실패: ${res.status} ${txt}`)
        return
      }
      // re-fetch to get server-side ordering and consistent data
      await fetchItems()
      setNewTitle('')
    } catch (err) {
      console.error('[Checklist] create failed', err)
      alert('체크리스트 생성 실패')
    }
  }

  const toggleClear = async (it) => {
    const next = it.is_clear ? 0 : 1
    // remove immediately from view (we only show is_clear === 0)
    setItems(prev => prev.filter(p => p.id !== it.id))
    try {
      // backend expects is_clear as a query param
      const res = await fetch(`${API}/api/v1/checklists/${it.id}/clear?is_clear=${encodeURIComponent(next)}`, {
        method: 'PATCH',
        headers
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        console.error('[Checklist] patch failed', res.status, txt)
        throw new Error(`patch failed: ${res.status} ${txt}`)
      }
      // success - nothing to do (item already removed)
    } catch (err) {
      console.error('[Checklist] toggle failed', err)
      // rollback: re-fetch from server to restore consistent state
      await fetchItems()
      alert('상태 변경 실패')
    }
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>체크리스트</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          className="nf-input"
          placeholder="새 항목 추가"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') createItem() }}
          style={{ flex: 1 }}
        />
        <button className="nf-btn nf-btn--primary" onClick={createItem}>추가</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--nf-muted)' }}>로딩 중…</div>
      ) : items.length === 0 ? (
        <div style={{ color: 'var(--nf-muted)' }}>체크리스트가 없습니다.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          {items.map(it => (
            <li key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: '100%' }}>
                <input type="checkbox" className="nf-checklist-checkbox" checked={Boolean(it.is_clear)} onChange={() => toggleClear(it)} />
                <span style={{ color: 'inherit' }}>{it.title ?? it.checklist_title}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
