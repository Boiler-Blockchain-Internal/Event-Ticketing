import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseEventLogs,
  toHex,
  type Address,
  type Hash,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

export const passmarkAbi = [
  {
    type: 'function',
    name: 'registerEvent',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'eventId', type: 'uint256' },
      { name: 'issuer', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'events',
    stateMutability: 'view',
    inputs: [{ name: 'eventId', type: 'uint256' }],
    outputs: [
      { name: 'issuer', type: 'address' },
      { name: 'transferable', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'eventId', type: 'uint256' },
      { name: 'metadataHash', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'CredentialMinted',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'holder', type: 'address', indexed: true },
      { name: 'eventId', type: 'uint256', indexed: true },
      { name: 'metadataHash', type: 'bytes32', indexed: false },
    ],
  },
] as const

export const DEFAULT_CONTRACT_ADDRESS = '0x256c1A87b79f28de3989cBf1742144E3Ca21705C' as Address
export const DEFAULT_RPC_URL = 'https://sepolia.base.org'

// Validates whether a string is a valid 32-byte hex private key.
export function isValidPrivateKey(key?: string | null): boolean {
  if (!key) return false
  const trimmed = key.trim().replace(/^['"]|['"]$/g, '')
  const formatted = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`
  return /^0x[0-9a-fA-F]{64}$/.test(formatted)
}

// Deterministic mapping of human-readable slug (e.g. 'bb-fgm') to on-chain uint256 ID.
export function toChainEventId(slug: string): bigint {
  return BigInt(keccak256(toHex(slug)))
}

// Anchors off-chain event + holder identity without exposing personal info on-chain.
export function toMetadataHash(slug: string, userId: string): Hex {
  return keccak256(toHex(`${slug}:${userId}`))
}

export type ChainRelayer = {
  address: Address
  isEventRegistered(eventId: bigint): Promise<boolean>
  registerEvent(
    slug: string,
    issuer?: Address,
  ): Promise<{ txHash: Hash | null; alreadyRegistered?: boolean; onChainId: bigint }>
  mintCredential(
    to: Address,
    slug: string,
    metadataHash: Hex,
  ): Promise<{ txHash: Hash; tokenId: string; onChainId: bigint }>
}

export function createChainRelayer(
  privateKey: Hex | string,
  contractAddress: Address = DEFAULT_CONTRACT_ADDRESS,
  rpcUrl: string = DEFAULT_RPC_URL,
): ChainRelayer {
  const trimmed = privateKey.trim().replace(/^['"]|['"]$/g, '')
  const formattedKey = (trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`) as Hex
  if (!isValidPrivateKey(formattedKey)) {
    throw new Error('DEPLOYER_PRIVATE_KEY must be a valid 32-byte hex string (64 characters with optional 0x prefix)')
  }
  const account = privateKeyToAccount(formattedKey)
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  })
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  })

  return {
    address: account.address,
    async isEventRegistered(eventId: bigint): Promise<boolean> {
      try {
        const [issuer] = await publicClient.readContract({
          address: contractAddress,
          abi: passmarkAbi,
          functionName: 'events',
          args: [eventId],
        })
        return issuer !== '0x0000000000000000000000000000000000000000'
      } catch {
        return false
      }
    },
    async registerEvent(slug: string, issuer?: Address) {
      const onChainId = toChainEventId(slug)
      const targetIssuer = issuer ?? account.address

      // Avoid reverting if the event is already registered on-chain
      const exists = await this.isEventRegistered(onChainId)
      if (exists) {
        return { txHash: null, alreadyRegistered: true, onChainId }
      }

      const txHash = await walletClient.writeContract({
        address: contractAddress,
        abi: passmarkAbi,
        functionName: 'registerEvent',
        args: [onChainId, targetIssuer],
      })

      await publicClient.waitForTransactionReceipt({ hash: txHash })
      return { txHash, alreadyRegistered: false, onChainId }
    },
    async mintCredential(to: Address, slug: string, metadataHash: Hex) {
      const onChainId = toChainEventId(slug)

      // Ensure the event is registered on-chain first so mint won't revert with UnknownEvent
      const exists = await this.isEventRegistered(onChainId)
      if (!exists) {
        await this.registerEvent(slug, account.address)
      }

      const txHash = await walletClient.writeContract({
        address: contractAddress,
        abi: passmarkAbi,
        functionName: 'mint',
        args: [to, onChainId, metadataHash],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      const logs = parseEventLogs({
        abi: passmarkAbi,
        eventName: 'CredentialMinted',
        logs: receipt.logs,
      })

      const mintedLog = logs.find(l => l.args.holder.toLowerCase() === to.toLowerCase())
      const tokenId = mintedLog?.args.tokenId ? mintedLog.args.tokenId.toString() : '1'

      return { txHash, tokenId, onChainId }
    },
  }
}
