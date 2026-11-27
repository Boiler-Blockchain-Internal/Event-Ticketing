// Server-only organizer allowlist: ORGANIZER_EMAILS, comma-separated. Empty or unset grants nobody.
// Match it only against the email from the verified sign-in token, never one the browser sent:
// verifyLogin can fall back to client-sent values, so don't pass it the request body when authorizing.
// ponytail: one global list; move to an org_members table when a second org signs up.
export function isOrganizer(email: string | null | undefined, allowlist: string | undefined): boolean {
  const e = email?.trim().toLowerCase()
  if (!e || !e.includes('@')) return false
  return (allowlist ?? '').split(',').map(a => a.trim().toLowerCase()).filter(Boolean).includes(e)
}
