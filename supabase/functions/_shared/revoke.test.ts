import { test } from 'node:test'
import assert from 'node:assert/strict'
import { revokePass, type RevokeDeps } from './revoke.ts'

function fakes(status: 'active' | 'revoked' = 'active') {
  const calls: string[] = []
  const deps: RevokeDeps = {
    credentialRow: async id => id === '142' ? { eventId: 'bb-fgm', status, metadataHash: '0xabc' } : null,
    userByEmail: async email => email === 'new@purdue.edu' ? { id: 'u2', wallet: '0x' + 'b'.repeat(40) }
      : email === 'never@purdue.edu' ? { id: 'u3', wallet: null } : null,
    saveCredential: async c => { calls.push(`save ${c.id} ${c.holderId} ${c.eventId} ${c.metadataHash}`) },
    markRevoked: async (id, to) => { calls.push(`revoked ${id}${to ? ` -> ${to}` : ''}`) },
  }
  const chain = {
    revokeCredential: async (id: string) => { calls.push(`chain revoke ${id}`); return { txHash: '0xt1' as const } },
    reissueCredential: async (id: string, to: string) => { calls.push(`chain reissue ${id} ${to}`); return { txHash: '0xt2' as const, newTokenId: '150' } },
  }
  return { deps, chain, calls }
}

test('revoke burns on-chain, then marks the mirror revoked', async () => {
  const { deps, chain, calls } = fakes()
  assert.deepEqual(await revokePass('142', deps, chain), { txHash: '0xt1', newCredentialId: null })
  assert.deepEqual(calls, ['chain revoke 142', 'revoked 142'])
})

test('reissue mints to the new holder and links old to new, new row first', async () => {
  const { deps, chain, calls } = fakes()
  assert.deepEqual(await revokePass('142', deps, chain, 'new@purdue.edu'), { txHash: '0xt2', newCredentialId: '150' })
  assert.deepEqual(calls, [`chain reissue 142 0x${'b'.repeat(40)}`, 'save 150 u2 bb-fgm 0xabc', 'revoked 142 -> 150'])
})

test('refuses before touching the chain when the input is wrong', async () => {
  for (const [id, email, msg, status] of [
    ['abc', undefined, /digits/, 'active'], ['999', undefined, /No pass/, 'active'],
    ['142', undefined, /already revoked/, 'revoked'], ['142', 'nobody@purdue.edu', /sign in/, 'active'],
    ['142', 'never@purdue.edu', /sign in/, 'active'],
  ] as const) {
    const { deps, chain, calls } = fakes(status)
    await assert.rejects(revokePass(id, deps, chain, email), msg)
    assert.deepEqual(calls, [])
  }
})

test('a failed database step reports the transaction that already went through', async () => {
  const { deps, chain } = fakes()
  deps.markRevoked = async () => { throw new Error('Supabase 500') }
  await assert.rejects(revokePass('142', deps, chain), /0xt1.*Supabase 500/)
})
