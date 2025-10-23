import React from 'react'
import MarketingNav from '../components/MarketingNav'
import '../css/Marketing.css'

const features = [
  { title: 'Notebook & Folders', desc: '폴더/서브폴더로 지식을 층위 있게 정리합니다. 구조가 곧 검색성입니다.' },
  { title: 'Favorites & Recent', desc: '중요한 노트는 고정, 방금 작업한 노트는 곧바로 복귀.' },
  { title: 'Markdown-friendly', desc: '기본 서식/코드/체크리스트 등 깔끔한 마크다운 지원.' },
  { title: 'Keyboard-first', desc: '핵심 동작을 단축키로. 손이 멈추지 않게.' },
  { title: 'Search & Filter', desc: '필터/키워드로 필요한 정보를 즉시 찾기.' },
  { title: 'Speech to Text', desc: '아이디어가 스칠 때, 음성으로 기록하고 텍스트로 전환.' },
]

export default function Features() {
  return (
    <div>
      <MarketingNav />
      <section className="mkt-section">
        <h2 className="mkt-title" style={{textAlign:'left'}}>Features</h2>
        <p className="mkt-subtitle" style={{textAlign:'left'}}>필요한 것만 남긴 기능, 더 빠르게 생각하고 더 적게 방해받도록.</p>
        <div className="mkt-grid" style={{marginTop: '16px'}}>
          {features.map((f) => (
            <article key={f.title} className="mkt-card">
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
/*
  Page: Features (Marketing)
  Purpose: Present the key capabilities of NoteFlow in concise cards.
*/
