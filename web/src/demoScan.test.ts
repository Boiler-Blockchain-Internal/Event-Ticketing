import { test } from 'node:test'
import assert from 'node:assert/strict'
import { demoScanner } from './demoScan.ts'

test('simulated scans walk through all three results via the real check', async () => {
  const door = demoScanner()
  const results = []
  for (let i = 0; i < 6; i++) results.push(await door.check(await door.simulate()))
  assert.deepEqual(results.map(r => r.kind), ['admit', 'admit', 'repeat', 'invalid', 'invalid', 'invalid'])
  const reasons = results.slice(3).map(r => r.kind === 'invalid' ? r.reason : '')
  assert.match(reasons[0], /Revoked · reissued as #0140/)
  assert.match(reasons[1], /different event/)
  assert.match(reasons[2], /expired/)
  assert.equal(results[0].kind === 'admit' && results[0].holder, 'Priya S.')
})

test('the same code scanned twice is refused the second time', async () => {
  const door = demoScanner()
  await door.simulate() // skip to Marcus so Priya's earlier check-in doesn't interfere
  const code = await door.simulate()
  assert.equal((await door.check(code)).kind, 'admit')
  const again = await door.check(code)
  assert.equal(again.kind, 'invalid')
  assert.match(again.kind === 'invalid' ? again.reason : '', /already used/)
  assert.equal((await door.check('hello')).kind, 'invalid')
})
