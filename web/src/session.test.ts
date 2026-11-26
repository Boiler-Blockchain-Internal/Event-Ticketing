import { test } from 'node:test'
import assert from 'node:assert/strict'
import { session } from './session.ts'
import type { Account } from './auth'

test('waits until both the token and the address are ready', async () => {
  let calls = 0
  const account = {
    idToken: async () => ++calls === 1 ? null : 'signed-token',
    address: async () => calls < 3 ? null : '0x' + 'a'.repeat(40),
    signIn: async () => assert.fail('must not open another login'),
  } as unknown as Account
  assert.deepEqual(await session(account), { token: 'signed-token', address: '0x' + 'a'.repeat(40) })
  assert.equal(calls, 3)
})

test('gives up after the retry budget', async () => {
  const account = { idToken: async () => null, address: async () => null } as unknown as Account
  await assert.rejects(session(account), /not ready/)
})
