import { MAX_AGE, readPass, ticketLabel, type ScanResult } from './pass.ts'

// Server-side door check. Runtime-agnostic: wrap in a Supabase edge function or a Node route
// once that decision is made. Storage comes in through `deps` (see supabase.ts).
export type Credential = { owner: string; eventId: string; holder: string; revoked: boolean; reissuedAs?: string }
export type Deps = {
  getCredential(id: string): Promise<Credential | null>
  // Atomic: consumes the nonce and records the check-in, or reports the earlier one.
  checkIn(eventId: string, credentialId: string, nonce: string): Promise<{ result: 'admit' | 'repeat' | 'replay'; at: string | null }>
}

// `eventId` is the event the staff link is scoped to, not whatever the code claims.
export async function checkScan(code: string, eventId: string, deps: Deps, now = Date.now()): Promise<ScanResult> {
  const pass = await readPass(code)
  if (!pass) return { kind: 'invalid', reason: 'Not a Passmark code' }
  const ticket = ticketLabel(pass.credentialId)
  if (pass.eventId !== eventId) return { kind: 'invalid', reason: 'Pass is for a different event', ticket }
  if (Math.abs(now / 1000 - pass.issuedAt) > MAX_AGE) {
    return { kind: 'invalid', reason: 'Code expired · ask them to reopen their pass', ticket }
  }

  const cred = await deps.getCredential(pass.credentialId)
  if (!cred) return { kind: 'invalid', reason: 'Unknown pass', ticket }
  if (cred.eventId !== eventId) return { kind: 'invalid', reason: 'Pass is for a different event', ticket }
  if (cred.owner.toLowerCase() !== pass.signer.toLowerCase()) {
    return { kind: 'invalid', reason: 'Pass is not on this person’s account', ticket }
  }
  const holder = cred.holder
  if (cred.revoked) {
    const reason = cred.reissuedAs ? `Revoked · reissued as ${ticketLabel(cred.reissuedAs)}` : 'Revoked'
    return { kind: 'invalid', reason, ticket, holder }
  }

  const { result, at } = await deps.checkIn(eventId, pass.credentialId, pass.nonce)
  if (result === 'admit') return { kind: 'admit', ticket, holder }
  if (result === 'repeat') return { kind: 'repeat', ticket, holder, at: at ?? '' }
  return { kind: 'invalid', reason: 'Code already used · ask them to reopen their pass', ticket, holder }
}
