// POST /functions/v1/attendance  (Authorization: Bearer <MetaMask Embedded Wallets ID token>)  { eventId }
//   -> { event, attendees: [{ credentialId, status, name, email, checkedInAt }] }
// Organizers only (ORGANIZER_EMAILS). Returns names and emails, so it never answers without that check.
// JWT verification is off for this function (config.toml): it checks MetaMask's token itself.
import { verifyLogin } from '../_shared/login.ts'
import { isOrganizer } from '../_shared/organizer.ts'
import { supabaseDeps } from '../_shared/supabase.ts'
import { cors, json } from '../_shared/http.ts'

const deps = supabaseDeps(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const clientId = Deno.env.get('WEB3AUTH_CLIENT_ID')
const organizers = Deno.env.get('ORGANIZER_EMAILS')

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  if (!clientId) return json({ error: 'Sign-in is not set up yet' }, 500)

  const body = await req.json().catch(() => ({}))
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  // Only the address may come from the browser (it isn't used for access); the email must be from the token.
  const address = typeof body?.address === 'string' ? body.address : undefined
  const login = await verifyLogin(token, clientId, Date.now(), undefined, { address })
  if (!login) return json({ error: 'Your sign-in expired. Sign in again.' }, 401)
  if (!isOrganizer(login.email, organizers)) return json({ error: 'Your account does not have organizer access.' }, 403)

  const eventId = body?.eventId
  if (typeof eventId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(eventId)) return json({ error: 'Event id is required' }, 400)

  try {
    const event = await deps.getEvent(eventId)
    if (!event) return json({ error: 'Event not found' }, 404)
    return json({ event, attendees: await deps.attendance(eventId) })
  } catch (e) {
    console.error(e)
    return json({ error: 'Could not load attendance. Try again.' }, 502)
  }
})
