// src/components/BottomBar.jsx

import React from 'react'
import '../css/Bottombar.css'

export default function BottomBar({ statusText, isRecording, onRecordClick, onSummarizeClick, onUploadClick, onOcrClick }) {
  return (
    <footer className="bottom-bar">

      <div className="bottom-status" aria-live="polite">
        {statusText && <span>{statusText}</span>}

      <div className="bottom-status">
        {statusText && <span>🔵 {statusText}</span>}
      </div>
      <div className="bottom-actions">
        <button onClick={onRecordClick}>
          {isRecording ? '녹음 종료' : '녹음'}
        </button>
        <button disabled={!onSummarizeClick} onClick={onSummarizeClick}>요약</button>
        <button onClick={onUploadClick}>업로드</button>
        <button onClick={onOcrClick}>텍스트 변환</button>

      </div>
      {/* 액션은 ActionDock으로 이동. 하단 바는 상태 전용으로 단순화. */}
      <div className="bottom-actions" aria-hidden="true" />
    </footer>
  )
}
