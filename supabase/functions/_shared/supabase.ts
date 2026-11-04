import type { Deps } from './scan.ts'
import type { Login } from './login.ts'

export type EventSummary = { name: string; capacity: number | null; checkedIn: number }
export type PassInfo = {
  credentialId: string; eventId: string; kind: 'event' | 'membership'; status: 'active' | 'revoked'
  name: string; org: string; startsAt: string | null; venue: string | null; checkedInAt: string | null
}

// Scan deps backed by Supabase PostgREST over plain fetch (works in Deno edge functions and Node).
// Needs the service-role / secret key: server-side only, never ship it to the browser.
export function supabaseDeps(url: string, serviceKey: string) {
  const headers: Record<string, string> = { apikey: serviceKey, 'Content-Type': 'application/json' }
  if (serviceKey.startsWith('eyJ')) headers.Authorization = `Bearer ${serviceKey}` // legacy JWT keys; sb_secret_ keys go in apikey only
  const get = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${url}/rest/v1/${path}`, { headers, ...init })
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
    return res.json()
  }

  const deps: Deps = {
    async getCredential(id) {
      // id is digits only (readPass guarantees it); numerics come back as text to keep uint256 exact.
      const [c] = await get(`credentials?id=eq.${id}&select=event_id,status,reissued_as::text,users(name,email,wallet_address)`)
      if (!c?.users?.wallet_address) return null
      return {
        owner: c.users.wallet_address,
        eventId: c.event_id,
        holder: c.users.name ?? c.users.email,
        revoked: c.status === 'revoked',
        reissuedAs: c.reissued_as ?? undefined,
      }
    },
    async checkIn(eventId, credentialId, nonce) {
      const [row] = await get('rpc/check_in', {
        method: 'POST',
        body: JSON.stringify({ p_event: eventId, p_credential: credentialId, p_nonce: nonce }),
      })
      return { result: row.result, at: row.checked_in_at }
    },
  }

  return {
    ...deps,
    async eventSummary(eventId: string): Promise<EventSummary | null> {
      const [e] = await get(`events?id=eq.${encodeURIComponent(eventId)}&select=name,capacity,checkins(count)`)
      return e ? { name: e.name, capacity: e.capacity, checkedIn: e.checkins[0]?.count ?? 0 } : null
    },
    // Creates or refreshes the user keyed by wallet. Throws `Supabase 409` if the email already has another wallet.
    async saveUser(login: Login): Promise<string> {
      try {
        const [u] = await get('users?on_conflict=wallet_address&select=id', {
          method: 'POST',
          headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({ email: login.email, name: login.name, wallet_address: login.address }),
        })
        return u.id
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('Supabase 409')) {
          const [existing] = await get(`users?wallet_address=eq.${encodeURIComponent(login.address)}&select=id`)
          if (existing?.id) return existing.id
        }
        throw e
      }
    },
    async passesFor(userId: string): Promise<PassInfo[]> {
      const rows = await get(`credentials?holder_id=eq.${userId}&reissued_as=is.null&order=id.desc` +
        '&select=id::text,status,events!credentials_event_id_fkey(id,kind,name,starts_at,venue,orgs(name)),checkins(checked_in_at)')
      return rows.map((r: any) => ({
        credentialId: r.id, eventId: r.events.id, kind: r.events.kind, status: r.status,
        name: r.events.name, org: r.events.orgs.name, startsAt: r.events.starts_at, venue: r.events.venue,
        checkedInAt: r.checkins[0]?.checked_in_at ?? null,
      }))
    },
  }
}
