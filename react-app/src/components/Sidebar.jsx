import { FaFolderPlus, FaStickyNote } from 'react-icons/fa';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import '../css/Sidebar.css';

export default function Sidebar({ sidebarState = 'pinned', setSidebarState = () => {}, onFilterChange, onSelectFolder, onNoteSelect }) {
  const [flatFolders, setFlatFolders] = useState([]);
  const [treeFolders, setTreeFolders] = useState([]);
  const [openMap, setOpenMap] = useState({});
  const [folderNoteMap, setFolderNoteMap] = useState({});
  const [folderContextMenu, setFolderContextMenu] = useState({ visible: false, x: 0, y: 0, folderId: null });
  const [noteContextMenu, setNoteContextMenu] = useState({ visible: false, x: 0, y: 0, noteId: null, folderId: null });
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'recent' | 'favorites'
  const [openPanels, setOpenPanels] = useState({
    recent: activeFilter === 'recent',
    all: true,
    favorites: activeFilter === 'favorites',
    predicted: false
  })
  const [recentNotes, setRecentNotes] = useState([]);
  const [predictedItems, setPredictedItems] = useState([]);

  // 드래그 하이라이트 상태
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  const navigate = useNavigate();
  const contextMenuRef = useRef(null);
  const params = useParams();
  const location = useLocation();
  const currentFolderId = params.folderId ? parseInt(params.folderId, 10) : null;
  const currentNoteId = /^\/notes\//.test(location.pathname) && params.id ? parseInt(params.id, 10) : null;

  const loadFolders = useCallback(async () => {
    try {
      const API = import.meta.env.VITE_API_BASE_URL ?? '';
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/api/v1/folders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      const flattenList = [];
      const traverse = (node) => {
        flattenList.push({
          id: node.id,
          user_id: node.user_id,
          name: node.name,
          parent_id: node.parent_id,
        });
        if (node.children?.length) {
          node.children.forEach(child => traverse(child));
        }
      };
      data.forEach(root => traverse(root));
      setFlatFolders(flattenList);
    } catch (err) {
    }
  }, []);

  const loadNotes = useCallback(async () => {
    try {
      const API = import.meta.env.VITE_API_BASE_URL ?? '';
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/api/v1/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return;
      }
      const notes = await res.json();
      const map = {};
      notes.forEach(n => {
        const key = n.folder_id ?? null;
        if (!map[key]) map[key] = [];
        map[key].push(n);
      });
      setFolderNoteMap(map);
    } catch (err) {
    }
  }, []);

  useEffect(() => {
    loadFolders();
    loadNotes();
    const handler = () => { loadFolders(); loadNotes(); }
    window.addEventListener('nf:notes-refresh', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadFolders, loadNotes]);
    
    // NOTE: single listener is registered above in the same effect with cleanup

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const API = import.meta.env.VITE_API_BASE_URL ?? '';
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API}/api/v1/notes/recent`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        setRecentNotes(Array.isArray(data) ? data : []);
      } catch (e) { setRecentNotes([]) }
    }
    if (activeFilter === 'recent') fetchRecent()
  }, [activeFilter])

  useEffect(() => {
    const fetchPredicted = async () => {
      try {
        const API = import.meta.env.VITE_API_BASE_URL ?? '';
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API}/api/v1/notes/predicted`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          setPredictedItems([])
          return
        }
        const data = await res.json();
        setPredictedItems(Array.isArray(data) ? data : [])
      } catch (e) { setPredictedItems([]) }
    }
    if (openPanels.predicted) fetchPredicted()
  }, [openPanels.predicted])

  useEffect(() => {
    const tempMap = {};
    flatFolders.forEach(f => {
      tempMap[f.id] = { ...f, children: [], notes: folderNoteMap[f.id] || [] };
    });
    const roots = [];
    flatFolders.forEach(f => {
      if (f.parent_id == null) {
        roots.push(tempMap[f.id]);
      } else if (tempMap[f.parent_id]) {
        tempMap[f.parent_id].children.push(tempMap[f.id]);
      }
    });
    setTreeFolders(roots);
  }, [flatFolders, folderNoteMap]);

  // ── Drag & Drop 유틸 ─────────────────────────────────────────────
  const getDraggedNoteId = (dt) => {
    if (!dt) return null;
    // 1) 커스텀 타입
    const custom = dt.getData('application/x-nf-note');
    if (custom) return custom;
    // 2) 기존 키
    const legacy = dt.getData('noteId');
    if (legacy) return legacy;
    // 3) 텍스트 기반 fallback (Firefox 등)
    const plain = dt.getData('text/plain') || dt.getData('Text') || '';
    // 형식: "nf-note:<id>"
    const m = /^nf-note:(\d+|\w+)$/.exec(plain.trim());
    if (m) return m[1];
    return null;
  };

  const getDraggedFolderId = (dt) => {
    if (!dt) return null;
    const legacy = dt.getData('folderId');
    if (legacy) return legacy;
    const plain = dt.getData('text/plain') || dt.getData('Text') || '';
    const m = /^nf-folder:(\d+|\w+)$/.exec(plain.trim());
    if (m) return m[1];
    return null;
  };

  const getDraggedFileId = (dt) => {
    if (!dt) return null;
    const custom = dt.getData('application/x-nf-file');
    if (custom) return custom;
    const legacy = dt.getData('fileId') || dt.getData('file_id');
    if (legacy) return legacy;
    const plain = dt.getData('text/plain') || dt.getData('Text') || '';
    const m = /^nf-file:(\d+|\w+)$/.exec(plain.trim());
    if (m) return m[1];
    return null;
  };

  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault();
    setDragOverFolderId(null);

    // normalize targetFolderId: accept numbers or string ids; treat 'null'/'""' as null
    const normalizedTarget = (targetFolderId == null || targetFolderId === 'null' || targetFolderId === '') ? null : Number(targetFolderId)

    const API = import.meta.env.VITE_API_BASE_URL ?? '';
    const token = localStorage.getItem('access_token');

    // 파일 DnD 업로드
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles?.length) {
      let lastCreatedNote = null;
      for (let i = 0; i < droppedFiles.length; i++) {
        const file = droppedFiles[i];
        const formData = new FormData();
        formData.append('upload_file', file);
        formData.append('folder_id', String(targetFolderId));
        try {
          const res = await fetch(`${API}/api/v1/files/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          if (!res.ok) {
            continue;
          }
          let uploaded = null;
          try { uploaded = await res.json(); } catch (e) { uploaded = null; }
          if (uploaded && uploaded.url) {
            try {
              const noteBody = {
                title: uploaded.original_name || file.name || '첨부된 파일',
                content: `![${(uploaded.original_name||file.name).replace(/"/g,'')}](${uploaded.url})`,
                folder_id: targetFolderId,
              };
              const noteRes = await fetch(`${API}/api/v1/notes`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(noteBody),
              });
              if (noteRes.ok) {
                const created = await noteRes.json();
                lastCreatedNote = created;
              } else {
              }
            } catch (e) {
            }
          }
        } catch (err) {
        }
      }
      await loadNotes();
      onFilterChange?.('all');
      if (lastCreatedNote) {
        try {
          navigate(`/notes/${lastCreatedNote.id}`);
          onNoteSelect?.(lastCreatedNote);
        } catch {}
      }
      return;
    }

    // 폴더 이동
    const droppedFolderId = getDraggedFolderId(e.dataTransfer);
    if (droppedFolderId) {
      // prevent dropping into itself or its descendant
      const di = Number(droppedFolderId)
      const ti = normalizedTarget == null ? null : Number(normalizedTarget)
      if (di === ti || (ti !== null && isDescendant(di, ti))) {
        // ignore invalid move
      } else {
        try {
          // 루트로 이동할 때는 parent_id를 명시적으로 null로 보내도록 변경
          const body = normalizedTarget == null ? JSON.stringify({ parent_id: null }) : JSON.stringify({ parent_id: normalizedTarget })
          const url = `${API}/api/v1/folders/${droppedFolderId}`
          const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body,
          });
          const text = await res.text().catch(() => '')
          let parsed = null
          try { parsed = JSON.parse(text || '{}') } catch (e) { parsed = null }
          if (!res.ok) {
          } else {
            // 서버가 실제로 parent_id를 반영했는지 확인
            const returnedParent = parsed && Object.prototype.hasOwnProperty.call(parsed, 'parent_id') ? parsed.parent_id : undefined
            if (targetFolderId == null) {
              if (returnedParent !== null) {
                // 서버가 parent_id=null을 반영하지 않음 — 경고만 로그에 남김
                
              }
            } else {
              if (returnedParent !== undefined && Number(returnedParent) !== Number(targetFolderId)) {
                
              }
            }
            await loadFolders();
            onFilterChange?.('all');
            if (targetFolderId != null) setOpenMap(p => ({ ...p, [targetFolderId]: true }));
          }
        } catch (err) {
        }
      }
      return;
    }

    // 노트 이동
    const droppedNoteId = getDraggedNoteId(e.dataTransfer);
    // 파일 이동
    const droppedFileId = getDraggedFileId(e.dataTransfer);
    if (droppedFileId) {
      try {
        const body = normalizedTarget == null ? JSON.stringify({ folder_id: null }) : JSON.stringify({ folder_id: normalizedTarget })
        const url = `${API}/api/v1/files/${droppedFileId}`
        await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body })
        await loadNotes();
        onFilterChange?.('all');
        return;
      } catch (err) {
        // ignore client-side
        return;
      }
    }

    if (droppedNoteId) {
      try {
        // 루트로 이동할 때는 folder_id를 명시적으로 null로 보내도록 변경
        const body = normalizedTarget == null ? JSON.stringify({ folder_id: null }) : JSON.stringify({ folder_id: normalizedTarget })
        const url = `${API}/api/v1/notes/${droppedNoteId}`
        const res = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body,
        });
        const text = await res.text().catch(() => '')
        let parsedNote = null
        try { parsedNote = JSON.parse(text || '{}') } catch (e) { parsedNote = null }
        if (!res.ok) {
        } else {
          const returnedFolder = parsedNote && Object.prototype.hasOwnProperty.call(parsedNote, 'folder_id') ? parsedNote.folder_id : undefined
          if (targetFolderId == null) {
            if (returnedFolder !== null) {
              
            }
          } else {
            if (returnedFolder !== undefined && Number(returnedFolder) !== Number(targetFolderId)) {
              
            }
          }
          // 폴더 재로딩 및 필터/화면 동기화
          await loadNotes();
          onFilterChange?.('all');
          // 이동한 폴더 열어주기
          if (targetFolderId != null) {
            setOpenMap(p => ({ ...p, [targetFolderId]: true }));
          }
        }
      } catch (err) {
      }
      return;
    }
  };

  const isDescendant = (droppedId, targetId) => {
    const stack = [droppedId];
    const seen = new Set();
    const childMap = {};
    flatFolders.forEach(f => {
      childMap[f.parent_id] = childMap[f.parent_id] || [];
      childMap[f.parent_id].push(f.id);
    });
    while (stack.length) {
      const curr = stack.pop();
      if (seen.has(curr)) continue;
      seen.add(curr);
      const children = childMap[curr] || [];
      if (children.includes(targetId)) return true;
      stack.push(...children);
    }
    return false;
  };

  const handleNewFolder = async parentId => {
    const name = prompt('새 폴더 이름을 입력하세요');
    if (!name) return;
    try {
      const API = import.meta.env.VITE_API_BASE_URL ?? '';
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/api/v1/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, parent_id: parentId }),
      });
      if (!res.ok) throw new Error('폴더 생성 실패');
      await loadFolders();
      setActiveFilter('all');
      onFilterChange?.('all');
      if (parentId !== null) setOpenMap(p => ({ ...p, [parentId]: true }));
    } catch (err) {
      alert('폴더 생성에 실패했습니다.');
    }
  };



  const handleNewNote = async folderId => {
    const title = prompt('노트 제목을 입력하세요');
    if (!title) return;
    try {
      const API = import.meta.env.VITE_API_BASE_URL ?? '';
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/api/v1/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, content: '', folder_id: folderId }),
      });
      if (!res.ok) throw new Error('노트 생성 실패');
      await loadNotes();
    } catch (err) {
      alert('노트 생성에 실패했습니다.');
    }
  };

  const handleRenameFolder = async folderId => {
    const name = prompt('새 폴더 이름을 입력하세요');
    if (!name) return;
    try {
      const API = import.meta.env.VITE_API_BASE_URL ?? '';
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/api/v1/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('폴더 이름 변경 실패');
      await loadFolders();
    } catch (err) {
      alert('폴더 이름 변경에 실패했습니다.');
    }
  };

  const handleRenameNote = async (noteId, folderId) => {
    const title = prompt('새 노트 제목을 입력하세요');
    if (!title) return;
    try {
      const API = import.meta.env.VITE_API_BASE_URL ?? '';
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/api/v1/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, folder_id: folderId }),
      });
      if (!res.ok) throw new Error('노트 이름 변경 실패');
      await loadNotes();
    } catch (err) {
      alert('노트 이름 변경에 실패했습니다.');
    }
  };

  const handleDeleteFolder = async folderId => {
    if (!confirm('정말 폴더를 삭제하시겠습니까?')) return;
    try {
      const API = import.meta.env.VITE_API_BASE_URL ?? '';
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/api/v1/folders/${folderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('폴더 삭제 실패');
      await loadFolders();
    } catch (err) {
      alert('폴더 삭제에 실패했습니다.');
    }
  };

  const handleDeleteNote = async noteId => {
    if (!confirm('이 노트를 삭제하시겠습니까?')) return;
    try {
      const API = import.meta.env.VITE_API_BASE_URL ?? '';
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/api/v1/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('노트 삭제 실패');
      await loadNotes();
    } catch (err) {
      alert('노트 삭제에 실패했습니다.');
    }
  };

  useEffect(() => {
    const handler = e => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setFolderContextMenu({ visible: false, x:0, y:0, folderId: null });
        setNoteContextMenu({ visible: false, x:0, y:0, noteId: null, folderId: null });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 폴더 트리 렌더
  const renderTree = nodes =>
    nodes.map(node => (
      <li
        key={node.id}
        onDrop={(e) => handleDrop(e, node.id)}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        onDragEnter={() => { setDragOverFolderId(node.id); setDragOverRoot(false); }}
        onDragLeave={(e) => {
          // 폴더 영역 바깥으로 나가면 해제
          if (!e.currentTarget.contains(e.relatedTarget)) setDragOverFolderId(null);
        }}
        style={{
          outline: dragOverFolderId === node.id ? '2px dashed var(--nf-primary)' : 'none',
          borderRadius: 6,
          paddingInline: dragOverFolderId === node.id ? 2 : 0
        }}
      >
        <div
          className={`folder-label ${currentFolderId === node.id ? 'active' : ''}`}
          draggable
          onDragStart={e => {
            e.dataTransfer.setData('folderId', String(node.id));
            e.dataTransfer.setData('type', 'folder');
            e.dataTransfer.setData('text/plain', `nf-folder:${node.id}`);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onClick={() => {
            setOpenMap(p => ({ ...p, [node.id]: !p[node.id] }));
          }}
          onContextMenu={e => {
            e.preventDefault();
            setNoteContextMenu({ visible: false, x:0, y:0, noteId: null, folderId: null });
            setFolderContextMenu({ visible: true, x:e.clientX, y:e.clientY, folderId: node.id });
          }}
          // 폴더 라벨 자체에도 드롭 허용(모바일/트랙패드 정확도 보완)
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverFolderId(node.id); setDragOverRoot(false); }}
        onDrop={(e) => handleDrop(e, node.id)}
      >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
            <span className="nf-badge" aria-label="노트 개수">{node.notes?.length || 0}</span>
          </span>
        </div>

        {openMap[node.id] && node.children.length > 0 && (
          <ul className="folder-children">{renderTree(node.children)}</ul>
        )}

        {openMap[node.id] && node.notes.length > 0 && (
          <ul className={`note-list ${node.parent_id ? 'nested' : 'root'}`}>
            {node.notes.map(n => (
              <li
                key={n.id}
                className={`note-label ${currentNoteId === n.id ? 'active' : ''}`}
                onClick={() => {
                  navigate(`/notes/${n.id}`);
                  onNoteSelect?.(n);
                }}
                onContextMenu={e => {
                  e.preventDefault();
                  setFolderContextMenu({ visible: false, x:0, y:0, folderId: null });
                  setNoteContextMenu({ visible: true, x:e.clientX, y:e.clientY, noteId: n.id, folderId: node.id });
                }}
                draggable
                onDragStart={(e) => {
                  // 노트 드래그 시작: 여러 포맷으로 심어 호환성 보장
                  e.dataTransfer.setData('noteId', String(n.id));
                  e.dataTransfer.setData('type', 'note');
                  e.dataTransfer.setData('application/x-nf-note', String(n.id));
                  e.dataTransfer.setData('text/plain', `nf-note:${n.id}`);
                  e.dataTransfer.effectAllowed = 'move';
                }}
              >
                {n.title}
              </li>
            ))}
          </ul>
        )}
        
      </li>
    ));

  const [showOnHover, setShowOnHover] = useState(false)
  const toggleSidebar = () => { if (sidebarState === 'pinned') setSidebarState('hidden'); else setSidebarState('pinned') }
  const isTemporary = sidebarState === 'hidden' && showOnHover

  useEffect(() => {
    if (sidebarState !== 'hidden') return
    const onMove = (e) => {
      try {
        const x = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0
        if (x <= 4) {
          if (!showOnHover) setShowOnHover(true)
        } else {
          if (showOnHover) setShowOnHover(false)
        }
      } catch (err) {}
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchstart', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchstart', onMove)
    }
  }, [sidebarState, showOnHover])

  // ☆ 즐겨찾기 탭용 평탄화된 즐겨찾기 목록
  const favoriteNotes = React.useMemo(() => {
    const arr = []
    Object.values(folderNoteMap).forEach(list => {
      (list || []).forEach(n => { if (Boolean(n.is_favorite)) arr.push(n) })
    })
    if (folderNoteMap[null]) {
      folderNoteMap[null].forEach(n => { if (Boolean(n.is_favorite)) arr.push(n) })
    }
    const seen = new Set()
    const uniq = []
    arr.forEach(n => { if (!seen.has(n.id)) { seen.add(n.id); uniq.push(n) } })
    uniq.sort((a,b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    return uniq
  }, [folderNoteMap])

  return (
    <>
      {sidebarState === 'hidden' && !showOnHover && (
        <div
          className="sidebar-hover-zone"
          onMouseEnter={() => setShowOnHover(true)}
          aria-hidden={false}
          title="사이드바 열기"
        />
      )}

      <aside
        className={`sidebar ${isTemporary ? 'temporary' : sidebarState === 'pinned' ? 'pinned' : 'hidden'}`}
        onMouseLeave={() => { if (isTemporary) setShowOnHover(false) }}
        onDragEnter={(e) => {
          e.preventDefault();
          // only show root overlay when not over any folder element
          try {
            const el = e.target && e.target.closest ? e.target.closest('.folder-label, .folder-list, .folder-children') : null;
            setDragOverRoot(!el && true);
          } catch (err) { setDragOverRoot(true) }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          try {
            const el = e.target && e.target.closest ? e.target.closest('.folder-label, .folder-list, .folder-children') : null;
            setDragOverRoot(!el && true);
          } catch (err) { setDragOverRoot(true) }
        }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverRoot(false); }}
        onDrop={(e) => { setDragOverRoot(false); handleDrop(e, null); }}  // 빈 영역 드롭 → 최상위(루트)로 이동
      >
        <div
          className="sidebar-logo"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            // go to dashboard: clear folder selection, reset filter to default (all) and navigate
            onSelectFolder?.(null);
            onFilterChange?.('all');
            navigate('/main');
          }}
        >
          <img src="/logo.png" alt="NoteFlow Logo" className="logo-icon" />
          <span className="logo-text">NoteFlow</span>
        </div>

        <div className="sidebar-buttons">
          <button onClick={() => handleNewFolder(null)} className="sidebar-btn">
            <FaFolderPlus style={{ marginRight: '0.5rem' }} />
          </button>
          <button onClick={() => handleNewNote(null)} className="sidebar-btn">
            <FaStickyNote style={{ marginRight: '0.5rem' }} />
          </button>
        </div>

        <div className="sidebar-controls">
          <button
            className={activeFilter === 'recent' ? 'active' : ''}
            onClick={() => {
              const willOpen = !openPanels.recent;
              if (willOpen) {
                setActiveFilter('recent');
                onFilterChange?.('recent');
                onSelectFolder?.(null);
                navigate('/main');
              }
              setOpenPanels(p => ({ ...p, recent: willOpen }));
            }}
          >
            최근 노트
          </button>

          {openPanels.recent && (
            <ul className="folder-list">
              {recentNotes.length === 0 ? (
                <li style={{ color: '#777', padding: '0.5rem 1rem' }}>최근 노트가 없습니다.</li>
              ) : recentNotes.map(n => (
                <li
                  key={n.id}
                  className={`note-label root ${currentNoteId === n.id ? 'active' : ''}`}
                  onClick={() => { navigate(`/notes/${n.id}`); onNoteSelect?.(n); }}
                  onContextMenu={e => { e.preventDefault(); setFolderContextMenu({ visible: false, x:0, y:0, folderId: null }); setNoteContextMenu({ visible: true, x:e.clientX, y:e.clientY, noteId: n.id, folderId: n.folder_id ?? null }); }}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('noteId', String(n.id));
                    e.dataTransfer.setData('type', 'note');
                    e.dataTransfer.setData('application/x-nf-note', String(n.id));
                    e.dataTransfer.setData('text/plain', `nf-note:${n.id}`);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                >
                  <span style={{ display:'flex', justifyContent:'space-between', width:'100%' }}>
                    <span>{n.title}</span>
                    <span style={{ color:'#9aa3af', fontSize:12, marginLeft:8 }}>{(() => { const ff = flatFolders.find(f => f.id === n.folder_id); return ff ? ff.name : '루트' })()}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          

          <div className="folder-section">
            <div style={{ position: 'relative' }}>
            <button
            className={activeFilter === 'all' ? 'active' : ''}
              onClick={() => {
                const willOpen = !openPanels.all;
                if (willOpen) {
                  setActiveFilter('all');
                  onFilterChange?.('all');
                  onSelectFolder?.(null);
                  navigate('/main');
                }
                setOpenPanels(p => ({ ...p, all: willOpen }));
              }}
            >
              내 폴더
            </button>
            {openPanels.all && (
              <ul className="folder-list">
                {treeFolders.length === 0 ? (
                  <li style={{ color: '#777', padding: '0.5rem 1rem' }}>폴더가 없습니다.</li>
                ) : (
                  renderTree(treeFolders)
                )}

                {folderNoteMap[null]?.map(note => (
                  <li
                    key={note.id}
                    className={`note-label root ${currentNoteId === note.id ? 'active' : ''}`}
                    onClick={() => {
                      navigate(`/notes/${note.id}`);
                      onNoteSelect?.(note);
                    }}
                    onContextMenu={e => {
                      e.preventDefault();
                      setFolderContextMenu({ visible: false, x:0, y:0, folderId: null });
                      setNoteContextMenu({ visible: true, x:e.clientX, y:e.clientY, noteId: note.id, folderId: null });
                    }}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('noteId', String(note.id));
                      e.dataTransfer.setData('type', 'note');
                      e.dataTransfer.setData('application/x-nf-note', String(note.id));
                      e.dataTransfer.setData('text/plain', `nf-note:${note.id}`);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                  >
                    {note.title}
                  </li>
                ))}
              </ul>
            )}

            {/* 루트로 드롭할 때 전체 폴더 영역 바운더리를 보여주는 오버레이 */}
            {dragOverRoot && (
              <div className="sidebar-root-drop-overlay" aria-hidden />
            )}
            </div>
          </div>

          <button
            className={activeFilter === 'favorites' ? 'active' : ''}
            onClick={() => {
              const willOpen = !openPanels.favorites;
              if (willOpen) {
                setActiveFilter('favorites');
                onFilterChange?.('favorites');
                onSelectFolder?.(null);
                navigate('/main');
              }
              setOpenPanels(p => ({ ...p, favorites: willOpen }));
            }}
          >
            즐겨찾기
          </button>

          {openPanels.favorites && (
            <ul className="folder-list">
              {favoriteNotes.length === 0 ? (
                <li style={{ color: '#777', padding: '0.5rem 1rem' }}>즐겨찾기한 노트가 없습니다.</li>
              ) : favoriteNotes.map(n => (
                <li
                  key={n.id}
                  className={`note-label root ${currentNoteId === n.id ? 'active' : ''}`}
                  onClick={() => {
                    navigate(`/notes/${n.id}`);
                    onNoteSelect?.(n);
                  }}
                  onContextMenu={e => {
                    e.preventDefault();
                    setFolderContextMenu({ visible: false, x:0, y:0, folderId: null });
                    setNoteContextMenu({ visible: true, x:e.clientX, y:e.clientY, noteId: n.id, folderId: n.folder_id ?? null });
                  }}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('noteId', String(n.id));
                    e.dataTransfer.setData('type', 'note');
                    e.dataTransfer.setData('application/x-nf-note', String(n.id));
                    e.dataTransfer.setData('text/plain', `nf-note:${n.id}`);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                >
                  <span style={{ display:'flex', justifyContent:'space-between', width:'100%' }}>
                    <span>{n.title}</span>
                    <span style={{ color:'#9aa3af', fontSize:12, marginLeft:8 }}>
                      {(() => {
                        const ff = flatFolders.find(f => f.id === n.folder_id)
                        return ff ? ff.name : '루트'
                      })()}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 예상문제: 즐겨찾기 아래에 위치 */}
        <div>
          <button
            className={`sidebar-controls__predicted ${openPanels.predicted ? 'active' : ''}`}
            onClick={() => setOpenPanels(p => ({ ...p, predicted: !p.predicted }))}
          >
            예상문제
          </button>

          {openPanels.predicted && (
            <ul className="folder-list">
              {predictedItems.length === 0 ? (
                <li style={{ color: '#777', padding: '0.5rem 1rem' }}>예상문제가 없습니다.</li>
              ) : predictedItems.map(item => (
                <li
                  key={item.id}
                  className={`note-label root ${currentNoteId === item.id ? 'active' : ''}`}
                  onClick={() => { navigate(`/notes/${item.id}`); onNoteSelect?.(item); }}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('noteId', String(item.id));
                    e.dataTransfer.setData('type', 'note');
                    e.dataTransfer.setData('application/x-nf-note', String(item.id));
                    e.dataTransfer.setData('text/plain', `nf-note:${item.id}`);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                >
                  {item.title}
                </li>
              ))}
            </ul>
          )}
        </div>

        {folderContextMenu.visible && (
          <div
            className="context-menu"
            style={{ top: folderContextMenu.y, left: folderContextMenu.x, position: 'fixed', zIndex: 1000 }}
            ref={contextMenuRef}
          >
            <div onClick={() => { handleNewNote(folderContextMenu.folderId); setFolderContextMenu({ visible: false, x:0, y:0, folderId: null }); }}>새 노트</div>
            <div onClick={() => { handleNewFolder(folderContextMenu.folderId); setFolderContextMenu({ visible: false, x:0, y:0, folderId: null }); }}>새 폴더</div>
            <div onClick={() => { handleRenameFolder(folderContextMenu.folderId); setFolderContextMenu({ visible: false, x:0, y:0, folderId: null }); }}>이름 변경</div>
            <div onClick={() => { handleDeleteFolder(folderContextMenu.folderId); setFolderContextMenu({ visible: false, x:0, y:0, folderId: null }); }}>삭제</div>
          </div>
        )}

        {noteContextMenu.visible && (
          <div
            className="context-menu"
            style={{ top: noteContextMenu.y, left: noteContextMenu.x, position: 'fixed', zIndex: 1000 }}
            ref={contextMenuRef}
          >
            <div onClick={() => { handleRenameNote(noteContextMenu.noteId, noteContextMenu.folderId); setNoteContextMenu({ visible: false, x:0, y:0, noteId: null, folderId: null }); }}>이름 변경</div>
            <div onClick={() => { handleDeleteNote(noteContextMenu.noteId); setNoteContextMenu({ visible: false, x:0, y:0, noteId: null, folderId: null }); }}>삭제</div>
          </div>
        )}
      </aside>
    </>
  );
}
/*
  Component: Sidebar
  Role: Primary navigation — folders tree, notes list, filters (all/recent/favorites), and drag & drop.
  Data:
   - Fetches folders and notes, builds flat and tree structures.
   - Recent/predicted notes are lazy-fetched on panel open.
  DnD:
   - Supports moving folders, uploading files to create notes, and dragging notes between folders.
  Notes:
   - Keeps its own UI state (openMap, context menus) and notifies parent via callbacks.
*/
