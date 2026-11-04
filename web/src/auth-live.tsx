import { useMemo, type ReactNode } from 'react'
import { createWalletClient, custom } from 'viem'
import { AUTH_CONNECTION, WALLET_CONNECTORS, WEB3AUTH_NETWORK } from '@web3auth/modal'
import { useAuthTokenInfo, useWeb3Auth, useWeb3AuthConnect, useWeb3AuthDisconnect, Web3AuthProvider } from '@web3auth/modal/react'
import type { Account } from './auth'
import type { Signer } from '../../supabase/functions/_shared/pass.ts'

// MetaMask Embedded Wallets. Only imported in live mode (see auth.tsx): the SDK prefetches its frame on import.
// Devnet allows localhost; mainnet is for the deployed app. They give the same email different keys.
const config = {
  web3AuthOptions: {
    clientId: import.meta.env.VITE_WEB3AUTH_CLIENT_ID,
    web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK === 'mainnet' ? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET : WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  },
}

export const LiveProvider = ({ children }: { children: ReactNode }) => <Web3AuthProvider config={config}>{children}</Web3AuthProvider>

function clearWeb3AuthStorage() {
  try {
    for (const storage of [localStorage, sessionStorage]) {
      const keysToRemove: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key && (/^(Web3Auth|auth_store|w3a|openlogin|torus)/i.test(key) || key.includes('web3auth'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(k => storage.removeItem(k))
    }
  } catch { /* storage access restricted */ }

  try {
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim()
      if (/^(Web3Auth|auth_store|w3a|openlogin|torus)/i.test(name) || name.includes('web3auth')) {
        document.cookie = `${name}=; Max-Age=0; path=/;`
        document.cookie = `${name}=; Max-Age=0;`
      }
    })
  } catch { /* cookie access restricted */ }
}

export function useLiveAccount(): Account {
  const { connection, isConnected, isInitialized, web3Auth } = useWeb3Auth()
  const { connectTo } = useWeb3AuthConnect()
  const { disconnect } = useWeb3AuthDisconnect()
  const { getAuthTokenInfo } = useAuthTokenInfo()
  const provider = connection?.ethereumProvider
  const client = useMemo(() => provider ? createWalletClient({ transport: custom(provider) }) : null, [provider])
  const signer = useMemo<Signer | undefined>(() => {
    if (!client) return
    return { signMessage: async ({ message }) => client.signMessage({ account: (await client.getAddresses())[0], message }) }
  }, [client])
  return {
    ready: isInitialized,
    signedIn: isConnected,
    signer,
    address: async () => client ? (await client.getAddresses())[0] : null,
    userInfo: async () => web3Auth ? web3Auth.getUserInfo() : null,
    idToken: getAuthTokenInfo,
    signIn: async email => {
      // connectTo skips MetaMask's own picker, which would show attendees wallet options.
      await connectTo(WALLET_CONNECTORS.AUTH, email
        ? { authConnection: AUTH_CONNECTION.EMAIL_PASSWORDLESS, loginHint: email }
        : { authConnection: AUTH_CONNECTION.GOOGLE })
    },
    signOut: async () => {
      try {
        await disconnect({ cleanup: true })
      } catch { /* ignore disconnect error */ }
      try {
        await web3Auth?.clearCache()
      } catch { /* ignore clearCache error */ }
      clearWeb3AuthStorage()
    },
  }
}
