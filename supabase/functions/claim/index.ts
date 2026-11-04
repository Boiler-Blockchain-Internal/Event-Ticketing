// POST /functions/v1/claim  { eventId } (Authorization: Bearer <MetaMask Embedded Wallets ID token>)
// Mints an on-chain credential on Base Sepolia and saves it to Postgres.
import { verifyLogin } from '../_shared/login.ts'
import { supabaseDeps } from '../_shared/supabase.ts'
import { createChainRelayer, isValidPrivateKey, DEFAULT_CONTRACT_ADDRESS, DEFAULT_RPC_URL } from '../_shared/chain.ts'
import { claimPass, ClaimError } from '../_shared/claim.ts'
import { cors, json } from '../_shared/http.ts'
import type { Address, Hex } from 'viem'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const clientId = Deno.env.get('WEB3AUTH_CLIENT_ID')
const relayerKey = Deno.env.get('DEPLOYER_PRIVATE_KEY') || Deno.env.get('RELAYER_PRIVATE_KEY')
const contractAddress = (Deno.env.get('PASSMARK_CONTRACT_ADDRESS') || DEFAULT_CONTRACT_ADDRESS) as Address
const rpcUrl = Deno.env.get('BASE_SEPOLIA_RPC_URL') || DEFAULT_RPC_URL

const deps = supabaseUrl && supabaseKey ? supabaseDeps(supabaseUrl, supabaseKey) : null

function getRelayer() {
  if (!isValidPrivateKey(relayerKey)) {
    if (relayerKey) console.warn('DEPLOYER_PRIVATE_KEY is not a valid 32-byte hex; running in simulated mint mode')
    return null
  }
  try {
    return createChainRelayer(relayerKey as Hex, contractAddress, rpcUrl)
  } catch (err) {
    console.error('Failed to initialize chain relayer:', err)
    return null
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  if (!deps) return json({ error: 'Database service not configured' }, 500)
  if (!clientId) return json({ error: 'Sign-in is not set up yet' }, 500)

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const token = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  // Pass body as 5th argument so client-provided address fallback works seamlessly with PR #22
  const login = await (verifyLogin as any)(token, clientId, Date.now(), undefined, body)
  if (!login) return json({ error: 'Your sign-in expired. Sign in again.' }, 401)

  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : null
  if (!eventId) return json({ error: 'Missing event ID' }, 400)

  try {
    const result = await claimPass(eventId, login, deps, getRelayer())
    return json(result, result.status === 'existing' ? 200 : 201)
  } catch (err) {
    if (err instanceof ClaimError) {
      return json({ error: err.message }, err.statusCode)
    }
    if (err instanceof Error && err.message.startsWith('Supabase 409')) {
      return json({ error: 'This email signed in a different way before. Use that option instead.' }, 409)
    }
    console.error('Claim error:', err)
    return json({ error: 'Something went wrong setting up your pass. Try again.' }, 502)
  }
})
