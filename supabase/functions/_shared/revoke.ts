import type { Address } from 'viem'
import type { ChainRelayer } from './chain.ts'

// Revoke a pass, or reissue it to someone else (lost phone, wrong recipient).
// Contract first, then the Postgres mirror, so the door rejects the old pass once both are done.
// ponytail: no transaction across chain + DB; if the DB step fails the error carries the tx hash to fix by hand.
export type RevokeDeps = {
  credentialRow(id: string): Promise<{ eventId: string; status: 'active' | 'revoked'; metadataHash: string | null } | null>
  userByEmail(email: string): Promise<{ id: string; wallet: string | null } | null>
  saveCredential(cred: { id: string; eventId: string; holderId: string; metadataHash: string }): Promise<void>
  markRevoked(id: string, reissuedAs?: string): Promise<void>
}
type Chain = Pick<ChainRelayer, 'revokeCredential' | 'reissueCredential'>

export async function revokePass(credentialId: string, deps: RevokeDeps, chain: Chain, newHolderEmail?: string) {
  if (!/^\d{1,78}$/.test(credentialId)) throw new Error('Credential ID must be digits, e.g. 142 for pass #0142')
  const cred = await deps.credentialRow(credentialId)
  if (!cred) throw new Error(`No pass ${credentialId}`)
  if (cred.status !== 'active') throw new Error(`Pass ${credentialId} is already revoked`)

  if (!newHolderEmail) {
    const { txHash } = await chain.revokeCredential(credentialId)
    await afterChain(txHash, () => deps.markRevoked(credentialId))
    return { txHash, newCredentialId: null }
  }

  // Check the new holder before touching the chain, so a typo doesn't burn the pass.
  const holder = await deps.userByEmail(newHolderEmail)
  if (!holder?.wallet) throw new Error(`${newHolderEmail} has to sign in to Passmark once before a pass can be reissued to them`)
  const { txHash, newTokenId } = await chain.reissueCredential(credentialId, holder.wallet as Address)
  await afterChain(txHash, async () => {
    // New row first: reissued_as references it.
    await deps.saveCredential({ id: newTokenId, eventId: cred.eventId, holderId: holder.id, metadataHash: cred.metadataHash ?? '' })
    await deps.markRevoked(credentialId, newTokenId)
  })
  return { txHash, newCredentialId: newTokenId }
}

async function afterChain(txHash: string, step: () => Promise<void>) {
  try {
    await step()
  } catch (e) {
    throw new Error(`On-chain change went through (${txHash}) but the database update failed: ${(e as Error).message}`)
  }
}
