// POST /functions/v1/events  -> creates event in Postgres & registers on Base Sepolia, returns claim & staff links
// GET  /functions/v1/events?id=<id> -> returns public event details & attendance summary
// JWT verification is off for this function (config.toml).
import { supabaseDeps, type CreateEventInput } from '../_shared/supabase.ts'
import { makeStaffToken } from '../_shared/staff.ts'
import {
  createChainRelayer,
  isValidPrivateKey,
  toChainEventId,
  DEFAULT_CONTRACT_ADDRESS,
  DEFAULT_RPC_URL,
} from '../_shared/chain.ts'
import { verifyLogin } from '../_shared/login.ts'
import { isOrganizer } from '../_shared/organizer.ts'
import { cors, json } from '../_shared/http.ts'
import type { Address, Hex } from 'viem'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const staffSecret = Deno.env.get('STAFF_LINK_SECRET')
const relayerKey = Deno.env.get('DEPLOYER_PRIVATE_KEY') || Deno.env.get('RELAYER_PRIVATE_KEY')
const contractAddress = (Deno.env.get('PASSMARK_CONTRACT_ADDRESS') || DEFAULT_CONTRACT_ADDRESS) as Address
const rpcUrl = Deno.env.get('BASE_SEPOLIA_RPC_URL') || DEFAULT_RPC_URL

const deps = supabaseUrl && supabaseKey ? supabaseDeps(supabaseUrl, supabaseKey) : null

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  if (req.method === 'GET') {
    if (!deps) return json({ error: 'Database service not configured' }, 500)
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return json({ error: 'Missing event id parameter' }, 400)
    try {
      const event = await deps.getEvent(id)
      if (!event) return json({ error: 'Event not found' }, 404)
      const summary = await deps.eventSummary(id)
      return json({ event, summary, onChainId: toChainEventId(id).toString() })
    } catch (e) {
      console.error(e)
      return json({ error: 'Failed to fetch event' }, 502)
    }
  }

  if (req.method !== 'POST') return json({ error: 'Use POST or GET' }, 405)
  if (!deps) return json({ error: 'Database service not configured' }, 500)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const clientId = Deno.env.get('WEB3AUTH_CLIENT_ID')
  if (!clientId) return json({ error: 'Sign-in is not configured' }, 503)
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  const login = await verifyLogin(token, clientId, Date.now(), undefined, body)
  if (!login) return json({ error: 'Sign in to create an event.' }, 401)
  if (!isOrganizer(login.address, Deno.env.get('ORGANIZER_WALLET_ADDRESSES'))) {
    return json({ error: 'Your account does not have organizer access.' }, 403)
  }
  if (!isValidPrivateKey(relayerKey)) return json({ error: 'Event issuing is not configured yet.' }, 503)

  const { id, name, kind, startsAt, doorsOpenAt, doorsCloseAt, venue, capacity, orgName, issuer } = body ?? {}

  if (!id || typeof id !== 'string') return json({ error: 'Event id is required' }, 400)
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    return json({ error: 'Event id must contain only letters, numbers, hyphens, and underscores' }, 400)
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return json({ error: 'Event name is required' }, 400)
  }
  if (kind && kind !== 'event' && kind !== 'membership') {
    return json({ error: 'Kind must be either "event" or "membership"' }, 400)
  }
  if (capacity != null && (typeof capacity !== 'number' || capacity <= 0)) {
    return json({ error: 'Capacity must be a positive number' }, 400)
  }

  // 1. On-Chain Registration via Relayer (if valid key is configured)
  let txHash: string | null = null
  const onChainId = toChainEventId(id)

  if (relayerKey && isValidPrivateKey(relayerKey)) {
    try {
      const relayer = createChainRelayer(relayerKey as Hex, contractAddress, rpcUrl)
      const reg = await relayer.registerEvent(id, issuer as Address | undefined)
      txHash = reg.txHash
    } catch (err: any) {
      console.error('On-chain registration failed:', err)
      return json({ error: `On-chain registration failed: ${err?.message || err}` }, 502)
    }
  } else {
    // ponytail: in environments where DEPLOYER_PRIVATE_KEY is a placeholder or omitted, contract registration is skipped
    console.warn('DEPLOYER_PRIVATE_KEY is not a valid 32-byte hex key; skipped on-chain registration for event', id)
  }

  // 2. Insert event record into Postgres
  let eventRecord
  try {
    const input: CreateEventInput = {
      id,
      name: name.trim(),
      kind: kind ?? 'event',
      startsAt: startsAt || null,
      doorsOpenAt: doorsOpenAt || null,
      doorsCloseAt: doorsCloseAt || null,
      venue: venue || null,
      capacity: capacity ? Number(capacity) : null,
      orgName: orgName || 'Boiler Blockchain',
    }
    eventRecord = await deps.createEvent(input)
  } catch (err: any) {
    if (err instanceof Error && err.message.startsWith('Supabase 409')) {
      return json({ error: 'An event with this ID already exists.' }, 409)
    }
    console.error('Database event creation failed:', err)
    return json({ error: err?.message || 'Failed to create event in database' }, 502)
  }

  // 3. Generate door-staff scan token (valid for 14 days by default)
  let staffToken = null
  let scanPath = null
  if (staffSecret) {
    const expires = Math.floor(Date.now() / 1000) + 14 * 86400
    staffToken = await makeStaffToken(id, expires, staffSecret)
    scanPath = `#/scan?t=${staffToken}`
  }

  return json(
    {
      event: eventRecord,
      claimPath: `#/redeem?e=${encodeURIComponent(id)}`,
      staffToken,
      scanPath,
      onChainId: onChainId.toString(),
      txHash,
    },
    201,
  )
})
