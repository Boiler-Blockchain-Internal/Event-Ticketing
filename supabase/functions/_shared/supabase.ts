import type { Deps } from './scan.ts'
import type { Login } from './login.ts'

export type EventSummary = { name: string; capacity: number | null; checkedIn: number }
export type PassInfo = {
  credentialId: string; eventId: string; kind: 'event' | 'membership'; status: 'active' | 'revoked'
  name: string; org: string; startsAt: string | null; venue: string | null; checkedInAt: string | null
}
export type ClaimTarget = {
  event: { id: string; name: string; capacity: number | null } | null
  activeCount: number
  existingCredentialId: string | null
}
export type CreateEventInput = {
  id: string
  name: string
  orgId?: string
  orgName?: string
  kind?: 'event' | 'membership'
  startsAt?: string | null
  doorsOpenAt?: string | null
  doorsCloseAt?: string | null
  venue?: string | null
  capacity?: number | null
}

// Scan deps backed by Supabase PostgREST over plain fetch (works in Deno edge functions and Node).
// Needs the service-role / secret key: server-side only, never ship it to the browser.
export function supabaseDeps(url: string, serviceKey: string) {
  const headers: Record<string, string> = { apikey: serviceKey, 'Content-Type': 'application/json' }
  if (serviceKey.startsWith('eyJ')) headers.Authorization = `Bearer ${serviceKey}` // legacy JWT keys; sb_secret_ keys go in apikey only
  const get = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${url}/rest/v1/${path}`, { headers, ...init })
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
    const text = await res.text()
    return text ? JSON.parse(text) : null
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
      const [u] = await get('users?on_conflict=wallet_address&select=id', {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ email: login.email, name: login.name, wallet_address: login.address }),
      })
      return u.id
    },
    async passesFor(userId: string): Promise<PassInfo[]> {
      const rows = await get(`credentials?holder_id=eq.${userId}&reissued_as=is.null&order=id.desc` +
        '&select=id::text,status,events(id,kind,name,starts_at,venue,orgs(name)),checkins(checked_in_at)')
      return rows.map((r: any) => ({
        credentialId: r.id, eventId: r.events.id, kind: r.events.kind, status: r.status,
        name: r.events.name, org: r.events.orgs.name, startsAt: r.events.starts_at, venue: r.events.venue,
        checkedInAt: r.checkins[0]?.checked_in_at ?? null,
      }))
    },
    async claimInfo(eventId: string, userId: string): Promise<ClaimTarget> {
      const [e] = await get(
        `events?id=eq.${encodeURIComponent(eventId)}&select=id,name,capacity,credentials(id::text,holder_id,status)`
      )
      if (!e) return { event: null, activeCount: 0, existingCredentialId: null }
      const creds = Array.isArray(e.credentials) ? e.credentials : []
      const activeCreds = creds.filter((c: any) => c.status === 'active')
      const existing = activeCreds.find((c: any) => c.holder_id === userId)
      return {
        event: { id: e.id, name: e.name, capacity: e.capacity },
        activeCount: activeCreds.length,
        existingCredentialId: existing?.id ?? null,
      }
    },
    async saveCredential(cred: { id: string; eventId: string; holderId: string; metadataHash: string }): Promise<void> {
      await get('credentials', {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          id: cred.id,
          event_id: cred.eventId,
          holder_id: cred.holderId,
          status: 'active',
          metadata_hash: cred.metadataHash,
        }),
      })
    },
    async getOrCreateOrg(name = 'Boiler Blockchain'): Promise<string> {
      const rows = await get(`orgs?name=eq.${encodeURIComponent(name)}&select=id`)
      if (rows[0]?.id) return rows[0].id
      const [created] = await get('orgs?select=id', {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ name }),
      })
      return created.id
    },
    async createEvent(input: CreateEventInput): Promise<{ id: string; name: string }> {
      const orgId = input.orgId ?? (await this.getOrCreateOrg(input.orgName || 'Boiler Blockchain'))
      const payload = {
        id: input.id,
        org_id: orgId,
        kind: input.kind ?? 'event',
        name: input.name.trim(),
        starts_at: input.startsAt ?? null,
        doors_open_at: input.doorsOpenAt ?? null,
        doors_close_at: input.doorsCloseAt ?? null,
        venue: input.venue ?? null,
        capacity: input.capacity ?? null,
      }
      const [row] = await get('events?select=id,name', {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      })
      return { id: row.id, name: row.name }
    },
  }
}
