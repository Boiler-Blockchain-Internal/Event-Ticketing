import { test } from 'node:test'
import assert from 'node:assert/strict'
import { claimPass, ClaimError, type ClaimDeps } from './claim.ts'
import type { Login } from './login.ts'
import type { ChainRelayer } from './chain.ts'
import type { Address, Hash, Hex } from 'viem'

const mockLogin: Login = {
  email: 'priya@purdue.edu',
  name: 'Priya S.',
  address: '0x1111111111111111111111111111111111111111' as Address,
}

test('claimPass returns existing credential when user already has an active pass (idempotent)', async () => {
  const deps: ClaimDeps = {
    async saveUser() {
      return 'user-uuid-1'
    },
    async claimInfo() {
      return {
        event: { id: 'bb-fgm', name: 'Fall General Meeting', capacity: 100 },
        activeCount: 15,
        existingCredentialId: '142',
      }
    },
    async saveCredential() {
      assert.fail('saveCredential should not be called when credential already exists')
    },
  }

  const res = await claimPass('bb-fgm', mockLogin, deps)
  assert.deepEqual(res, {
    status: 'existing',
    credentialId: '142',
    eventId: 'bb-fgm',
  })
})

test('claimPass rejects when event does not exist (404)', async () => {
  const deps: ClaimDeps = {
    async saveUser() {
      return 'user-uuid-1'
    },
    async claimInfo() {
      return {
        event: null,
        activeCount: 0,
        existingCredentialId: null,
      }
    },
    async saveCredential() {},
  }

  await assert.rejects(
    async () => claimPass('nonexistent-event', mockLogin, deps),
    (err: any) => err instanceof ClaimError && err.statusCode === 404 && err.message === 'Event not found',
  )
})

test('claimPass rejects when event has reached capacity (409)', async () => {
  const deps: ClaimDeps = {
    async saveUser() {
      return 'user-uuid-1'
    },
    async claimInfo() {
      return {
        event: { id: 'bb-fgm', name: 'Fall General Meeting', capacity: 10 },
        activeCount: 10,
        existingCredentialId: null,
      }
    },
    async saveCredential() {},
  }

  await assert.rejects(
    async () => claimPass('bb-fgm', mockLogin, deps),
    (err: any) => err instanceof ClaimError && err.statusCode === 409 && err.message.includes('full'),
  )
})

test('claimPass successfully mints on-chain and records credential in database', async () => {
  let savedCredential: any = null
  const deps: ClaimDeps = {
    async saveUser() {
      return 'user-uuid-1'
    },
    async claimInfo() {
      return {
        event: { id: 'bb-fgm', name: 'Fall General Meeting', capacity: 100 },
        activeCount: 2,
        existingCredentialId: null,
      }
    },
    async saveCredential(cred) {
      savedCredential = cred
    },
  }

  const mockRelayer: ChainRelayer = {
    address: '0xrelayer' as Address,
    async isEventRegistered() {
      return true
    },
    async registerEvent() {
      return { txHash: null, alreadyRegistered: true, onChainId: 1n }
    },
    async mintCredential(to: Address, slug: string, metadataHash: Hex) {
      assert.equal(to, mockLogin.address)
      assert.equal(slug, 'bb-fgm')
      assert.ok(metadataHash.startsWith('0x'))
      return {
        txHash: '0xmocktxhash' as Hash,
        tokenId: '3',
        onChainId: 101n,
      }
    },
  }

  const res = await claimPass('bb-fgm', mockLogin, deps, mockRelayer)
  assert.deepEqual(res, {
    status: 'minted',
    credentialId: '3',
    eventId: 'bb-fgm',
    txHash: '0xmocktxhash',
  })

  assert.deepEqual(savedCredential, {
    id: '3',
    eventId: 'bb-fgm',
    holderId: 'user-uuid-1',
    metadataHash: savedCredential.metadataHash,
  })
})

test('claimPass refuses to save a simulated credential when relayer is omitted', async () => {
  let savedId = ''
  const deps: ClaimDeps = {
    async saveUser() {
      return 'user-uuid-1'
    },
    async claimInfo() {
      return {
        event: { id: 'bb-fgm', name: 'Fall General Meeting', capacity: 100 },
        activeCount: 5,
        existingCredentialId: null,
      }
    },
    async saveCredential(cred) {
      savedId = cred.id
    },
  }

  await assert.rejects(claimPass('bb-fgm', mockLogin, deps, null),
    (err: any) => err instanceof ClaimError && err.statusCode === 503)
  assert.equal(savedId, '')
})
