// src/components/BottomBar.jsx
import React from 'react'
import '../css/Bottombar.css'

export default function BottomBar({
  statusText,
  onRecordClick,
  onSummarizeClick,
  onUploadClick
}) {
  return (
    <footer className="bottom-bar">
      <div className="bottom-status">
        {statusText && <span>🔵 {statusText}</span>}
      </div>
      <div className="bottom-actions">
        <button onClick={onRecordClick}>🎙 녹음</button>
        <button onClick={onSummarizeClick}>🧠 요약</button>
        <button onClick={onUploadClick}>⬆️ 업로드</button>
      </div>
    </footer>
  )
}
