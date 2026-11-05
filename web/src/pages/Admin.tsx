import { useState, type FormEvent } from 'react'
import { Arrow, Logo } from '../components/Logo'
import { slugify } from '../slug.ts'

// ponytail: #/admin is unguarded and the events function takes no auth; add an organizer check with role permissions (build step 7).
const API = import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/events` : null

type Created = { event: { id: string; name: string }; claimPath: string; scanPath: string | null; txHash: string | null }

const iso = (v: FormDataEntryValue | null) => v ? new Date(v as string).toISOString() : undefined
const fullUrl = (hashPath: string) => `${location.origin}${location.pathname}${hashPath}`

function CopyLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => navigator.clipboard.writeText(url).then(() => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, () => {})
  return (
    <div className="copy-link">
      <span><small>{label}</small><code>{url}</code></span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
    </div>
  )
}

export function Admin() {
  const [name, setName] = useState('')
  const [id, setId] = useState<string | null>(null) // null = follow the name
  const [kind, setKind] = useState<'event' | 'membership'>('event')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Created | null>(null)
  const eventId = id ?? slugify(name)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const body = {
      id: eventId,
      name: name.trim(),
      kind,
      venue: (f.get('venue') as string)?.trim() || undefined,
      capacity: f.get('capacity') ? Number(f.get('capacity')) : undefined,
      startsAt: iso(f.get('startsAt')),
      doorsOpenAt: iso(f.get('doorsOpenAt')),
      doorsCloseAt: iso(f.get('doorsCloseAt')),
    }
    setError(null)
    if (!API) { // Demo: no backend configured, show what the links will look like.
      setCreated({ event: body, claimPath: `#/redeem?e=${encodeURIComponent(body.id)}`, scanPath: '#/scan?t=demo', txHash: null })
      return
    }
    setBusy(true)
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error ?? 'Could not create the event. Try again.')
      setCreated(out)
    } catch (err) {
      setError(err instanceof TypeError ? 'No connection · check your network and try again' : (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const reset = () => { setCreated(null); setName(''); setId(null); setKind('event') }

  if (created) return (
    <main className="app">
      <Logo />
      <section className="sent intro" aria-live="polite">
        <p className="eyebrow">Event created</p>
        <h2>{created.event.name}</h2>
        <CopyLink label="Claim link · share with attendees" url={fullUrl(created.claimPath)} />
        {created.scanPath
          ? <CopyLink label="Door link · for scanning staff only, expires in 14 days" url={fullUrl(created.scanPath)} />
          : <p className="note" role="alert">No door link: STAFF_LINK_SECRET isn't set on the server.</p>}
        {created.txHash && <a className="link-btn" href={`https://sepolia.basescan.org/tx/${created.txHash}`} target="_blank" rel="noreferrer">View registration on Basescan</a>}
        <button className="btn btn-primary btn-block" onClick={reset}>Create another</button>
      </section>
    </main>
  )

  return (
    <main className="app">
      <Logo />
      <div className="intro">
        <p className="eyebrow">Organizer</p>
        <h1 className="app-title">Create an event</h1>
      </div>
      <form className="form intro" style={{ '--i': 1 } as React.CSSProperties} onSubmit={submit}>
        <label htmlFor="name">Event name</label>
        <input id="name" required value={name} onChange={e => setName(e.target.value)} placeholder="Spring Kickoff" />

        <label htmlFor="id">Event ID <small>used in the claim link</small></label>
        <input id="id" required pattern="[A-Za-z0-9_\-]+" title="Letters, numbers, - and _ only" value={eventId}
          onChange={e => setId(e.target.value)} placeholder="spring-kickoff" />

        <label htmlFor="kind">Type</label>
        <select id="kind" value={kind} onChange={e => setKind(e.target.value as 'event' | 'membership')}>
          <option value="event">Event ticket</option>
          <option value="membership">Membership card</option>
        </select>

        {kind === 'event' && <>
          <label htmlFor="startsAt">Starts at</label>
          <input id="startsAt" name="startsAt" type="datetime-local" />
          <label htmlFor="doorsOpenAt">Doors open <small>optional</small></label>
          <input id="doorsOpenAt" name="doorsOpenAt" type="datetime-local" />
          <label htmlFor="doorsCloseAt">Doors close <small>optional</small></label>
          <input id="doorsCloseAt" name="doorsCloseAt" type="datetime-local" />
          <label htmlFor="venue">Venue</label>
          <input id="venue" name="venue" placeholder="Lawson B155" />
        </>}

        <label htmlFor="capacity">Capacity</label>
        <input id="capacity" name="capacity" type="number" min="1" step="1" placeholder="150" />

        {error && <p className="note" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <><span className="spinner" aria-hidden="true" />Creating event…</> : <>Create event <Arrow /></>}
        </button>
      </form>
    </main>
  )
}
