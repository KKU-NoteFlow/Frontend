// src/components/ActionToolbar.jsx
import React from 'react'
import '../css/ActionToolbar.css'
import { IconMic, IconBrain, IconUpload, IconTextRecognition } from '../ui/icons'

export default function ActionToolbar({ onRecordClick, onSummarizeClick, onUploadClick, onOcrClick, isRecording }) {
  return (
    <div className="action-toolbar" role="toolbar" aria-label="작업">
      <button className="atb-btn atb-primary" onClick={onRecordClick} aria-label={isRecording ? '녹음 종료' : '녹음 시작'}>
        <IconMic className="atb-icon" />
        <span className="atb-label">{isRecording ? '녹음 종료' : '녹음'}</span>
      </button>
      <button className="atb-btn" onClick={onSummarizeClick} aria-label="요약">
        <IconBrain className="atb-icon" />
        <span className="atb-label">요약</span>
      </button>
      <button className="atb-btn" onClick={onUploadClick} aria-label="업로드">
        <IconUpload className="atb-icon" />
        <span className="atb-label">업로드</span>
      </button>
      <button className="atb-btn" onClick={onOcrClick} aria-label="텍스트 변환">
        <IconTextRecognition className="atb-icon" />
        <span className="atb-label">텍스트 변환</span>
      </button>
    </div>
  )
}
