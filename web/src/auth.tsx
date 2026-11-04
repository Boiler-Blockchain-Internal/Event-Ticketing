import type { ReactNode } from 'react'
import type { Hex } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import type { Signer } from '../../supabase/functions/_shared/pass.ts'

// Live mode: MetaMask Embedded Wallets client ID + a Supabase project. Otherwise the local demo.
export const ME_URL = import.meta.env.VITE_WEB3AUTH_CLIENT_ID && import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/me` : null

export const CLAIM_URL = import.meta.env.VITE_WEB3AUTH_CLIENT_ID && import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim` : null

export type Account = {
  ready: boolean
  signedIn: boolean
  signer?: Signer
  idToken(): Promise<string | null>
  signIn(email?: string): Promise<void> // no email = Google
  signOut(): Promise<void>
}

// The SDK is loaded only in live mode, so the demo never contacts MetaMask (and stays out of the main bundle).
const live = ME_URL ? await import('./auth-live') : null

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

export const AuthProvider = live?.LiveProvider ?? (({ children }: { children: ReactNode }) => children)
// Chosen once at load, so hook order never changes between renders.
export const useAccount: () => Account = live?.useLiveAccount ?? (() => demo)
