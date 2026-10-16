import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { makePass, readPass } from './pass.ts'
import { checkScan, type Credential, type Deps } from './scan.ts'

const holder = privateKeyToAccount(generatePrivateKey())
const stranger = privateKeyToAccount(generatePrivateKey())
const now = 1_800_000_000_000

// In-memory stand-in for the Postgres check_in function.
function memoryDeps(creds: Record<string, Credential>): Deps {
  const checkins = new Map<string, string>()
  const nonces = new Set<string>()
  return {
    getCredential: async id => creds[id] ?? null,
    checkIn: async (eventId, id, nonce) => {
      const key = `${eventId}:${id}`
      if (checkins.has(key)) return { result: 'repeat', at: checkins.get(key)! }
      if (nonces.has(nonce)) return { result: 'replay', at: null }
      nonces.add(nonce)
      checkins.set(key, '2026-11-12T19:02:00Z')
      return { result: 'admit', at: null }
    },
  }
}

const deps = () => memoryDeps({
  '142': { owner: holder.address, eventId: 'bb-fgm', holder: 'Priya S.', revoked: false },
  '131': { owner: holder.address, eventId: 'bb-fgm', holder: 'Ethan W.', revoked: true, reissuedAs: '140' },
})

test('pass round-trips and rejects tampering', async () => {
  const code = await makePass(holder, '142', 'bb-fgm', now)
  const p = await readPass(code)
  assert.equal(p?.signer, holder.address)
  assert.equal(p?.issuedAt, now / 1000)
  const forged = await readPass(code.replace('pm1.142.', 'pm1.143.'))
  assert.notEqual(forged?.signer, holder.address)
  assert.equal(await readPass('hello'), null)
})

test('first scan admits, rescan is amber with first time', async () => {
  const d = deps()
  const code = await makePass(holder, '142', 'bb-fgm', now)
  assert.deepEqual(await checkScan(code, 'bb-fgm', d, now), { kind: 'admit', ticket: '#0142', holder: 'Priya S.' })
  const again = await makePass(holder, '142', 'bb-fgm', now + 30_000)
  assert.deepEqual(await checkScan(again, 'bb-fgm', d, now + 31_000),
    { kind: 'repeat', ticket: '#0142', holder: 'Priya S.', at: '2026-11-12T19:02:00Z' })
})

test('rejects expired, wrong event, wrong holder, unknown, revoked, replayed', async () => {
  const reason = async (code: string, d = deps(), t = now) => {
    const r = await checkScan(code, 'bb-fgm', d, t)
    return r.kind === 'invalid' ? r.reason : r.kind
  }
  assert.match(await reason(await makePass(holder, '142', 'bb-fgm', now), deps(), now + 61_000), /expired/)
  assert.match(await reason(await makePass(holder, '142', 'other', now)), /different event/)
  assert.match(await reason(await makePass(stranger, '142', 'bb-fgm', now)), /not on this/)
  assert.match(await reason(await makePass(holder, '999', 'bb-fgm', now)), /Unknown/)
  assert.match(await reason(await makePass(holder, '131', 'bb-fgm', now)), /#0140/)

  // Same nonce for a credential not yet checked in (e.g. after a check-in was undone).
  const d = deps()
  const code = await makePass(holder, '142', 'bb-fgm', now)
  await d.checkIn('x', 'y', (await readPass(code))!.nonce)
  assert.match(await reason(code, d), /already used/)
})

test('staff token is scoped, expiring and tamper-proof', async () => {
  const { makeStaffToken, readStaffToken } = await import('./staff.ts')
  const exp = now / 1000 + 3600
  const t = await makeStaffToken('bb-fgm', exp, 'secret')
  assert.equal(await readStaffToken(t, 'secret', now), 'bb-fgm')
  assert.equal(await readStaffToken(t, 'secret', now + 3601_000), null)
  assert.equal(await readStaffToken(t, 'other-secret', now), null)
  assert.equal(await readStaffToken(t.replace('bb-fgm', 'bb-xyz'), 'secret', now), null)
  assert.equal(await readStaffToken(t.replace(`.${exp}.`, `.${exp + 9999}.`), 'secret', now), null)
})
