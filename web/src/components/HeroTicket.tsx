import { useEffect, useState } from 'react'
import { Qr, useRotation } from './Qr'

const CAPACITY = 120
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export function HeroTicket() {
  const { label, version } = useRotation()
  const [checkedIn, setCheckedIn] = useState(83)

  // Live staff counter ticks up now and then.
  useEffect(() => {
    if (reduceMotion()) return
    const id = setInterval(() => setCheckedIn(n => Math.min(n + 1, CAPACITY)), 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="stage" aria-label="Example Passmark ticket">
      <div className="scan-chip">
        <span className="muted">Checked in</span>
        <b>{checkedIn} <span className="muted" style={{ fontSize: '.9rem' }}>/ {CAPACITY}</span></b>
      </div>
      <div className="ticket">
        <div className="ticket-top"><span>EVENT TICKET</span><span>#0142</span></div>
        <h3>Fall General Meeting</h3>
        <p className="ticket-meta">Boiler Blockchain · Thu, Nov 12 · Lawson B155</p>
        <Qr size={21} version={version} label="Rotating QR code" />
        <div className="ticket-bar"><span key={version} /></div>
        <div className="ticket-foot">
          <span>New code in {label}</span>
          <span>Screenshots won't work</span>
        </div>
      </div>
      <div className="admit">
        <span className="check">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>
        </span>
        <span>Admit<small>Valid ticket · first entry</small></span>
      </div>
    </div>
  )
}
