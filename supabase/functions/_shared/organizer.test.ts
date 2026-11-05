import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isOrganizer } from './organizer.ts'
test('organizer access requires an explicit server allowlist', () => {
  const address = '0x' + 'a'.repeat(40)
  assert.equal(isOrganizer(address, undefined), false)
  assert.equal(isOrganizer(address, ''), false)
  assert.equal(isOrganizer('invalid', 'invalid'), false)
  assert.equal(isOrganizer(address, '0x' + 'b'.repeat(40)), false)
  assert.equal(isOrganizer(address, '  ' + address.toUpperCase().replace('0X', '0x') + ' , '), true)
})
