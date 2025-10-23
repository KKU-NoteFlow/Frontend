// src/components/BottomBar.jsx

import React, { useState } from 'react'
import '../css/Bottombar.css'
import { IconMic, IconUpload, IconTextRecognition } from '../ui/icons'

export default function BottomBar({ isRecording, statusText, onRecordClick, onSummarizeClick, onUploadClick, onOcrClick, onGenerateClick }) {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen(o => !o)

  return (
    <div className="fab-root" aria-hidden={false}>
      <div className={`fab-container ${open ? 'open' : ''}`}>
        <button className="fab-action fab-upload" onClick={() => { setOpen(false); onUploadClick && onUploadClick() }} title="업로드" aria-label="업로드">
          <IconUpload />
          <span className="fab-label">업로드</span>
        </button>
        <button className="fab-action fab-ocr" onClick={() => { setOpen(false); onOcrClick && onOcrClick() }} title="텍스트 변환" aria-label="텍스트 변환">
          <IconTextRecognition />
          <span className="fab-label"><span>텍스트</span><span>변환</span></span>
        </button>
        <button className="fab-action fab-summarize" onClick={() => { setOpen(false); onSummarizeClick && onSummarizeClick() }} title="요약" aria-label="요약" disabled={!onSummarizeClick}>
          <span className="fab-ai">AI</span>
          <span className="fab-label">요약</span>
        </button>
        <button className="fab-action fab-extra" title="문제 생성" aria-label="문제 생성" onClick={() => { setOpen(false); onGenerateClick && onGenerateClick() }}>
          <span style={{ fontSize: 20 }}>+</span>
          <span className="fab-label">문제 생성</span>
        </button>
        

        <button
          className={`fab-action fab-record ${isRecording ? 'recording' : ''}`}
          onClick={() => { setOpen(false); onRecordClick && onRecordClick() }}
          title={isRecording ? '녹음 종료' : '녹음'}
          aria-label="녹음"
        >
          <IconMic />
          <span className="fab-label">{isRecording ? '중지' : '녹음'}</span>
        </button>
        <button className="fab-main" onClick={toggle} aria-label={open ? '닫기' : '작업 열기'}>
          {open ? '×' : '+'}
        </button>
      </div>
      {/* 녹음 상태 배지는 인터림 텍스트로 대체됨 */}
    </div>
  )
}
/*
  Component: Bottombar
  Role: Secondary action/status area at the bottom of the editor viewport.
  Notes: Keep visual noise low; complements Topbar.
*/
