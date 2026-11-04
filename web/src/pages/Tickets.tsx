import { useEffect, useState } from 'react'
import { Qr, useRotation } from '../components/Qr'
import { event, history, membership, myTicket } from '../data'
import { ME_URL, useAccount } from '../auth'
import { makePass, ticketLabel, type Signer } from '../../../supabase/functions/_shared/pass.ts'
import type { PassInfo } from '../../../supabase/functions/_shared/supabase.ts'

type View = { user: { name: string; initials: string }; passes: PassInfo[]; history: { id: string; name: string; org: string; date: string }[] }

const demoView: View = {
  user: { name: myTicket.holder, initials: myTicket.initials },
  passes: [{
    credentialId: myTicket.id.replace(/\D/g, '').replace(/^0+/, ''), eventId: event.id, kind: 'event', status: 'active',
    name: event.name, org: event.org, startsAt: null, venue: event.venue, checkedInAt: null,
  }],
  history,
}

const day = (iso: string | null) => iso ? new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : null
const initials = (s: string) => s.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')

// Fresh signed code every rotation, and again when the phone wakes (a backgrounded tab may hold an expired one).
function usePassCode(signer: Signer | undefined, credentialId: string, eventId: string, version: number) {
  const [code, setCode] = useState<string>()
  useEffect(() => {
    if (!signer) return
    let live = true
    const refresh = () => makePass(signer, credentialId, eventId).then(c => live && setCode(c), () => {})
    refresh()
    const onWake = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onWake)
    return () => { live = false; document.removeEventListener('visibilitychange', onWake) }
  }, [signer, credentialId, eventId, version])
  return code
}

function PassCard({ pass, signer }: { pass: PassInfo; signer?: Signer }) {
  const { label, version } = useRotation()
  const code = usePassCode(signer, pass.credentialId, pass.eventId, version)
  const id = ticketLabel(pass.credentialId)
  const date = pass.startsAt ? day(pass.startsAt) : event.shortDate
  return (
    <section className="ticket ticket-app">
      <div className="ticket-top"><span>{pass.kind === 'membership' ? 'MEMBER CARD' : 'EVENT TICKET'}</span><span>{id}</span></div>
      <h3>{pass.name}</h3>
      <p className="ticket-meta">{[pass.org, pass.kind === 'event' && date, pass.venue].filter(Boolean).join(' · ')}</p>
      <Qr size={21} version={version} value={code} label={`Pass ${id}, refreshes every 30 seconds`} />
      <div className="ticket-bar"><span key={version} /></div>
      <div className="ticket-foot"><span>New code in {label}</span><span>Screenshots won't work</span></div>
      <p className="ticket-hint">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        Turn up brightness and show this at the door.
      </p>
    </section>
  )
}

// Live: asks the `me` function for this attendee's passes. Demo: the mock pass.
function useView(): { view: View | null; error: string | null } {
  const account = useAccount()
  const [view, setView] = useState<View | null>(ME_URL ? null : demoView)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!ME_URL || !account.signedIn) return
    account.idToken().then(async token => {
      const res = await fetch(ME_URL!, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Something went wrong. Try again.')
      const name = body.user.name ?? body.user.email
      setView({
        user: { name, initials: initials(name) },
        passes: body.passes.filter((p: PassInfo) => p.status === 'active'),
        history: body.passes.filter((p: PassInfo) => p.checkedInAt)
          .map((p: PassInfo) => ({ id: p.credentialId, name: p.name, org: p.org, date: day(p.checkedInAt)! })),
      })
    }).catch(e => setError(e instanceof TypeError ? 'No connection · reload to retry' : e.message))
  }, [account.signedIn])
  return { view, error }
}

export function Tickets() {
  const account = useAccount()
  const [tab, setTab] = useState<'passes' | 'history'>('passes')
  const { view, error } = useView()

  if (account.ready && !account.signedIn) {
    return (
      <main className="app">
        <h1 className="app-title">Sign in to see your passes</h1>
        <a href="#/redeem" className="btn btn-primary btn-block">Sign in</a>
      </main>
    )
  }

  return (
    <main className="app">
      <header className="app-bar">
        <a href="#/" className="icon-btn" aria-label="Back to home">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
        </a>
        <h1>My passes</h1>
        {view && (ME_URL
          ? <button className="avatar" aria-label={`Sign out ${view.user.name}`} title="Sign out" onClick={() => account.signOut()}>{view.user.initials}</button>
          : <span className="avatar" aria-label={view.user.name}>{view.user.initials}</span>)}
      </header>

      {error ? (
        <section className="intro">
          <p className="note" role="alert">{error}</p>
          <button className="btn btn-primary btn-block" onClick={() => account.signOut().then(() => window.location.reload())}>
            Sign out & retry
          </button>
        </section>
      ) : !view ? <p className="note" aria-live="polite">Loading your passes…</p> : (
        <>
          <div className="segmented" role="tablist">
            <button role="tab" aria-selected={tab === 'passes'} onClick={() => setTab('passes')}>Passes</button>
            <button role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>History</button>
          </div>

          {tab === 'passes' ? (
            <>
              {view.passes.map(p => <PassCard key={p.credentialId} pass={p} signer={account.signer} />)}
              {!view.passes.length && <p className="note">No passes yet. Open the invite link from your organizer to claim one.</p>}
              {!ME_URL && (
                <div className="member-row intro">
                  <span className="member-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="12" r="2" /><path d="M14 10h4M14 14h3" /></svg>
                  </span>
                  <span><b>{membership.label}</b><small>{membership.org} · {membership.status}</small></span>
                  <span className="pill ok">Active</span>
                </div>
              )}
            </>
          ) : (
            <ul className="history">
              {view.history.map((h, n) => (
                <li key={h.id} className="intro" style={{ '--i': n } as React.CSSProperties}>
                  <div><b>{h.name}</b><small>{h.org} · {h.date}</small></div>
                  <span className="pill ok">Attended</span>
                </li>
              ))}
              {!view.history.length && <li><small>Events you check in to show up here.</small></li>}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
