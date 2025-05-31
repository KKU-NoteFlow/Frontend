// src/components/BottomBar.jsx

import React from 'react'
import '../css/Bottombar.css'

export default function BottomBar({
  statusText,
  onRecordClick,
  onSummarizeClick,
  onUploadClick,
  onOcrClick      // 추가된 prop
}) {
  return (
    <footer className="bottom-bar">
      <div className="bottom-status">
        {statusText && <span>🔵 {statusText}</span>}
      </div>
      <div className="bottom-actions">
        <button onClick={onRecordClick}>녹음</button>
        <button onClick={onSummarizeClick}>요약</button>
        <button onClick={onUploadClick}>업로드</button>
        <button onClick={onOcrClick}>텍스트 변환</button> {/* 새 버튼 */}
      </div>
    </footer>
  )
}
