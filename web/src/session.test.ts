import { test } from 'node:test'
import assert from 'node:assert/strict'
import { session } from './session.ts'
import type { Account } from './auth'
test('waits for the restored embedded account without starting login or claiming', async () => {
  let calls = 0
  const account = {
    idToken: async () => ++calls === 1 ? null : 'signed-token',
    address: async () => '0x' + 'a'.repeat(40),
    signIn: async () => assert.fail('must not open another login'),
  } as unknown as Account
  assert.deepEqual(await session(account), { token: 'signed-token', address: '0x' + 'a'.repeat(40) })
  assert.equal(calls, 2)
})
