import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isOrganizer } from './organizer.ts'

test('only allowlisted emails are organizers, case and spaces ignored', () => {
  const list = ' Officer@Purdue.edu , lead@purdue.edu,'
  assert.equal(isOrganizer('officer@purdue.edu', list), true)
  assert.equal(isOrganizer('LEAD@purdue.edu ', list), true)
  assert.equal(isOrganizer('student@purdue.edu', list), false)
})

test('empty config, empty email and blank entries grant nothing', () => {
  assert.equal(isOrganizer('officer@purdue.edu', undefined), false)
  assert.equal(isOrganizer('officer@purdue.edu', ''), false)
  assert.equal(isOrganizer('', ' , ,'), false)
  assert.equal(isOrganizer(null, 'officer@purdue.edu'), false)
})
