// Sign-in for attendees. Wraps the embedded-wallet provider (Privy) behind one hook so the rest of the app
// only sees "signed in" and an address; swapping providers means changing this file only.
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { PrivyProvider, useLoginWithEmail, useLoginWithOAuth, usePrivy, useSignMessage, useWallets } from '@privy-io/react-auth'
import type { Address, Hex } from 'viem'
import { addressOf, authReducer, isEmail, signedOut, type AuthState } from './auth.ts'
import type { Signer } from '../../supabase/functions/_shared/pass.ts'

export type Auth = {
  /** False when no app ID is set; the app then runs on the demo pass. */
  configured: boolean
  /** False until a saved session (if any) has been restored; avoid redirecting before then. */
  ready: boolean
  state: AuthState
  address?: Address
  signer?: Signer
  sendCode(email: string): Promise<void>
  verifyCode(code: string): Promise<void>
  signInWithGoogle(): Promise<void>
  signOut(): Promise<void>
}

const unconfigured = async () => { console.warn('VITE_PRIVY_APP_ID is not set; sign-in is disabled.') }
const demo: Auth = {
  configured: false, ready: true, state: signedOut,
  sendCode: unconfigured, verifyCode: unconfigured, signInWithGoogle: unconfigured, signOut: unconfigured,
}
const AuthContext = createContext<Auth>(demo)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID as string | undefined
  if (!appId) return <AuthContext.Provider value={demo}>{children}</AuthContext.Provider>
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'google'],
        // Silently provision the wallet at first sign-in; the user is never asked to create or back one up.
        embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' }, showWalletUIs: false },
      }}
    >
      <Live>{children}</Live>
    </PrivyProvider>
  )
}

function Live({ children }: { children: ReactNode }) {
  const privy = usePrivy()
  const { wallets, ready: walletsReady } = useWallets()
  const otp = useLoginWithEmail()
  const oauth = useLoginWithOAuth()
  const { signMessage } = useSignMessage()
  const [state, dispatch] = useReducer(authReducer, signedOut)

  const address = wallets.find(w => w.walletClientType === 'privy')?.address
  const { ready: privyReady, authenticated } = privy

  useEffect(() => {
    if (!privyReady) return
    if (authenticated && address) dispatch({ type: 'signedIn', address })
    else if (!authenticated) dispatch({ type: 'sessionEnded' })
  }, [privyReady, authenticated, address])

  const signer = useMemo<Signer | undefined>(() => state.status !== 'signedIn' ? undefined : {
    async signMessage({ message }) {
      const { signature } = await signMessage({ message }, { address: state.address, uiOptions: { showWalletUIs: false } })
      return signature as Hex
    },
  }, [state, signMessage])

  const fail = (message: string) => dispatch({ type: 'failed', message })
  const value: Auth = {
    configured: true,
    // ponytail: if wallet creation silently fails after login, this stays false; add a timeout + retry copy.
    ready: privyReady && walletsReady && (!authenticated || !!address),
    state, address: addressOf(state), signer,
    async sendCode(email) {
      if (!isEmail(email)) return dispatch({ type: 'sendCode', email })
      dispatch({ type: 'sendCode', email })
      try { await otp.sendCode({ email: email.trim() }); dispatch({ type: 'codeSent' }) }
      catch { fail("We couldn't send the code. Check the email and try again.") }
    },
    async verifyCode(code) {
      try { await otp.loginWithCode({ code: code.trim() }) }
      catch { fail("That code didn't work. Check it and try again.") }
    },
    async signInWithGoogle() {
      try { await oauth.initOAuth({ provider: 'google' }) }
      catch { fail("We couldn't start Google sign-in. Please try again.") }
    },
    async signOut() { await privy.logout(); dispatch({ type: 'signOut' }) },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
