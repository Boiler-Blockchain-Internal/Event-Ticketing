// Run: npm test -w web
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addressOf, authReducer, isEmail, signedOut, type AuthState } from './auth.ts'

const ADDR = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'

test('email validation', () => {
  assert.ok(isEmail('priya@purdue.edu'))
  assert.ok(isEmail('  priya@purdue.edu '))
  assert.ok(!isEmail('priya@'))
  assert.ok(!isEmail('no spaces@purdue.edu'))
})

test('email code flow ends signed in with the wallet address', () => {
  let s: AuthState = authReducer(signedOut, { type: 'sendCode', email: ' priya@purdue.edu ' })
  assert.deepEqual(s, { status: 'sendingCode', email: 'priya@purdue.edu' })
  s = authReducer(s, { type: 'codeSent' })
  assert.deepEqual(s, { status: 'awaitingCode', email: 'priya@purdue.edu' })
  s = authReducer(s, { type: 'signedIn', address: ADDR })
  assert.equal(addressOf(s), ADDR)
})

test('bad email never leaves signed out flow', () => {
  assert.equal(authReducer(signedOut, { type: 'sendCode', email: 'nope' }).status, 'error')
})

test('codeSent is ignored unless a code was being sent', () => {
  assert.equal(authReducer(signedOut, { type: 'codeSent' }), signedOut)
})

test('malformed address is rejected, never stored', () => {
  const s = authReducer(signedOut, { type: 'signedIn', address: 'not-an-address' })
  assert.equal(s.status, 'error')
  assert.equal(addressOf(s), undefined)
})

test('sessionEnded only drops a signed-in session, not a code entry in progress', () => {
  const waiting: AuthState = { status: 'awaitingCode', email: 'a@b.co' }
  assert.equal(authReducer(waiting, { type: 'sessionEnded' }), waiting)
  assert.equal(authReducer({ status: 'signedIn', address: ADDR }, { type: 'sessionEnded' }), signedOut)
})

test('failure keeps the email so the user can retry; signOut clears the address', () => {
  const failed = authReducer({ status: 'awaitingCode', email: 'a@b.co' }, { type: 'failed', message: 'Wrong code.' })
  assert.deepEqual(failed, { status: 'error', message: 'Wrong code.', email: 'a@b.co' })
  const unsent = authReducer({ status: 'sendingCode', email: 'a@b.co' }, { type: 'failed', message: 'x' })
  assert.deepEqual(unsent, { status: 'error', message: 'x', email: undefined })
  const out = authReducer({ status: 'signedIn', address: ADDR }, { type: 'signOut' })
  assert.equal(out, signedOut)
  assert.equal(addressOf(out), undefined)
})
