import { recoverMessageAddress, type Address, type Hex } from 'viem'

// Rotating pass payload, shared by the attendee page (signs) and the scan service (verifies).
// Wire format: pm1.<credentialId>.<eventId>.<issuedAt seconds>.<nonce>.<signature>
// The holder's wallet signs everything before the last dot (EIP-191 personal_sign).
export const REFRESH = 30 // seconds between new codes
export const MAX_AGE = 60 // seconds a code stays valid; also absorbs phone clock drift

export type Pass = { credentialId: string; eventId: string; issuedAt: number; nonce: string; signer: Address }
export type Signer = { signMessage(args: { message: string }): Promise<Hex> }

// Scan results are exactly three states. `at` is the first check-in time.
export type ScanResult =
  | { kind: 'admit'; ticket: string; holder: string }
  | { kind: 'repeat'; ticket: string; holder: string; at: string }
  | { kind: 'invalid'; reason: string; ticket?: string; holder?: string }

export const ticketLabel = (credentialId: string) => `#${credentialId.padStart(4, '0')}`

export async function makePass(signer: Signer, credentialId: string, eventId: string, now = Date.now()): Promise<string> {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('')
  const message = `pm1.${credentialId}.${eventId}.${Math.floor(now / 1000)}.${nonce}`
  return `${message}.${await signer.signMessage({ message })}`
}

// Parses and recovers the signer. Null for anything malformed. Does not check age or ownership.
export async function readPass(code: string): Promise<Pass | null> {
  const m = /^(pm1\.(\d{1,78})\.([A-Za-z0-9_-]+)\.(\d{1,12})\.([0-9a-f]{16}))\.(0x[0-9a-fA-F]{130})$/.exec(code.trim())
  if (!m) return null
  const [, message, credentialId, eventId, issuedAt, nonce, signature] = m
  try {
    const signer = await recoverMessageAddress({ message, signature: signature as Hex })
    return { credentialId, eventId, issuedAt: Number(issuedAt), nonce, signer }
  } catch {
    return null
  }
}
