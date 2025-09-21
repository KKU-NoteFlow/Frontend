// src/components/ErrorBoundary.jsx
import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="nf-card" style={{ padding: 16, color: 'var(--nf-muted)' }}>
          내용을 표시하는 중 문제가 발생했습니다.
        </div>
      )
    }
    return this.props.children
  }
}

