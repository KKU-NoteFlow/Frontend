// src/components/BottomBar.jsx

import React from 'react'
import '../css/Bottombar.css'

export default function BottomBar({ statusText, isRecording, onRecordClick, onSummarizeClick, onUploadClick, onOcrClick }) {
  return (
    <footer className="bottom-bar">
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
    </footer>
  )
}
