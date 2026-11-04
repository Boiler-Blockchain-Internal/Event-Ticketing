// Door-staff link token: `<eventId>.<expires unix seconds>.<HMAC-SHA256>`, signed with STAFF_LINK_SECRET.
// Scoped to one event, expires, grants nothing but scanning. WebCrypto only, so it runs in Deno and Node.
const enc = new TextEncoder()
const b64url = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
export const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
const hmacKey = (secret: string) =>
  crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])

export async function makeStaffToken(eventId: string, expires: number, secret: string): Promise<string> {
  const body = `${eventId}.${expires}`
  return `${body}.${b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)))}`
}

// Returns the event ID if the token is authentic and unexpired, else null.
export async function readStaffToken(token: string, secret: string, now = Date.now()): Promise<string | null> {
  const m = /^([A-Za-z0-9_-]+)\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(token)
  if (!m || Number(m[2]) * 1000 < now) return null
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), unb64url(m[3]), enc.encode(`${m[1]}.${m[2]}`))
    return ok ? m[1] : null
  } catch {
    return null
  }
}
