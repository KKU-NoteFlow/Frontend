import { FaFolderPlus, FaStickyNote, FaTimes } from 'react-icons/fa';
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
        console.error('[loadFolders] 실패 →', res.status, await res.text());
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
      console.error('[loadFolders] 예외 →', err);
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
        console.error('[loadNotes] 실패 →', res.status, await res.text());
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
      console.error('[loadNotes] 예외 →', err);
    }
  }, []);

  useEffect(() => {
    loadFolders();
    loadNotes();
  }, [loadFolders, loadNotes]);

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

  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault();
    const API = import.meta.env.VITE_API_BASE_URL ?? '';
    const token = localStorage.getItem('access_token');
    const dataType = e.dataTransfer.getData('type');
    const droppedNoteId = e.dataTransfer.getData('noteId');
    const droppedFolderId = e.dataTransfer.getData('folderId');
    const droppedFiles = e.dataTransfer.files;

    if (droppedFiles?.length) {
      let lastCreatedNote = null
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
            console.error(`[handleDrop] 파일 업로드 실패: ${file.name}`, res.status);
            continue
          }
          let uploaded = null
          try { uploaded = await res.json() } catch (e) { uploaded = null }
          if (uploaded && uploaded.url) {
            try {
              const noteBody = {
                title: uploaded.original_name || file.name || '첨부된 파일',
                content: `![${(uploaded.original_name||file.name).replace(/"/g,'')}](${uploaded.url})`,
                folder_id: targetFolderId,
              }
              const noteRes = await fetch(`${API}/api/v1/notes`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(noteBody),
              })
              if (noteRes.ok) {
                const created = await noteRes.json()
                lastCreatedNote = created
              } else {
                console.error('[handleDrop] 업로드 후 노트 생성 실패', await noteRes.text())
              }
            } catch (e) {
              console.error('[handleDrop] 업로드 후 노트 생성 중 예외', e)
            }
          }
        } catch (err) {
          console.error(`[handleDrop] 파일 업로드 중 예외: ${file.name}`, err);
        }
      }
      await loadNotes();
      onFilterChange('all');
      if (lastCreatedNote) {
        try {
          navigate(`/notes/${lastCreatedNote.id}`)
          onNoteSelect?.(lastCreatedNote)
        } catch (e) {}
      }
      return;
    }

    if (dataType === 'note' && droppedNoteId) {
      try {
        const res = await fetch(`${API}/api/v1/notes/${droppedNoteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ folder_id: targetFolderId }),
        });
        if (!res.ok) console.error('[handleDrop] 노트 이동 실패', res.status);
        await loadNotes();
        onFilterChange('all');
      } catch (err) {
        console.error('[handleDrop] 노트 이동 중 예외:', err);
      }
      return;
    }

    if (dataType === 'folder' && droppedFolderId) {
      const dfId = parseInt(droppedFolderId, 10);
      const tfId = targetFolderId;
      if (dfId === tfId || isDescendant(dfId, tfId)) return;
      try {
        const res = await fetch(`${API}/api/v1/folders/${dfId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ parent_id: tfId }),
        });
        if (!res.ok) console.error('[handleDrop] 폴더 이동 실패', res.status);
        await loadFolders();
      } catch (err) {
        console.error('[handleDrop] 폴더 이동 중 예외:', err);
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
      onFilterChange('all');
      if (parentId !== null) setOpenMap(p => ({ ...p, [parentId]: true }));
    } catch (err) {
      console.error('[handleNewFolder]', err);
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
      console.error('[handleNewNote]', err);
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
      console.error('[handleRenameFolder]', err);
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
      console.error('[handleRenameNote]', err);
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
      console.error('[handleDeleteFolder]', err);
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
      console.error('[handleDeleteNote]', err);
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

  const renderTree = nodes =>
    nodes.map(node => (
      <li
        key={node.id}
        onDrop={e => handleDrop(e, node.id)}
        onDragOver={e => e.preventDefault()}
      >
        <div
          className={`folder-label ${currentFolderId === node.id ? 'active' : ''}`}
          draggable
          onDragStart={e => {
            e.dataTransfer.setData('folderId', node.id);
            e.dataTransfer.setData('type', 'folder');
          }}
          onClick={() => {
            setOpenMap(p => ({ ...p, [node.id]: !p[node.id] }));
          }}
          onContextMenu={e => {
            e.preventDefault();
            setNoteContextMenu({ visible: false, x:0, y:0, noteId: null, folderId: null });
            setFolderContextMenu({ visible: true, x:e.clientX, y:e.clientY, folderId: node.id });
          }}
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
    // 루트(null) 키에 없는 경우 대비
    if (folderNoteMap[null]) {
      folderNoteMap[null].forEach(n => { if (Boolean(n.is_favorite)) arr.push(n) })
    }
    // 중복 제거
    const seen = new Set()
    const uniq = []
    arr.forEach(n => { if (!seen.has(n.id)) { seen.add(n.id); uniq.push(n) } })
    // 최신순
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
        onDragOver={e => e.preventDefault()}
        onDrop={e => handleDrop(e, currentFolderId ?? null)}
      >
        <div
          className="sidebar-logo"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            onSelectFolder?.(null);
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
              setActiveFilter('recent');
              onFilterChange('recent');
              onSelectFolder?.(null);
              navigate('/main');
            }}
          >
            최근 노트
          </button>

          <div className="folder-section">
            <button
              className={activeFilter === 'all' ? 'active' : ''}
              onClick={() => {
                setActiveFilter('all');
                onFilterChange('all');
                onSelectFolder?.(null);
                navigate('/main');
              }}
            >
              내 폴더
            </button>

            {activeFilter === 'all' && (
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
                  >
                    {note.title}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            className={activeFilter === 'favorites' ? 'active' : ''}
            onClick={() => {
              setActiveFilter('favorites');
              onFilterChange('favorites');
              onSelectFolder?.(null);
              navigate('/main');
            }}
          >
            즐겨찾기
          </button>

          {/* ✅ 즐겨찾기 탭에서 즐겨찾기 노트 전체 보여주기 */}
          {activeFilter === 'favorites' && (
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
                >
                  {/* 폴더명 힌트 */}
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
