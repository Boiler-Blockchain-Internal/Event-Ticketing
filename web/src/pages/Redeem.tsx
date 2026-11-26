import { useEffect, useState, type FormEvent } from 'react'
import { Arrow, Logo, Shield } from '../components/Logo'
import { event } from '../data'
import { navigate, routeParam } from '../router'
import { session } from '../session'
import { eventCard, type EventCard } from '../eventCard'
import { CLAIM_URL, ME_URL, useAccount } from '../auth'

const EVENTS_URL = ME_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/events` : null
const demoCard: EventCard = {
  name: event.name, org: event.org, orgInitials: event.orgInitials, kind: 'Event ticket',
  date: event.date, venue: event.venue, doors: event.doors, spots: `${event.capacity - event.claimed} of ${event.capacity}`,
}

// Live link with ?e=: the real event from the events function. Demo, or no ?e=: the mock event.
// A failed load shows a message rather than the mock, so nobody claims under the wrong event name.
function useEventCard(slug: string | null) {
  const [card, setCard] = useState<EventCard | null>(EVENTS_URL && slug ? null : demoCard)
  const [problem, setProblem] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    if (!EVENTS_URL || !slug) return
    let live = true
    fetch(`${EVENTS_URL}?id=${encodeURIComponent(slug)}`).then(async res => {
      const body = await res.json().catch(() => ({}))
      if (!live) return
      if (res.status === 404) {
        setMissing(true)
        setProblem("We couldn't find this event. Check the link with the organizer.")
        return
      }
      if (!res.ok) throw new Error(body.error)
      setCard(eventCard(body.event, body.claimed))
    }).catch(e => {
      if (live) setProblem(e instanceof TypeError ? 'No connection · reload to see the event details' : "Couldn't load this event. Reload to retry.")
    })
    return () => { live = false }
  }, [slug])
  return { card, problem, missing }
}

export function Redeem() {
  const account = useAccount()
  const slug = routeParam('e')
  const eventId = slug || event.id
  const { card, problem, missing } = useEventCard(slug)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // What we're waiting on, shown so the gap between sign-in and passes doesn't look frozen.
  const [busy, setBusy] = useState<string | null>(null)

  const handleSignOut = async () => {
    try {
      await account.signOut()
    } finally {
      window.location.hash = '#/redeem'
      window.location.reload()
    }
  }

  const claimAndNavigate = async () => {
    if (!CLAIM_URL) {
      navigate('/tickets')
      return
    }
    setBusy('Setting up your pass…')
    setError(null)
    try {
      const { token, address } = await session(account)
      const info = await account.userInfo()
      const res = await fetch(CLAIM_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId, address, email: info?.email, name: info?.name }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to claim pass. Try again.')
      navigate('/tickets')
    } catch (err: any) {
      setError(err instanceof TypeError ? 'No connection · reload to retry' : err?.message || 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  // Live: MetaMask's sign-in window (Google, or a code sent to the email). Demo: lands on the demo pass.
  const signIn = (email?: string) => {
    setError(null)
    setBusy('Signing you in…')
    account.signIn(email).then(
      () => claimAndNavigate(),
      () => { setBusy(null); setError("Sign-in didn't finish. Try again.") }
    )
  }
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = new FormData(e.currentTarget).get('email') as string
    if (ME_URL) signIn(email)
    else setSentTo(email)
  }

  return (
    <main className="app">
      <Logo />
      <div className="intro">
        <p className="eyebrow">You're invited</p>
        <h1 className="app-title">Claim your pass{card ? ` to ${card.name}` : ''}</h1>
      </div>

      {problem && <p className="note" role="alert">{problem}</p>}
      {card ? (
        <section className="event-card intro" style={{ '--i': 1 } as React.CSSProperties}>
          <div className="event-card-head">
            <span className="org-badge">{card.orgInitials}</span>
            <div><b>{card.org || card.name}</b><small>{card.kind}</small></div>
            <span className="tag">FREE</span>
          </div>
          <dl className="event-facts">
            {([['Date', card.date], ['Venue', card.venue], ['Doors', card.doors], ['Spots left', card.spots]] as const)
              .filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </section>
      ) : !problem && (
        <section className="event-card intro" aria-busy="true"><p className="muted"><span className="spinner" aria-hidden="true" />Loading event…</p></section>
      )}

      {account.signedIn ? (
        <section className="sent intro" aria-live="polite">
          <h2>You're signed in</h2>
          <p className="muted">Your passes are ready in your account.</p>
          {error && <p className="note" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={!!busy || missing} onClick={claimAndNavigate}>
            {busy ? <><span className="spinner" aria-hidden="true" />{busy}</> : <>Claim this pass <Arrow /></>}
          </button>
          <a href="#/tickets" className="btn btn-ghost btn-block">View my passes</a>
          <button className="link-btn" onClick={handleSignOut}>Sign out</button>
        </section>
      ) : busy ? (
        <section className="sent intro" aria-live="polite">
          <h2><span className="spinner" aria-hidden="true" />{busy}</h2>
          <p className="muted">Finish in the sign-in window. This can take a few seconds.</p>
          {/* Escape hatch if the sign-in window is closed without telling us. */}
          <button className="link-btn" onClick={() => setBusy(null)}>Cancel</button>
        </section>
      ) : sentTo ? (
        <section className="sent intro" aria-live="polite">
          <h2>Check your inbox</h2>
          <p className="muted">We sent a sign-in link to <b>{sentTo}</b>. Open it on this phone to claim your pass.</p>
          <a href="#/tickets" className="btn btn-primary">View my pass (demo) <Arrow /></a>
          <button className="link-btn" onClick={() => setSentTo(null)}>Use a different email</button>
        </section>
      ) : (
        <div className="intro" style={{ '--i': 2 } as React.CSSProperties}>
          {error && <p className="note" role="alert">{error}</p>}
          <button className="btn btn-light btn-block" disabled={!account.ready || missing} onClick={() => ME_URL ? signIn() : navigate('/tickets')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20.5 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.8a4.1 4.1 0 01-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.9 2.6-6.5z" /><path d="M12 21c2.4 0 4.5-.8 5.9-2.2L15 16.5c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4v2.3A9 9 0 0012 21z" /></svg>
            Continue with Google
          </button>
          <p className="or"><span>or</span></p>
          <form onSubmit={submit} className="email-form">
            <label htmlFor="email">School email</label>
            <input id="email" name="email" type="email" required placeholder="you@purdue.edu" autoComplete="email" />
            <button className="btn btn-primary btn-block" disabled={!account.ready || missing}>{ME_URL ? 'Email me a sign-in code' : 'Email me a sign-in link'} <Arrow /></button>
          </form>
        </div>
      )}

      <p className="note">
        <Shield /> No wallet or crypto needed. We set up a secure pass for you when you sign in.
      </p>
    </main>
  )
}
