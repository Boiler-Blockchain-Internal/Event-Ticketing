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
        if (key && (key === 'Web3Auth-state' || key.startsWith('auth_store') || key.startsWith('w3a:'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(k => storage.removeItem(k))
    }
  } catch { /* storage access restricted */ }

  try {
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim()
      if (name === 'Web3Auth-state' || name.startsWith('auth_store') || name.startsWith('w3a:')) {
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
  const provider = connection?.ethereumProvider ?? web3Auth?.connection?.ethereumProvider
  const client = useMemo(() => provider ? createWalletClient({ transport: custom(provider) }) : null, [provider])
  const signer = useMemo<Signer | undefined>(() => {
    if (!client) return
    return { signMessage: async ({ message }) => client.signMessage({ account: (await client.getAddresses())[0], message }) }
  }, [client])
  const signedIn = isConnected || Boolean(web3Auth?.connected)
  return {
    ready: isInitialized,
    signedIn,
    signer,
    address: async () => {
      try {
        return client ? (await client.getAddresses())[0] : null
      } catch {
        return null
      }
    },
    userInfo: async () => {
      try {
        return web3Auth ? await web3Auth.getUserInfo() : null
      } catch {
        return null
      }
    },
    idToken: async () => {
      try {
        return (await getAuthTokenInfo()) ?? web3Auth?.idToken ?? null
      } catch {
        return web3Auth?.idToken ?? null
      }
    },
    signIn: async email => {
      // Ensure the AUTH connector is ready before calling connectTo
      if (web3Auth) {
        const start = Date.now()
        while (Date.now() - start < 4000) {
          const authConn = web3Auth.getConnector(WALLET_CONNECTORS.AUTH)
          if (authConn && (authConn.status === 'ready' || authConn.status === 'connected')) {
            break
          }
          await new Promise(r => setTimeout(r, 100))
        }
      }
      // connectTo skips MetaMask's own picker, which would show attendees wallet options.
      const conn = await connectTo(WALLET_CONNECTORS.AUTH, email
        ? { authConnection: AUTH_CONNECTION.EMAIL_PASSWORDLESS, loginHint: email }
        : { authConnection: AUTH_CONNECTION.GOOGLE })
      if (!conn && !web3Auth?.connected) {
        throw new Error("Sign-in didn't finish")
      }
    },
    signOut: async () => {
      try {
        await disconnect()
      } catch { /* ignore disconnect error */ }
      try {
        await web3Auth?.clearCache()
      } catch { /* ignore clearCache error */ }
      clearWeb3AuthStorage()
    },
  }
}
