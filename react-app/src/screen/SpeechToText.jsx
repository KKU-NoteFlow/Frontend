import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../css/SpeechToText.css'

export default function SpeechToText() {
  const navigate = useNavigate()
  const [supported, setSupported] = useState(true)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Web Speech API (Chrome uses webkitSpeechRecognition)
    const Win = window
    const SpeechRecognition = Win.SpeechRecognition || Win.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }

    const recog = new SpeechRecognition()
    recog.continuous = true
    recog.interimResults = true
    recog.lang = 'ko-KR'

    recog.onresult = (ev) => {
      let finalText = ''
      let interimText = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i]
        if (res.isFinal) finalText += res[0].transcript
        else interimText += res[0].transcript
      }
      setTranscript((t) => {
        // show final + interim
        const base = t.replace(/\n?\n?$/, '')
        return base + (finalText || interimText)
      })
    }

    recog.onerror = (e) => {
      console.error('speech recognition error', e)
      // stop on fatal errors
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setListening(false)
      }
    }

    recognitionRef.current = recog
    return () => {
      try { recog.stop() } catch {}
    }
  }, [])

  const start = async () => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.start()
      setListening(true)
      setTranscript('')
    } catch (e) {
      console.error('start err', e)
    }
  }

  const stop = () => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch (e) {}
    setListening(false)
  }

  const clear = () => setTranscript('')

  const downloadTxt = () => {
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transcript.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="stt-root">
      <div className="stt-box">
        <h2>음성 → 텍스트 (Chrome 지원)</h2>
        {!supported && (
          <div className="stt-warning">이 브라우저는 Web Speech API를 지원하지 않습니다. Chrome에서 사용하세요.</div>
        )}

        <div className="stt-controls">
          {!listening ? (
            <button className="stt-btn stt-start" onClick={start} disabled={!supported}>녹음 시작</button>
          ) : (
            <button className="stt-btn stt-stop" onClick={stop}>녹음 중지</button>
          )}
          <button className="stt-btn" onClick={clear}>지우기</button>
          <button className="stt-btn" onClick={downloadTxt} disabled={!transcript}>다운로드</button>
          <button className="stt-btn" onClick={() => navigate('/main')}>메인으로</button>
        </div>

        <div className="stt-area">
          <textarea readOnly value={transcript} placeholder="여기에 실시간으로 텍스트가 표시됩니다." />
        </div>

        <div className="stt-info">
          <strong>노트</strong>
          <ul>
            <li>이 기능은 브라우저(클라이언트)에서 실시간 STT를 수행합니다. 서버 구현 불필요.</li>
            <li>백엔드에서 고품질 STT(파일 업로드 기반, 장시간 오디오 등)를 원하면 서버에 오디오 업로드 API와 STT 처리(예: OpenAI/Whisper, Google Speech-to-Text 등)를 구현해야 합니다.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

