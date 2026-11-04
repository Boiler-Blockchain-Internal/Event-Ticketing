import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../AuthProvider'
import { Arrow, Logo, Shield } from '../components/Logo'
import { event } from '../data'
import { navigate } from '../router'

const field = (e: FormEvent<HTMLFormElement>, name: string) => new FormData(e.currentTarget).get(name) as string

export function Redeem() {
  const auth = useAuth()
  const { state } = auth
  const [sentTo, setSentTo] = useState<string | null>(null)
  const email = 'email' in state ? state.email : undefined
  const enterCode = state.status === 'awaitingCode' || (state.status === 'error' && !!email)
  const error = state.status === 'error' ? state.message : null

  useEffect(() => { if (state.status === 'signedIn') navigate('/tickets') }, [state.status])

  // ponytail: without VITE_PRIVY_APP_ID (demo mode) sign-in just lands on the demo pass.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (auth.configured) auth.sendCode(field(e, 'email')); else setSentTo(field(e, 'email'))
  }
  const verify = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); auth.verifyCode(field(e, 'code')) }
  const google = () => auth.configured ? auth.signInWithGoogle() : navigate('/tickets')

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

      {sentTo ? (
        <section className="sent intro" aria-live="polite">
          <h2>Check your inbox</h2>
          <p className="muted">We sent a sign-in link to <b>{sentTo}</b>. Open it on this phone to claim your pass.</p>
          <a href="#/tickets" className="btn btn-primary">View my pass (demo) <Arrow /></a>
          <button className="link-btn" onClick={() => setSentTo(null)}>Use a different email</button>
        </section>
      ) : enterCode ? (
        <section className="sent intro" aria-live="polite">
          <h2>Check your inbox</h2>
          <p className="muted">We emailed a sign-in code to <b>{email}</b>. Enter it to claim your pass.</p>
          <form onSubmit={verify} className="email-form">
            <label htmlFor="code">Sign-in code</label>
            <input id="code" name="code" required inputMode="numeric" autoComplete="one-time-code" placeholder="123456" />
            {error && <p role="alert" className="muted">{error}</p>}
            <button className="btn btn-primary btn-block">Continue <Arrow /></button>
          </form>
          <button className="link-btn" onClick={() => auth.signOut()}>Use a different email</button>
        </section>
      ) : (
        <div className="intro" style={{ '--i': 2 } as React.CSSProperties}>
          <button className="btn btn-light btn-block" onClick={google}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20.5 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.8a4.1 4.1 0 01-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.9 2.6-6.5z" /><path d="M12 21c2.4 0 4.5-.8 5.9-2.2L15 16.5c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4v2.3A9 9 0 0012 21z" /></svg>
            Continue with Google
          </button>
          <p className="or"><span>or</span></p>
          <form onSubmit={submit} className="email-form">
            <label htmlFor="email">School email</label>
            <input id="email" name="email" type="email" required placeholder="you@purdue.edu" autoComplete="email" />
            {error && <p role="alert" className="muted">{error}</p>}
            <button className="btn btn-primary btn-block" disabled={state.status === 'sendingCode'}>
              {state.status === 'sendingCode' ? 'Sending…' : <>Email me a sign-in code <Arrow /></>}
            </button>
          </form>
        </div>
      )}

      <p className="note">
        <Shield /> No wallet or crypto needed. We set up a secure pass for you when you sign in.
      </p>
    </main>
  )
}
