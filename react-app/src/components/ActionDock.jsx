// src/components/ActionDock.jsx
// 무엇을/왜: 하단 고정 버튼(녹음/요약/업로드/OCR)을 플로팅 도크로 재배치하여 가시성과 접근성 향상.
import React from 'react'
import '../css/ActionDock.css'

export default function ActionDock({ onRecordClick, onSummarizeClick, onUploadClick, onOcrClick, isRecording }) {
  return (
    <div className="action-dock" role="toolbar" aria-label="주요 작업">
      <button className="nf-btn nf-btn--primary action-dock__btn" onClick={onRecordClick} aria-label={isRecording ? '녹음 종료' : '녹음 시작'}>
        <span className="action-dock__label">{isRecording ? '녹음 종료' : '녹음'}</span>
      </button>
      <button className="nf-btn action-dock__btn" onClick={onSummarizeClick} aria-label="요약">
        <span className="action-dock__label">요약</span>
      </button>
      <button className="nf-btn action-dock__btn" onClick={onUploadClick} aria-label="업로드">
        <span className="action-dock__label">업로드</span>
      </button>
      <button className="nf-btn action-dock__btn" onClick={onOcrClick} aria-label="텍스트 변환">
        <span className="action-dock__label">텍스트 변환</span>
      </button>
    </div>
  )
}
/*
  Component: ActionDock
  Role: Floating/attached quick actions (create note, upload, etc.) for rapid workflows.
  UX: Designed to minimize pointer travel and keep flow state.
*/
