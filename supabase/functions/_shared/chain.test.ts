import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toChainEventId, createChainRelayer } from './chain.ts'
import { keccak256, toHex } from 'viem'
import { generatePrivateKey } from 'viem/accounts'

test('toChainEventId deterministically hashes event slug to uint256 bigint', () => {
  const slug = 'bb-fgm'
  const expectedBigInt = BigInt(keccak256(toHex(slug)))
  const result = toChainEventId(slug)

  assert.equal(typeof result, 'bigint')
  assert.equal(result, expectedBigInt)
  assert.ok(result > 0n)

  // Different slugs map to different uint256 IDs
  const otherResult = toChainEventId('bb-hack-night')
  assert.notEqual(result, otherResult)

  // Same slug always produces identical ID
  assert.equal(toChainEventId(slug), result)
})

test('createChainRelayer formats private key and initializes relayer account', () => {
  const rawKey = generatePrivateKey().replace(/^0x/, '')
  const relayer = createChainRelayer(rawKey)

  assert.ok(relayer.address.startsWith('0x'))
  assert.equal(relayer.address.length, 42)
  assert.equal(typeof relayer.isEventRegistered, 'function')
  assert.equal(typeof relayer.registerEvent, 'function')
})
