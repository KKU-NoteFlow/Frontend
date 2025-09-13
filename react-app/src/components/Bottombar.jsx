// src/components/BottomBar.jsx

import React from 'react'
import '../css/Bottombar.css'

export default function BottomBar({ statusText, isRecording, onRecordClick, onSummarizeClick, onUploadClick, onOcrClick }) {
  return (
    <footer className="bottom-bar">
      <div className="bottom-status" aria-live="polite">
        {statusText && <span>{statusText}</span>}
      </div>
      {/* 액션은 ActionDock으로 이동. 하단 바는 상태 전용으로 단순화. */}
      <div className="bottom-actions" aria-hidden="true" />
    </footer>
  )
}
