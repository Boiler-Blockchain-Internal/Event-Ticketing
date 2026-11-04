import { useMemo, type ReactNode } from 'react'
import { createWalletClient, custom, type Hex } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { AUTH_CONNECTION, WALLET_CONNECTORS, WEB3AUTH_NETWORK } from '@web3auth/modal'
import { useAuthTokenInfo, useWeb3Auth, useWeb3AuthConnect, useWeb3AuthDisconnect, Web3AuthProvider } from '@web3auth/modal/react'
import type { Signer } from '../../supabase/functions/_shared/pass.ts'

// Live mode: MetaMask Embedded Wallets client ID + a Supabase project. Otherwise the local demo.
const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID
export const ME_URL = clientId && import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/me` : null

// Devnet allows localhost; mainnet is for the deployed app. They give the same email different keys.
const config = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK === 'mainnet' ? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET : WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return ME_URL ? <Web3AuthProvider config={config}>{children}</Web3AuthProvider> : children
}

export type Account = {
  ready: boolean
  signedIn: boolean
  signer?: Signer
  idToken(): Promise<string | null>
  signIn(email?: string): Promise<void> // no email = Google
  signOut(): Promise<void>
}

function useLiveAccount(): Account {
  const { connection, isConnected, isInitialized } = useWeb3Auth()
  const { connectTo } = useWeb3AuthConnect()
  const { disconnect } = useWeb3AuthDisconnect()
  const { getAuthTokenInfo } = useAuthTokenInfo()
  const provider = connection?.ethereumProvider
  const signer = useMemo<Signer | undefined>(() => {
    if (!provider) return
    const client = createWalletClient({ transport: custom(provider) })
    return { signMessage: async ({ message }) => client.signMessage({ account: (await client.getAddresses())[0], message }) }
  }, [provider])
  return {
    ready: isInitialized,
    signedIn: isConnected,
    signer,
    idToken: getAuthTokenInfo,
    signIn: async email => {
      // connectTo skips MetaMask's own picker, which would show attendees wallet options.
      await connectTo(WALLET_CONNECTORS.AUTH, email
        ? { authConnection: AUTH_CONNECTION.EMAIL_PASSWORDLESS, loginHint: email }
        : { authConnection: AUTH_CONNECTION.GOOGLE })
    },
    signOut: () => disconnect(),
  }
}

// ponytail: demo signing key kept in this browser; only used when sign-in isn't configured.
function demoSigner() {
  let key: string | null = null
  try { key = localStorage.getItem('passmark-demo-key') } catch { /* private mode */ }
  if (!key) {
    key = generatePrivateKey()
    try { localStorage.setItem('passmark-demo-key', key) } catch { /* ephemeral key is fine */ }
  }
  return privateKeyToAccount(key as Hex)
}
const demo: Account = {
  ready: true, signedIn: true, signer: demoSigner(),
  idToken: async () => null, signIn: async () => {}, signOut: async () => {},
}

// Chosen once at load, so hook order never changes between renders.
export const useAccount: () => Account = ME_URL ? useLiveAccount : () => demo
