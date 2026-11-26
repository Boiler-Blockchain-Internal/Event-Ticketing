import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { makePass } from '../../supabase/functions/_shared/pass.ts'
import { checkScan, type Credential, type Deps } from '../../supabase/functions/_shared/scan.ts'
import { attendees, event } from './data.ts'

// Demo door for when there's no staff link: real signed codes checked by the real server logic
// (checkScan), with the credentials and check-ins kept in memory instead of Postgres.
export function demoScanner(eventId = event.id) {
  const keys = new Map<string, ReturnType<typeof privateKeyToAccount>>()
  const creds = new Map<string, Credential>()
  const idOf = (ticket: string) => ticket.slice(1).replace(/^0+/, '')
  for (const [ticket, a] of Object.entries(attendees)) {
    const key = privateKeyToAccount(generatePrivateKey())
    keys.set(idOf(ticket), key)
    creds.set(idOf(ticket), {
      owner: key.address, eventId, holder: a.name,
      revoked: Boolean(a.revoked), reissuedAs: a.revoked && idOf(a.revoked),
    })
  }

  const nonces = new Set<string>()
  const checkins = new Map<string, string>()
  const deps: Deps = {
    getCredential: async id => creds.get(id) ?? null,
    // Same order as the Postgres check_in function: a reused code first, then an earlier check-in.
    checkIn: async (ev, id, nonce) => {
      if (nonces.has(nonce)) return { result: 'replay', at: null }
      nonces.add(nonce)
      const earlier = checkins.get(`${ev}:${id}`)
      if (earlier) return { result: 'repeat', at: earlier }
      const at = new Date().toISOString()
      checkins.set(`${ev}:${id}`, at)
      return { result: 'admit', at }
    },
  }

  // [credential, event on the code, seconds old]: admit, admit, repeat, revoked, wrong event, expired.
  const script: [string, string, number][] = [
    ['142', eventId, 0], ['141', eventId, 0], ['142', eventId, 0],
    ['131', eventId, 0], ['141', 'other', 0], ['142', eventId, 120],
  ]
  let step = 0
  return {
    check: (code: string) => checkScan(code, eventId, deps),
    async simulate() {
      const [id, ev, age] = script[step++ % script.length]
      return makePass(keys.get(id)!, id, ev, Date.now() - age * 1000)
    },
  }
}
