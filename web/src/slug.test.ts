// Run: npm test -w web
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from './slug.ts'

const valid = /^[A-Za-z0-9_-]+$/ // what POST /functions/v1/events accepts

test('turns an event name into a valid event id', () => {
  assert.equal(slugify('Spring Kickoff'), 'spring-kickoff')
  assert.equal(slugify('  BB: Fall GM — 2026!  '), 'bb-fall-gm-2026')
  assert.equal(slugify('Café Night'), 'cafe-night')
  assert.equal(slugify('!!!'), '')
  const long = slugify('a '.repeat(60))
  assert.ok(long.length <= 48 && !long.endsWith('-'))
  for (const s of ['Spring Kickoff', 'BB: Fall GM — 2026!', 'Café Night']) assert.match(slugify(s), valid)
})
