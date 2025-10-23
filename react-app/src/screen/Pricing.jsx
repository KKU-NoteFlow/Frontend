import React from 'react'
import MarketingNav from '../components/MarketingNav'
import '../css/Marketing.css'

export default function Pricing() {
  return (
    <div>
      <MarketingNav />
      <section className="mkt-section">
        <h2 className="mkt-title" style={{textAlign:'left'}}>Pricing</h2>
        <p className="mkt-subtitle" style={{textAlign:'left'}}>Simple. Transparent. Free forever.</p>
        <div className="mkt-price-wrap">
          <article className="mkt-price-card">
            <div className="mkt-price-title">Free Forever</div>
            <div className="mkt-price-tag">₩0</div>
            <ul className="mkt-list">
              <li>무제한 노트/폴더</li>
              <li>검색/필터/즐겨찾기</li>
              <li>마크다운 서식, 코드 블록</li>
              <li>키보드 단축키, 집중 모드</li>
              <li>음성 → 텍스트(STT) 기록</li>
            </ul>
            <a className="mkt-buy" href="/">지금 무료로 시작</a>
            <div className="mkt-note">모든 기능은 공짜입니다. 부담 없이 기록을 시작하세요.</div>
          </article>
        </div>
      </section>
    </div>
  )
}
/*
  Page: Pricing (Marketing)
  Model: Free Forever — all features at ₩0 with simple CTA to start.
*/
