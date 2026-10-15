// Run: npm test -w web
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verify } from './verify.ts'

test('first scan admits, second is amber with the first time', () => {
  const checkins = new Map<string, string>()
  assert.equal(verify('passmark:bb-fgm:#0142', checkins, '7:02 PM').kind, 'admit')
  assert.deepEqual(verify('passmark:bb-fgm:#0142', checkins, '7:05 PM'),
    { kind: 'repeat', ticket: '#0142', holder: 'Priya S.', at: '7:02 PM' })
})

test('rejects junk, wrong event, unknown and revoked passes', () => {
  const checkins = new Map<string, string>()
  assert.equal(verify('hello', checkins, 'x').kind, 'invalid')
  assert.match((verify('passmark:other:#0142', checkins, 'x') as { reason: string }).reason, /different event/)
  assert.match((verify('passmark:bb-fgm:#9999', checkins, 'x') as { reason: string }).reason, /Unknown/)
  assert.match((verify('passmark:bb-fgm:#0131', checkins, 'x') as { reason: string }).reason, /#0140/)
  assert.equal(checkins.size, 0)
})
