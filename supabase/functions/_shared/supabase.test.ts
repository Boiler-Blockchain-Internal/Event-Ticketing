import { test } from 'node:test'
import assert from 'node:assert/strict'
import { supabaseDeps } from './supabase.ts'

test('supabaseDeps sets correct authorization headers', async () => {
  const originalFetch = globalThis.fetch
  try {
    let capturedHeaders: Record<string, string> = {}
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = (init?.headers as Record<string, string>) ?? {}
      return new Response(JSON.stringify([]), { status: 200 })
    }) as typeof fetch

    // Modern sb_secret key
    const depsSecret = supabaseDeps('https://example.supabase.co', 'sb_secret_test123')
    await depsSecret.getCredential('101')
    assert.equal(capturedHeaders.apikey, 'sb_secret_test123')
    assert.equal(capturedHeaders.Authorization, undefined)

    // Legacy JWT key
    const depsJwt = supabaseDeps('https://example.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy')
    await depsJwt.getCredential('101')
    assert.equal(capturedHeaders.apikey, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy')
    assert.equal(capturedHeaders.Authorization, 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getCredential maps valid credential and handles missing holder', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url)
      if (urlStr.includes('id=eq.142')) {
        return new Response(
          JSON.stringify([
            {
              event_id: 'bb-fgm',
              status: 'active',
              reissued_as: null,
              users: { name: 'Priya S.', email: 'priya@purdue.edu', wallet_address: '0x1111111111111111111111111111111111111111' },
            },
          ]),
          { status: 200 },
        )
      }
      if (urlStr.includes('id=eq.131')) {
        return new Response(
          JSON.stringify([
            {
              event_id: 'bb-fgm',
              status: 'revoked',
              reissued_as: '140',
              users: { name: null, email: 'ethan@purdue.edu', wallet_address: '0x2222222222222222222222222222222222222222' },
            },
          ]),
          { status: 200 },
        )
      }
      return new Response(JSON.stringify([]), { status: 200 })
    }) as typeof fetch

    const deps = supabaseDeps('https://example.supabase.co', 'sb_secret_test')

    // Valid active credential with name
    const active = await deps.getCredential('142')
    assert.deepEqual(active, {
      owner: '0x1111111111111111111111111111111111111111',
      eventId: 'bb-fgm',
      holder: 'Priya S.',
      revoked: false,
      reissuedAs: undefined,
    })

    // Revoked credential with fallback to email for holder name
    const revoked = await deps.getCredential('131')
    assert.deepEqual(revoked, {
      owner: '0x2222222222222222222222222222222222222222',
      eventId: 'bb-fgm',
      holder: 'ethan@purdue.edu',
      revoked: true,
      reissuedAs: '140',
    })

    // Unknown credential returns null
    const unknown = await deps.getCredential('999')
    assert.equal(unknown, null)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('checkIn calls rpc/check_in and returns parsed results', async () => {
  const originalFetch = globalThis.fetch
  try {
    let capturedBody = ''
    let returnRow = { result: 'admit', checked_in_at: '2026-11-12T19:00:00Z' }

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      assert.match(String(url), /rpc\/check_in/)
      assert.equal(init?.method, 'POST')
      capturedBody = String(init?.body)
      return new Response(JSON.stringify([returnRow]), { status: 200 })
    }) as typeof fetch

    const deps = supabaseDeps('https://example.supabase.co', 'sb_secret_test')

    const admit = await deps.checkIn('bb-fgm', '142', 'nonce123')
    assert.equal(admit.result, 'admit')
    assert.equal(admit.at, '2026-11-12T19:00:00Z')
    assert.deepEqual(JSON.parse(capturedBody), {
      p_event: 'bb-fgm',
      p_credential: '142',
      p_nonce: 'nonce123',
    })

    // Test repeat check-in
    returnRow = { result: 'repeat', checked_in_at: '2026-11-12T18:45:00Z' }
    const repeat = await deps.checkIn('bb-fgm', '142', 'nonce456')
    assert.equal(repeat.result, 'repeat')
    assert.equal(repeat.at, '2026-11-12T18:45:00Z')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('eventSummary formats event details and handles missing event', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url)
      if (urlStr.includes('id=eq.bb-fgm')) {
        return new Response(
          JSON.stringify([{ name: 'Fall General Meeting', capacity: 120, checkins: [{ count: 61 }] }]),
          { status: 200 },
        )
      }
      return new Response(JSON.stringify([]), { status: 200 })
    }) as typeof fetch

    const deps = supabaseDeps('https://example.supabase.co', 'sb_secret_test')

    const summary = await deps.eventSummary('bb-fgm')
    assert.deepEqual(summary, {
      name: 'Fall General Meeting',
      capacity: 120,
      checkedIn: 61,
    })

    const missing = await deps.eventSummary('non-existent')
    assert.equal(missing, null)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('handles PostgREST error responses by throwing descriptive error', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = (async () => {
      return new Response('Database timeout', { status: 504 })
    }) as typeof fetch

    const deps = supabaseDeps('https://example.supabase.co', 'sb_secret_test')
    await assert.rejects(
      async () => deps.getCredential('142'),
      /Supabase 504: Database timeout/,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
