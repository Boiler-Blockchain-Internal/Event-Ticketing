import type { Hash } from 'viem'
import type { Login } from './login.ts'
import type { ClaimTarget } from './supabase.ts'
import type { ChainRelayer } from './chain.ts'
import { toMetadataHash } from './chain.ts'

export type ClaimDeps = {
  saveUser(login: Login): Promise<string>
  claimInfo(eventId: string, userId: string): Promise<ClaimTarget>
  saveCredential(cred: { id: string; eventId: string; holderId: string; metadataHash: string }): Promise<void>
}

export type ClaimResult =
  | { status: 'existing'; credentialId: string; eventId: string }
  | { status: 'minted'; credentialId: string; eventId: string; txHash: Hash | null }

export class ClaimError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'ClaimError'
    this.statusCode = statusCode
  }
}

export async function claimPass(
  eventId: string,
  login: Login,
  deps: ClaimDeps,
  relayer?: ChainRelayer | null,
): Promise<ClaimResult> {
  const userId = await deps.saveUser(login)
  const info = await deps.claimInfo(eventId, userId)

  if (!info.event) {
    throw new ClaimError('Event not found', 404)
  }

  // Idempotency: user already holds an active pass for this event
  if (info.existingCredentialId) {
    return { status: 'existing', credentialId: info.existingCredentialId, eventId }
  }

  // Capacity check
  if (info.event.capacity != null && info.activeCount >= info.event.capacity) {
    throw new ClaimError('This event is full. No spots left.', 409)
  }

  const metadataHash = toMetadataHash(eventId, userId)
  if (!relayer) throw new ClaimError('Pass issuing is not configured yet. Contact the organizer.', 503)
  const { tokenId: credentialId, txHash } = await relayer.mintCredential(login.address, eventId, metadataHash)

  await deps.saveCredential({
    id: credentialId,
    eventId,
    holderId: userId,
    metadataHash,
  })

  return { status: 'minted', credentialId, eventId, txHash }
}
