import { useState, type FormEvent } from 'react'
import { Arrow, Logo, Shield } from '../components/Logo'
import { event } from '../data'
import { navigate, routeParam } from '../router'
import { CLAIM_URL, ME_URL, useAccount } from '../auth'

export function Redeem() {
  const account = useAccount()
  const eventId = routeParam('e') || event.id
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)

  const claimAndNavigate = async () => {
    if (!CLAIM_URL) {
      navigate('/tickets')
      return
    }
    setClaiming(true)
    setError(null)
    try {
      const [token, address, info] = await Promise.all([
        account.idToken(),
        account.address(),
        account.userInfo(),
      ])
      if (!token) throw new Error('Sign-in required to claim pass.')
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
      setClaiming(false)
    }
  }

  // Live: MetaMask's sign-in window (Google, or a code sent to the email). Demo: lands on the demo pass.
  const signIn = (email?: string) => {
    setError(null)
    account.signIn(email).then(
      () => claimAndNavigate(),
      () => setError("Sign-in didn't finish. Try again.")
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
        <h1 className="app-title">Claim your pass to {event.name}</h1>
      </div>

      <section className="event-card intro" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="event-card-head">
          <span className="org-badge">{event.orgInitials}</span>
          <div><b>{event.org}</b><small>Event ticket</small></div>
          <span className="tag">FREE</span>
        </div>
        <dl className="event-facts">
          <div><dt>Date</dt><dd>{event.date}</dd></div>
          <div><dt>Venue</dt><dd>{event.venue}</dd></div>
          <div><dt>Doors</dt><dd>{event.doors}</dd></div>
          <div><dt>Spots left</dt><dd>{event.capacity - event.claimed} of {event.capacity}</dd></div>
        </dl>
      </section>

      {account.signedIn ? (
        <section className="sent intro" aria-live="polite">
          <h2>You're signed in</h2>
          <p className="muted">Your passes are ready in your account.</p>
          {error && <p className="note" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={claiming} onClick={claimAndNavigate}>
            {claiming ? 'Setting up your pass…' : <>Claim this pass <Arrow /></>}
          </button>
          <a href="#/tickets" className="btn btn-ghost btn-block">View my passes</a>
          <button className="link-btn" onClick={() => account.signOut().then(() => window.location.reload())}>Sign out</button>
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
          <button className="btn btn-light btn-block" disabled={!account.ready} onClick={() => ME_URL ? signIn() : navigate('/tickets')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20.5 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.8a4.1 4.1 0 01-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.9 2.6-6.5z" /><path d="M12 21c2.4 0 4.5-.8 5.9-2.2L15 16.5c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4v2.3A9 9 0 0012 21z" /></svg>
            Continue with Google
          </button>
          <p className="or"><span>or</span></p>
          <form onSubmit={submit} className="email-form">
            <label htmlFor="email">School email</label>
            <input id="email" name="email" type="email" required placeholder="you@purdue.edu" autoComplete="email" />
            <button className="btn btn-primary btn-block" disabled={!account.ready}>{ME_URL ? 'Email me a sign-in code' : 'Email me a sign-in link'} <Arrow /></button>
          </form>
        </div>
      )}

      <p className="note">
        <Shield /> No wallet or crypto needed. We set up a secure pass for you when you sign in.
      </p>
    </main>
  )
}
