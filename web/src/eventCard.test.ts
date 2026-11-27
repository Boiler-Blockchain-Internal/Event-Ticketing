import { test } from 'node:test'
import assert from 'node:assert/strict'
import { eventCard } from './eventCard.ts'

const base = {
  id: 'bb-fgm', orgId: 'o1', kind: 'event' as const, name: 'Fall General Meeting',
  startsAt: null, doorsOpenAt: null, doorsCloseAt: null, venue: null, capacity: null,
}

test('hides rows the organizer left blank instead of inventing them', () => {
  const card = eventCard(base)
  assert.equal(card.date, null)
  assert.equal(card.doors, null)
  assert.equal(card.venue, null)
  assert.equal(card.spots, null)
  assert.equal(card.kind, 'Event ticket')
})

test('spots left never goes negative and needs a claimed count', () => {
  assert.equal(eventCard({ ...base, capacity: 120 }, 83).spots, '37 of 120')
  assert.equal(eventCard({ ...base, capacity: 10 }, 12).spots, '0 of 10')
  assert.equal(eventCard({ ...base, capacity: 120 }).spots, null)
})

test('org name and initials, membership label', () => {
  const card = eventCard({ ...base, kind: 'membership', org: 'Boiler Blockchain' })
  assert.equal(card.orgInitials, 'BB')
  assert.equal(card.kind, 'Member card')
  assert.ok(eventCard({ ...base, startsAt: '2026-11-12T19:00:00Z' }).date)
  assert.ok(eventCard({ ...base, doorsOpenAt: '2026-11-12T18:45:00Z' }).doors?.startsWith('From '))
})
