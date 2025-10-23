import React from 'react'
import { Link } from 'react-router-dom'
import MarketingNav from '../components/MarketingNav'
import '../css/Marketing.css'

export default function Home() {
  return (
    <div>
      <MarketingNav />

      <section className="mkt-hero">
        <div className="mkt-hero-inner">
          <div className="mkt-eyebrow">NOTEFLOW</div>
          <h1 className="mkt-title">Write less, Think clearer. <br/>Your notes, in perfect flow.</h1>
          <p className="mkt-subtitle">NoteFlow는 기록 → 정리 → 검색의 흐름을 끊김 없이 이어주는, 가볍고 집중에 최적화된 노트 앱입니다</p>
          <div className="mkt-cta-row">
            <Link className="mkt-cta primary" to="/">Get Started</Link>
            <Link className="mkt-cta secondary" to="/docs">Read the Docs</Link>
          </div>
        </div>
      </section>

      <section className="mkt-section">
        <p className="mkt-badge">Designed for clarity</p>
        <div className="mkt-grid" style={{marginTop: '16px'}}>
          <article className="mkt-card">
            <h3>Fast note taking</h3>
            <p>키 하나로 새 노트를 시작. 흐름을 끊지 않는 자동 저장과 빠른 진입.</p>
          </article>
          <article className="mkt-card">
            <h3>Clean structure</h3>
            <p>폴더/태그/즐겨찾기로 즉시 찾는 정보. 정리도 흐름처럼 자연스럽게.</p>
          </article>
          <article className="mkt-card">
            <h3>Focus mode</h3>
            <p>군더더기 없는 화면과 색, 집중만 남긴 글쓰기 경험.</p>
          </article>
        </div>
      </section>
    </div>
  )
}
