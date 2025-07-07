// src/components/Sidebar.jsx

import { FaFolderPlus, FaStickyNote } from 'react-icons/fa';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Sidebar.css';

export default function Sidebar({ onFilterChange, onSelectFolder, onNoteSelect }) {
  // 1) 로컬 상태
  const [flatFolders, setFlatFolders] = useState([]);       // 서버에서 받아온 폴더 리스트 (평탄화된 배열)
  const [treeFolders, setTreeFolders] = useState([]);       // 트리 구조로 변환된 폴더들
  const [openMap, setOpenMap] = useState({});               // 폴더 열림/닫힘 상태
  const [folderNoteMap, setFolderNoteMap] = useState({});   // 폴더별 노트 매핑
  const [folderContextMenu, setFolderContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    folderId: null,
  });
  const [noteContextMenu, setNoteContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    noteId: null,
    folderId: null,
  });
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'recent' | 'favorites'

  const navigate = useNavigate();
  const contextMenuRef = useRef(null);

  // ────────────────────────────────────────────────────────────────
  // 1) 폴더 목록 불러오기 (GET /api/v1/folders)
  // ────────────────────────────────────────────────────────────────
  const loadFolders = useCallback(async () => {
    try {
      const API = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/api/v1/folders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error('[loadFolders] 실패 →', res.status, await res.text());
        return;
      }
      const data = await res.json();
      // 트리 형태 JSON을 재귀 탐색하여 평탄화
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

  // ────────────────────────────────────────────────────────────────
  // 2) 노트 목록 불러오기 (GET /api/v1/notes)
  // ────────────────────────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    try {
      const API = import.meta.env.VITE_API_BASE_URL;
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

  // ────────────────────────────────────────────────────────────────
  // 3) 마운트 시 폴더 & 노트 동시에 로드
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadFolders();
    loadNotes();
  }, [loadFolders, loadNotes]);

  // ────────────────────────────────────────────────────────────────
  // 4) flatFolders + folderNoteMap → 트리 구조로 변환
  // ────────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────────
  // 5) 드래그 앤 드롭 처리 (파일 / 노트 / 폴더)
  // ────────────────────────────────────────────────────────────────
  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault();
    const API = import.meta.env.VITE_API_BASE_URL;
    const token = localStorage.getItem('access_token');
    const dataType = e.dataTransfer.getData('type');
    const droppedNoteId = e.dataTransfer.getData('noteId');
    const droppedFolderId = e.dataTransfer.getData('folderId');
    // 5-1) 파일 드롭
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles?.length) {
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
          if (!res.ok) console.error(`[handleDrop] 파일 업로드 실패: ${file.name}`, res.status);
        } catch (err) {
          console.error(`[handleDrop] 파일 업로드 중 예외: ${file.name}`, err);
        }
      }
      await loadNotes();
      onFilterChange('all');
      return;
    }
    // 5-2) 노트 드롭
    if (dataType === 'note' && droppedNoteId) {
      try {
        const res = await fetch(`${API}/api/v1/notes/${droppedNoteId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
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
    // 5-3) 폴더 드롭
    if (dataType === 'folder' && droppedFolderId) {
      const dfId = parseInt(droppedFolderId, 10);
      const tfId = targetFolderId;
      if (dfId === tfId || isDescendant(dfId, tfId)) return;
      try {
        const res = await fetch(`${API}/api/v1/folders/${dfId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
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

  // 자식-조상 관계 검사
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

  // ────────────────────────────────────────────────────────────────
  // 6) 폴더/노트 CRUD 핸들러 (생성·수정·삭제)
  // ────────────────────────────────────────────────────────────────
  const handleNewFolder = async parentId => {
    const name = prompt('새 폴더 이름을 입력하세요');
    if (!name) return;
    try {
      const API = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/api/v1/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      const API = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/api/v1/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      const API = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/api/v1/folders/${folderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      const API = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/api/v1/notes/${noteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      const API = import.meta.env.VITE_API_BASE_URL;
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
      const API = import.meta.env.VITE_API_BASE_URL;
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

  // ────────────────────────────────────────────────────────────────
  // 7) 컨텍스트 메뉴 외부 클릭 시 닫기
  // ────────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────────
  // 8) 트리 렌더링
  // ────────────────────────────────────────────────────────────────
  const renderTree = nodes =>
    nodes.map(node => (
      <li
        key={node.id}
        onDrop={e => handleDrop(e, node.id)}
        onDragOver={e => e.preventDefault()}
      >
        <div
          className="folder-label"
          draggable
          onDragStart={e => {
            e.dataTransfer.setData('folderId', node.id);
            e.dataTransfer.setData('type', 'folder');
          }}
          onClick={() => {
            setOpenMap(p => ({ ...p, [node.id]: !p[node.id] }));
            onSelectFolder?.(node.id);
            navigate(`/main/${node.id}`);
          }}
          onContextMenu={e => {
            e.preventDefault();
            setNoteContextMenu({ visible: false, x:0, y:0, noteId: null, folderId: null });
            setFolderContextMenu({ visible: true, x:e.clientX, y:e.clientY, folderId: node.id });
          }}
        >
          📁 {node.name}
        </div>

        {openMap[node.id] && node.children.length > 0 && (
          <ul className="folder-children">{renderTree(node.children)}</ul>
        )}

        {openMap[node.id] && node.notes.length > 0 && (
          <ul className={`note-list ${node.parent_id ? 'nested' : 'root'}`}>
            {node.notes.map(n => (
              <li
                key={n.id}
                className="note-label"
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('noteId', n.id);
                  e.dataTransfer.setData('type', 'note');
                }}
                onClick={() => {
                  navigate(`/notes/${n.id}`);
                  onNoteSelect?.(n.id);
                }}
                onContextMenu={e => {
                  e.preventDefault();
                  setFolderContextMenu({ visible: false, x:0, y:0, folderId: null });
                  setNoteContextMenu({ visible: true, x:e.clientX, y:e.clientY, noteId: n.id, folderId: node.id });
                }}
              >
                📝 {n.title}
              </li>
            ))}
          </ul>
        )}
      </li>
    ));

  // ────────────────────────────────────────────────────────────────
  // 최종 렌더링
  // ────────────────────────────────────────────────────────────────
  return (
    <aside className="sidebar">
      {/* 로고 */}
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

      {/* 새 폴더 & 새 노트 버튼 */}
      <div className="sidebar-buttons">
        <button onClick={() => handleNewFolder(null)} className="sidebar-btn">
          <FaFolderPlus style={{ marginRight: '0.5rem' }} />
        </button>
        <button onClick={() => handleNewNote(null)} className="sidebar-btn">
          <FaStickyNote style={{ marginRight: '0.5rem' }} />
        </button>
      </div>

      {/* 필터 및 트리 */}
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
                <li style={{ color: '#777', padding: '0.5rem 1rem' }}>
                  폴더가 없습니다.
                </li>
              ) : (
                renderTree(treeFolders)
              )}

              {/* 최상위(폴더 없는) 노트 */}
              {folderNoteMap[null]?.map(note => (
            <li
              key={note.id}
              className="note-label root"
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('type', 'note');
                e.dataTransfer.setData('noteId', note.id);
              }}
              onClick={() => {
                navigate(`/notes/${note.id}`);
                onNoteSelect?.(note.id);
              }}
              onContextMenu={e => {
                e.preventDefault();
                setFolderContextMenu({ visible: false, x:0, y:0, folderId: null });
                setNoteContextMenu({ visible: true, x:e.clientX, y:e.clientY, noteId: note.id, folderId: null });
              }}
            >
              📝 {note.title}
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
      </div>

      {/* 컨텍스트 메뉴 (폴더) */}
      {folderContextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: folderContextMenu.y, left: folderContextMenu.x, position: 'fixed', zIndex: 1000 }}
          ref={contextMenuRef}
        >
          <div onClick={() => {
              handleNewNote(folderContextMenu.folderId);
              setFolderContextMenu({ visible: false, x:0, y:0, folderId: null });
            }}>➕ 새 노트</div>
          <div onClick={() => {
              handleNewFolder(folderContextMenu.folderId);
              setFolderContextMenu({ visible: false, x:0, y:0, folderId: null });
            }}>➕ 새 폴더</div>
          <div onClick={() => {
              handleRenameFolder(folderContextMenu.folderId);
              setFolderContextMenu({ visible: false, x:0, y:0, folderId: null });
            }}>✏️ 이름 변경</div>
          <div onClick={() => {
              handleDeleteFolder(folderContextMenu.folderId);
              setFolderContextMenu({ visible: false, x:0, y:0, folderId: null });
            }}>🗑️ 삭제</div>
        </div>
      )}

      {/* 컨텍스트 메뉴 (노트) */}
      {noteContextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: noteContextMenu.y, left: noteContextMenu.x, position: 'fixed', zIndex: 1000 }}
          ref={contextMenuRef}
        >
          <div onClick={() => {
              handleRenameNote(noteContextMenu.noteId, noteContextMenu.folderId);
              setNoteContextMenu({ visible: false, x:0, y:0, noteId: null, folderId: null });
            }}>✏️ 이름 변경</div>
          <div onClick={() => {
              handleDeleteNote(noteContextMenu.noteId);
              setNoteContextMenu({ visible: false, x:0, y:0, noteId: null, folderId: null });
            }}>🗑️ 삭제</div>
        </div>
      )}
    </aside>
  );
}
