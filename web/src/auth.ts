// Pure sign-in state, kept free of React and the provider SDK so it can be unit tested with node:test.
// Attendee-facing copy lives in the pages; nothing here is shown to users.
import type { Address } from 'viem'
import { isAddress } from 'viem'

export type AuthState =
  | { status: 'signedOut' }
  | { status: 'sendingCode'; email: string }
  | { status: 'awaitingCode'; email: string }
  | { status: 'signedIn'; address: Address }
  | { status: 'error'; message: string; email?: string }

export type AuthEvent =
  | { type: 'sendCode'; email: string }
  | { type: 'codeSent' }
  | { type: 'signedIn'; address: string }
  | { type: 'failed'; message: string }
  | { type: 'sessionEnded' }
  | { type: 'reset' }
  | { type: 'signOut' }

export const signedOut: AuthState = { status: 'signedOut' }

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

export function authReducer(state: AuthState, ev: AuthEvent): AuthState {
  switch (ev.type) {
    case 'sendCode':
      return isEmail(ev.email)
        ? { status: 'sendingCode', email: ev.email.trim() }
        : { status: 'error', message: 'Enter a valid email address.' }
    case 'codeSent':
      return state.status === 'sendingCode' ? { status: 'awaitingCode', email: state.email } : state
    case 'signedIn':
      // The address is what credential claiming and pass signing use; refuse anything malformed.
      return isAddress(ev.address)
        ? { status: 'signedIn', address: ev.address }
        : { status: 'error', message: 'Sign-in did not finish. Please try again.' }
    case 'failed':
      // Keep the email only when a code is already out, so the UI can stay on the code step for a retry.
      return { status: 'error', message: ev.message, email: state.status === 'awaitingCode' ? state.email : undefined }
    case 'sessionEnded':
      // The provider reports "no session" on load too; that must not wipe a code entry in progress.
      return state.status === 'signedIn' ? signedOut : state
    case 'reset':
    case 'signOut':
      return signedOut
  }
}

export const addressOf = (s: AuthState): Address | undefined => (s.status === 'signedIn' ? s.address : undefined)
