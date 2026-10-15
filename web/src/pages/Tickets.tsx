import { useState } from 'react'
import { Qr, useRotation } from '../components/Qr'
import { event, history, membership, myTicket } from '../data'

export function Tickets() {
  const [tab, setTab] = useState<'passes' | 'history'>('passes')
  const { label, version } = useRotation()

  return (
    <main className="app">
      <header className="app-bar">
        <a href="#/" className="icon-btn" aria-label="Back to home">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
        </a>
        <h1>My passes</h1>
        <span className="avatar" aria-label={myTicket.holder}>{myTicket.initials}</span>
      </header>

      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={tab === 'passes'} onClick={() => setTab('passes')}>Passes</button>
        <button role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>History</button>
      </div>

      {tab === 'passes' ? (
        <>
          <section className="ticket ticket-app">
            <div className="ticket-top"><span>EVENT TICKET</span><span>{myTicket.id}</span></div>
            <h3>{event.name}</h3>
            <p className="ticket-meta">{event.org} · {event.shortDate} · {event.venue}</p>
            <Qr size={21} version={version} label={`Pass ${myTicket.id}, refreshes every 30 seconds`} />
            <div className="ticket-bar"><span key={version} /></div>
            <div className="ticket-foot"><span>New code in {label}</span><span>Screenshots won't work</span></div>
            <p className="ticket-hint">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              Turn up brightness and show this at the door.
            </p>
          </section>

          <div className="member-row intro">
            <span className="member-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="12" r="2" /><path d="M14 10h4M14 14h3" /></svg>
            </span>
            <span><b>{membership.label}</b><small>{membership.org} · {membership.status}</small></span>
            <span className="pill ok">Active</span>
          </div>
        </>
      ) : (
        <ul className="history">
          {history.map((h, n) => (
            <li key={h.id} className="intro" style={{ '--i': n } as React.CSSProperties}>
              <div><b>{h.name}</b><small>{h.org} · {h.date}</small></div>
              <span className="pill ok">Attended</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
