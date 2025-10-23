import React from 'react'

type ProgressProps = {
  value: number // 0..100
  label?: string
}

const Progress: React.FC<ProgressProps> = ({ value, label }) => (
  <div className="nf-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}>
    <div className="nf-progress__bar" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
)

export default Progress
/*
  UI: Progress
  Purpose: Linear progress indicator for loading or tasks.
*/
