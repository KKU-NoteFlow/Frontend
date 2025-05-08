import React from 'react'
import '../css/Main.css'

export default function MainPage() {
  return (
    <div className="main-container">
      {/* 왼쪽 사이드 메뉴 */}
      <aside className="main-sidebar">
        <div className="main-logo-box">
          <img src="/logo.png" alt="NoteFlow Logo" className="main-logo-img" />
          <h1 className="main-logo-text">NoteFlow</h1>
        </div>
        <nav className="main-nav">
          <button className="main-nav-btn">📁 최근 노트</button>
          <button className="main-nav-btn">📂 내 폴더</button>
          <button className="main-nav-btn">⭐ 즐겨찾기</button>
        </nav>
      </aside>

      {/* 메인 노트 리스트 */}
      <main className="main-content">
        <header className="main-header">
          <button className="main-new-note-btn">+ 새 노트</button>
          <input className="main-search" type="text" placeholder="🔍 노트 검색" />
        </header>

        <section className="main-note-list">
          {Array(3).fill(0).map((_, i) => (
            <div className="main-note-item" key={i}>
              <h3 className="main-note-title">제목</h3>
              <p className="main-note-preview">노트 미리보기 내용이 이곳에 표시됩니다.</p>
              <span className="main-note-date">3일 전</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
