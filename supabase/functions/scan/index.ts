// POST /functions/v1/scan  { token, code? } -> { event, result }
// `token` is the door-staff link token; without `code` it just returns the event header for the scan page.
// JWT verification is off for this function (config.toml): the staff token is the auth.
import { checkScan } from '../_shared/scan.ts'
import { readStaffToken } from '../_shared/staff.ts'
import { supabaseDeps } from '../_shared/supabase.ts'

const cors = {
  'Access-Control-Allow-Origin': '*', // auth is the token in the body, no cookies
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors })

const deps = supabaseDeps(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const secret = Deno.env.get('STAFF_LINK_SECRET')

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  if (!secret) return json({ error: 'Scanner is not set up yet' }, 500)

  const { token, code } = await req.json().catch(() => ({}))
  const eventId = typeof token === 'string' ? await readStaffToken(token, secret) : null
  if (!eventId) return json({ error: 'This check-in link has expired. Ask an organizer for a new one.' }, 401)

  try {
    const result = typeof code === 'string' ? await checkScan(code.slice(0, 512), eventId, deps) : null
    return json({ event: await deps.eventSummary(eventId), result })
  } catch (e) {
    console.error(e)
    return json({ error: 'Check-in service hiccup. Scan again.' }, 502)
  }
})
