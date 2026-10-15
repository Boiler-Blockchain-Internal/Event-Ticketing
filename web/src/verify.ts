import { attendees, event } from './data.ts'

// Door-side check for a scanned code of the form `passmark:<eventId>:<ticketId>`.
// ponytail: local-only stand-in for the backend check (signature, 60s window, unique check-in constraint).
export type ScanResult =
  | { kind: 'admit'; ticket: string; holder: string }
  | { kind: 'repeat'; ticket: string; holder: string; at: string }
  | { kind: 'invalid'; reason: string; ticket?: string; holder?: string }

export function verify(code: string, checkins: Map<string, string>, now: string): ScanResult {
  const m = /^passmark:([\w-]+):(#\d{4})$/.exec(code.trim())
  if (!m) return { kind: 'invalid', reason: 'Not a Passmark code' }
  const [, eventId, ticket] = m
  if (eventId !== event.id) return { kind: 'invalid', reason: 'Pass is for a different event', ticket }
  const a = attendees[ticket]
  if (!a) return { kind: 'invalid', reason: 'Unknown pass', ticket }
  if (a.revoked) return { kind: 'invalid', reason: `Revoked · reissued as ${a.revoked}`, ticket, holder: a.name }
  const at = checkins.get(ticket)
  if (at) return { kind: 'repeat', ticket, holder: a.name, at }
  checkins.set(ticket, now)
  return { kind: 'admit', ticket, holder: a.name }
}
