import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toChainEventId, toMetadataHash, createChainRelayer } from './chain.ts'
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

test('toMetadataHash produces deterministic keccak256 hash', () => {
  const slug = 'bb-fgm'
  const userId = 'usr_12345'
  const expected = keccak256(toHex(`${slug}:${userId}`))
  const result = toMetadataHash(slug, userId)

  assert.equal(result, expected)
  assert.match(result, /^0x[0-9a-f]{64}$/)
})

test('createChainRelayer formats private key and initializes relayer account', () => {
  const rawKey = generatePrivateKey().replace(/^0x/, '')
  const relayer = createChainRelayer(rawKey)

  assert.ok(relayer.address.startsWith('0x'))
  assert.equal(relayer.address.length, 42)
  assert.equal(typeof relayer.isEventRegistered, 'function')
  assert.equal(typeof relayer.registerEvent, 'function')
  assert.equal(typeof relayer.mintCredential, 'function')
})
