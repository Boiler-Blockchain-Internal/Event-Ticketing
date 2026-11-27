import { useState } from 'react'
import { Arrow, Logo } from './Logo'
import { useAccount } from '../auth'

// Sign-in screen for organizer pages. Access itself is decided by the server (ORGANIZER_EMAILS).
export function OrganizerSignIn({ title }: { title: string }) {
  const account = useAccount()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const signIn = (email?: string) => {
    setBusy(true)
    setError(null)
    account.signIn(email).catch(() => setError("Sign-in didn't finish. Try again.")).finally(() => setBusy(false))
  }
  return (
    <main className="app">
      <Logo />
      <div className="intro"><p className="eyebrow">Organizer</p><h1 className="app-title">{title}</h1></div>
      <div className="intro">
        {error && <p className="note" role="alert">{error}</p>}
        <button className="btn btn-light btn-block" disabled={!account.ready || busy} onClick={() => signIn()}>Continue with Google</button>
        <p className="or"><span>or</span></p>
        <form className="email-form" onSubmit={e => { e.preventDefault(); signIn(new FormData(e.currentTarget).get('email') as string) }}>
          <label htmlFor="email">Organizer email</label>
          <input id="email" name="email" type="email" required placeholder="you@purdue.edu" autoComplete="email" />
          <button className="btn btn-primary btn-block" disabled={!account.ready || busy}>Email me a sign-in code <Arrow /></button>
        </form>
      </div>
    </main>
  )
}
