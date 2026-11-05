// POST /functions/v1/me  (Authorization: Bearer <MetaMask Embedded Wallets ID token>) -> { user, passes }
// Saves the signed-in attendee and their wallet address, then returns their passes and check-ins.
// JWT verification is off for this function (config.toml): it checks MetaMask's token itself.
import { verifyLogin } from '../_shared/login.ts'
import { supabaseDeps } from '../_shared/supabase.ts'
import { cors, json } from '../_shared/http.ts'

const deps = supabaseDeps(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const clientId = Deno.env.get('WEB3AUTH_CLIENT_ID')

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  if (!clientId) return json({ error: 'Sign-in is not set up yet' }, 500)

  const token = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  const body = await req.json().catch(() => ({}))
  const login = await verifyLogin(token, clientId, Date.now(), undefined, body)
  if (!login) return json({ error: 'Your sign-in expired. Sign in again.' }, 401)

  try {
    const userId = await deps.saveUser(login)
    return json({ user: { email: login.email, name: login.name }, passes: await deps.passesFor(userId) })
  } catch (e) {
    // ponytail: Google and email logins give different keys unless grouped in the MetaMask dashboard.
    if (e instanceof Error && e.message.startsWith('Supabase 409')) {
      return json({ error: 'This email signed in a different way before. Use that option instead.' }, 409)
    }
    console.error(e)
    return json({ error: 'Something went wrong. Try again.' }, 502)
  }
})
