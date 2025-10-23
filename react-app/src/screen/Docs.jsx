import React, { useRef, useState } from 'react'
import MarketingNav from '../components/MarketingNav'
import '../css/Marketing.css'

export default function Docs() {
  const [copied, setCopied] = useState('')
  const [activeId, setActiveId] = useState('getting-started')
  const panelRef = useRef(null)
  const copy = async (key, text) => { try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1200) } catch {} }
  const go = (id) => { setActiveId(id); setTimeout(() => { panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 0) }

  const Section = () => {
    if (activeId === 'getting-started') return (
      <div className="panel-fade">
        <h2 className="panel-title">Getting Started</h2>
        <p className="panel-sub">아래 세 단계면 충분합니다. 간단하게 시작하고, 바로 기록하세요.</p>
        <div className="panel-divider" />
        <div className="step-grid">
          <div className="step-card">
            <div className="step-num">1</div>
            <div className="icon-bullet">
              <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.31 0-6 2.69-6 6h2a4 4 0 0 1 8 0h2c0-3.31-2.69-6-6-6z"/></svg>
              <strong>로그인/회원가입</strong>
            </div>
            <p className="docs-p">간단히 로그인 후 대시보드로 이동합니다.</p>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <div className="icon-bullet">
              <svg viewBox="0 0 24 24"><path d="M4 4h16v2H4V4zm0 7h16v2H4v-2zm0 7h16v2H4v-2z"/></svg>
              <strong>새 노트 만들기</strong>
            </div>
            <p className="docs-p">상단 혹은 지정된 위치의 “새 노트”를 클릭하세요.</p>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <div className="icon-bullet">
              <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4l-2-2-8 8-3-3-7 7 2 2z"/></svg>
              <strong>자동 저장</strong>
            </div>
            <p className="docs-p">작성하면 자동 저장됩니다. 흐름을 끊지 마세요.</p>
          </div>
        </div>
        <div className="code-group" style={{marginTop:'12px'}}>
          <div className="code-header">
            <div className="code-title">Flow</div>
            <button className="copy-btn" onClick={() => copy('flow', 'Login → Main → New Note\nTip: ⌘/Ctrl + K 로 커맨드 팔레트를 열 수 있어요.')}>{copied==='flow'?'Copied!':'Copy'}</button>
          </div>
          <pre className="docs-code">{`Login → Main → New Note
Tip: ⌘/Ctrl + K 로 커맨드 팔레트를 열 수 있어요.`}</pre>
        </div>
      </div>
    )
    if (activeId === 'creating-notes') return (
      <div className="panel-fade">
        <h2 className="panel-title">Creating Notes</h2>
        <p className="panel-sub">제목과 본문을 입력하세요. 기본 마크다운을 지원하며, 코드 블록과 체크리스트 작성도 자연스럽습니다.</p>
        <div className="panel-divider" />
        <p className="docs-p"><span className="pill">Markdown</span> <span className="pill">Code</span> <span className="pill">Checklist</span></p>
        <div className="code-group">
          <div className="code-header">
            <div className="code-title">Markdown</div>
            <button className="copy-btn" onClick={() => copy('md', '# 제목\n간단한 문단과 **강조**, 리스트\n\n- 체크리스트\n- [ ] 할 일 1\n- [x] 완료한 일\n\n```js\nconsole.log(\'snippet\');\n```')}>{copied==='md'?'Copied!':'Copy'}</button>
          </div>
          <pre className="docs-code">{`# 제목
간단한 문단과 **강조**, 리스트

- 체크리스트
- [ ] 할 일 1
- [x] 완료한 일

\`\`\`js
console.log('snippet');
\`\`\``}</pre>
        </div>
      </div>
    )
    if (activeId === 'organizing') return (
      <div className="panel-fade">
        <h2 className="panel-title">Organizing</h2>
        <p className="panel-sub">폴더/서브폴더로 지식을 층위 있게 정리하세요. 즐겨찾기로 중요한 노트를 고정하고, 검색/필터로 즉시 찾아갈 수 있습니다.</p>
        <div className="panel-divider" />
        <p className="docs-p">폴더 이동, 이름 변경, 정렬은 사이드바에서 간단히 관리할 수 있습니다.</p>
      </div>
    )
    if (activeId === 'shortcuts') return (
      <div className="panel-fade">
        <h2 className="panel-title">Keyboard Shortcuts</h2>
        <p className="panel-sub">핵심 동작은 단축키로 더 빠르게. 편집, 탐색, 전환이 손끝에서 이루어집니다.</p>
        <div className="panel-divider" />
        <pre className="docs-code">{`N: 새 노트
F: 검색 열기
S: 즐겨찾기 토글
⌘/Ctrl + K: 커맨드 팔레트`}</pre>
        <p className="docs-p">팁: <span className="kbd">⌘/Ctrl</span> + <span className="kbd">K</span> 로 언제든지 커맨드 팔레트를 열어 모든 기능에 빠르게 접근하세요.</p>
      </div>
    )
    if (activeId === 'stt') return (
      <div className="panel-fade">
        <h2 className="panel-title">Speech to Text</h2>
        <p className="panel-sub">아이디어가 떠오르는 순간, 음성으로 빠르게 기록하고 텍스트로 변환하세요. 권한만 허용하면 바로 시작할 수 있습니다.</p>
      </div>
    )
    if (activeId === 'open-source') return (
      <div className="panel-fade">
        <h2 className="panel-title">Open Source</h2>
        <p className="panel-sub">NoteFlow는 오픈소스입니다. 자유롭게 사용·학습·기여할 수 있습니다.</p>
        <div className="panel-divider" />
        <div className="docs-callout" style={{marginBottom:'12px'}}>
          <span className="mkt-badge">OS</span>
          <p className="docs-p" style={{marginTop:'6px'}}>저장소에서 코드를 확인하고, 이슈/PR로 참여하세요.</p>
        </div>
        <div className="repo-card">
          <div className="repo-logo" aria-hidden>
            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          </div>
          <div>
            <div className="repo-title">KKU-NoteFlow</div>
            <div className="repo-desc">코드 열람 · 이슈 · 기여 가이드 · 논의</div>
          </div>
          <div className="repo-actions">
            <a className="repo-btn" href="https://github.com/KKU-NoteFlow/" target="_blank" rel="noreferrer">View on GitHub</a>
            <a className="repo-btn alt" href="https://github.com/KKU-NoteFlow/" target="_blank" rel="noreferrer">⭐ Star</a>
          </div>
        </div>
       
        <div className="code-group" style={{marginTop:'12px'}}>
          <div className="code-header">
            <div className="code-title">Local Run (Frontend)</div>
            <button className="copy-btn" onClick={() => copy('run', 'git clone https://github.com/KKU-NoteFlow/KKU-NoteFlow.git\ncd KKU-NoteFlow/Frontend\nnpm install\nnpm run dev')}>{copied==='run'?'Copied!':'Copy'}</button>
          </div>
          <pre className="docs-code">{`git clone https://github.com/KKU-NoteFlow/KKU-NoteFlow.git
cd KKU-NoteFlow/Frontend
npm install
npm run dev`}</pre>
        </div>
      </div>
    )
    return (
      <div className="panel-fade">
        <h2 className="panel-title">FAQ</h2>
        <p className="panel-sub">자주 묻는 질문</p>
        <div className="panel-divider" />
        <p className="docs-p"><strong>Q.</strong> 데이터는 안전한가요? <strong>A.</strong> 로컬 및 서버 저장 정책을 따르며, 민감 정보는 안전하게 처리합니다.</p>
        <p className="docs-p"><strong>Q.</strong> 팀 협업은 가능한가요? <strong>A.</strong> 팀/권한 기능은 로드맵에 있습니다.</p>
      </div>
    )
  }

  return (
    <div>
      <MarketingNav />

      <section className="docs-hero">
        <div className="docs-hero-inner">
          <span className="docs-hero-eyebrow">DOCUMENTATION</span>
          <h1 className="docs-hero-title">NoteFlow Docs</h1>
          <p className="docs-hero-sub">더 적게 방해받고 더 빠르게 생각하기 위한, 간결하고 맑은 노트 경험. 이 문서는 NoteFlow를 효과적으로 사용하는 방법을 안내합니다.</p>
        </div>
      </section>

      {/* Index Cards */}
      <div className="docs-index">
        <a className={`docs-card ${activeId==='getting-started' ? 'active' : ''}`} href="#" onClick={(e) => { e.preventDefault(); go('getting-started') }}>
          <div className="icon-ring" aria-hidden>
            <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20Zm1 14h-2v-2h2v2Zm0-4h-2V6h2v6Z"/></svg>
          </div>
          <h3>Quick Start</h3>
          <p>3단계로 바로 시작</p>
        </a>
        <a className={`docs-card ${activeId==='creating-notes' ? 'active' : ''}`} href="#" onClick={(e) => { e.preventDefault(); go('creating-notes') }}>
          <div className="icon-ring" aria-hidden>
            <svg viewBox="0 0 24 24"><path d="M3 5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm12 0v4h4"/></svg>
          </div>
          <h3>Editor Basics</h3>
          <p>Markdown · 코드 · 체크</p>
        </a>
        <a className={`docs-card ${activeId==='organizing' ? 'active' : ''}`} href="#" onClick={(e) => { e.preventDefault(); go('organizing') }}>
          <div className="icon-ring" aria-hidden>
            <svg viewBox="0 0 24 24"><path d="M4 4h7v6H4V4Zm9 0h7v6h-7V4ZM4 14h7v6H4v-6Zm9 0h7v6h-7v-6Z"/></svg>
          </div>
          <h3>Organization</h3>
          <p>폴더 · 즐겨찾기 · 검색</p>
        </a>
        <a className={`docs-card ${activeId==='shortcuts' ? 'active' : ''}`} href="#" onClick={(e) => { e.preventDefault(); go('shortcuts') }}>
          <div className="icon-ring" aria-hidden>
            <svg viewBox="0 0 24 24"><path d="M7 7h10v2H7V7Zm0 4h7v2H7v-2Zm0 4h10v2H7v-2Z"/></svg>
          </div>
          <h3>Shortcuts</h3>
          <p>손을 떼지 않는 흐름</p>
        </a>
        <a className={`docs-card ${activeId==='stt' ? 'active' : ''}`} href="#" onClick={(e) => { e.preventDefault(); go('stt') }}>
          <div className="icon-ring" aria-hidden>
            <svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2Z"/></svg>
          </div>
          <h3>Speech to Text</h3>
          <p>아이디어를 음성으로</p>
        </a>
        <a className={`docs-card ${activeId==='open-source' ? 'active' : ''}`} href="#" onClick={(e) => { e.preventDefault(); go('open-source') }}>
          <div className="icon-ring" aria-hidden>
            <svg viewBox="0 0 24 24"><path d="M12 2 1 21h22L12 2Zm0 4.5L19.5 19h-3.9l-2.26-4.38A3 3 0 0 0 12 14a3 3 0 0 0-1.34.62L8.4 19H4.5L12 6.5Z"/></svg>
          </div>
          <h3>Open Source</h3>
          <p>코드 · 기여 · 별</p>
        </a>
      </div>

      {/* Single content panel */}
      <div ref={panelRef} className="docs-content">
        <div className="docs-panel">
          <Section />
        </div>
      </div>
    </div>
  )
}
/*
  Page: Docs (Marketing)
  Purpose: Official documentation hub. Uses a card index and a single content panel (tabs-like) for clarity.
  UX: Click a card → smooth scroll to the panel and render just that section; reduces long scrolling.
  Extras: Copy-to-clipboard buttons on code blocks, Open Source section with GitHub CTAs.
*/
