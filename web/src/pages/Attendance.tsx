import { useEffect, useState, type FormEvent } from 'react'
import { Arrow, Logo } from '../components/Logo'
import { attendees as demoAttendees, event } from '../data'
import { routeParam } from '../router'
import { ME_URL, useAccount } from '../auth'
import { session } from '../session'
import { downloadCsv } from '../csv'
import { ticketLabel } from '../../../supabase/functions/_shared/pass.ts'
import type { AttendanceRow } from '../../../supabase/functions/_shared/supabase.ts'

// Organizer view after (or during) an event: who claimed, who came, who didn't, as a list and a CSV.
const API = ME_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/attendance` : null

type Sheet = { name: string; rows: AttendanceRow[] }
const demoSheet: Sheet = {
  name: event.name,
  rows: Object.entries(demoAttendees).map(([ticket, a], n) => ({
    credentialId: ticket.slice(1).replace(/^0+/, ''), status: a.revoked ? 'revoked' : 'active',
    name: a.name, email: `${a.name.split(' ')[0].toLowerCase()}@purdue.edu`,
    checkedInAt: n < 3 ? new Date(Date.UTC(2026, 10, 13, 0, 2 + n * 4)).toISOString() : null,
  })),
}

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function useSheet(eventId: string | null, signedIn: boolean, reload: number) {
  const account = useAccount()
  const [sheet, setSheet] = useState<Sheet | null>(API ? null : demoSheet)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!API || !eventId || !signedIn) return
    let live = true
    setError(null)
    session(account).then(async ({ token, address }) => {
      const res = await fetch(API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, address }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(res.status === 404 ? 'No event with that ID.' : body.error ?? 'Could not load attendance. Try again.')
      if (live) setSheet({ name: body.event.name, rows: body.attendees })
    }).catch(e => {
      if (live) setError(e instanceof TypeError ? 'No connection · reload to retry' : e.message)
    })
    return () => { live = false }
  }, [eventId, signedIn, reload])
  return { sheet, error }
}

export function Attendance() {
  const account = useAccount()
  const [eventId, setEventId] = useState(routeParam('e'))
  const [reload, setReload] = useState(0)
  const [signingIn, setSigningIn] = useState(false)
  const { sheet, error } = useSheet(eventId, account.signedIn, reload)

  const pick = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const id = (new FormData(e.currentTarget).get('event') as string).trim()
    history.replaceState(null, '', `#/attendance?e=${encodeURIComponent(id)}`) // shareable, without a route change
    setEventId(id)
  }
  const signIn = (email?: string) => {
    setSigningIn(true)
    account.signIn(email).finally(() => setSigningIn(false))
  }

  if (API && !eventId) return (
    <main className="app">
      <Logo />
      <div className="intro"><p className="eyebrow">Organizer</p><h1 className="app-title">Attendance</h1></div>
      <form className="form intro" onSubmit={pick}>
        <label htmlFor="event">Event ID <small>from the claim link, after ?e=</small></label>
        <input id="event" name="event" required pattern="[A-Za-z0-9_\-]+" placeholder="spring-kickoff" />
        <button className="btn btn-primary btn-block">Show attendance <Arrow /></button>
      </form>
    </main>
  )

  if (API && !account.signedIn) return (
    <main className="app">
      <Logo />
      <div className="intro"><p className="eyebrow">Organizer</p><h1 className="app-title">Sign in to see attendance</h1></div>
      <div className="intro">
        <button className="btn btn-light btn-block" disabled={!account.ready || signingIn} onClick={() => signIn()}>Continue with Google</button>
        <p className="or"><span>or</span></p>
        <form className="email-form" onSubmit={e => { e.preventDefault(); signIn(new FormData(e.currentTarget).get('email') as string) }}>
          <label htmlFor="email">Organizer email</label>
          <input id="email" name="email" type="email" required placeholder="you@purdue.edu" autoComplete="email" />
          <button className="btn btn-primary btn-block" disabled={!account.ready || signingIn}>Email me a sign-in code <Arrow /></button>
        </form>
      </div>
    </main>
  )

  const rows = sheet?.rows ?? []
  const active = rows.filter(r => r.status === 'active')
  const came = active.filter(r => r.checkedInAt).length
  const exportCsv = () => downloadCsv(`${eventId ?? event.id}-attendance.csv`, [
    ['Ticket', 'Name', 'Email', 'Status', 'Checked in at'],
    ...rows.map(r => [ticketLabel(r.credentialId), r.name, r.email,
      r.status === 'revoked' ? 'Revoked' : r.checkedInAt ? 'Checked in' : 'No-show', r.checkedInAt]),
  ])

  return (
    <main className="app">
      <Logo />
      <div className="intro">
        <p className="eyebrow">Attendance</p>
        <h1 className="app-title">{sheet?.name ?? 'Loading…'}</h1>
      </div>
      {error && <p className="note" role="alert">{error}</p>}
      {sheet && <>
        <section className="event-card intro">
          <dl className="event-facts">
            <div><dt>Checked in</dt><dd>{came}</dd></div>
            <div><dt>No-shows</dt><dd>{active.length - came}</dd></div>
            <div><dt>Passes</dt><dd>{active.length}</dd></div>
            <div><dt>Revoked</dt><dd>{rows.length - active.length}</dd></div>
          </dl>
        </section>
        <button className="btn btn-primary btn-block" onClick={exportCsv} disabled={!rows.length}>Download CSV</button>
        {API && <button className="btn btn-ghost btn-block" onClick={() => setReload(n => n + 1)}>Refresh</button>}
        <ul className="history" aria-label="Attendees">
          {rows.map(r => (
            <li key={r.credentialId}>
              <div><b>{r.name || r.email}</b><small>{ticketLabel(r.credentialId)}{r.name && r.email ? ` · ${r.email}` : ''}</small></div>
              {r.status === 'revoked' ? <span className="pill revoked">Revoked</span>
                : r.checkedInAt ? <span className="pill ok">{time(r.checkedInAt)}</span>
                  : <span className="pill claimed">No-show</span>}
            </li>
          ))}
          {!rows.length && <li><small>No passes claimed yet.</small></li>}
        </ul>
      </>}
    </main>
  )
}
