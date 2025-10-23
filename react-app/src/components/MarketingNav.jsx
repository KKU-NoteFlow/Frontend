import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import '../css/Marketing.css'

export default function MarketingNav() {
  const { pathname } = useLocation()
  return (
    <header className="mkt-nav">
      <div className="mkt-nav-inner">
        <Link to="/home" className="mkt-brand">
          <img src="/logo.png" alt="NoteFlow" className="mkt-logo" />
          <span className="mkt-brand-text">NoteFlow</span>
        </Link>
        <nav className="mkt-links">
          <Link to="/home" className={`mkt-link ${pathname === '/home' ? 'active' : ''}`}>Home</Link>
          <Link to="/pricing" className={`mkt-link ${pathname === '/pricing' ? 'active' : ''}`}>Pricing</Link>
          <Link to="/docs" className={`mkt-link ${pathname === '/docs' ? 'active' : ''}`}>Docs</Link>
        </nav>
        <div className="mkt-cta">
          <Link to="/" className="mkt-login-btn">Login</Link>
        </div>
      </div>
    </header>
  )
}
/*
  Component: MarketingNav
  Role: Top navigation for marketing/docs pages — brand, primary links, and Login CTA.
  Behavior: Highlights active route via `useLocation().pathname`.
*/
