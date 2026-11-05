// Server-only allowlist. Empty configuration never grants organizer access.
export function isOrganizer(address: string, allowlist: string | undefined): boolean {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return false
  return (allowlist ?? '').split(',').map(a => a.trim().toLowerCase()).includes(address.toLowerCase())
}
