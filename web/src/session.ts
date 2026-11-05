import type { Account } from './auth'

// Wait for the restored/just-created embedded account, without opening another login.
export async function session(account: Account) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const [token, address] = await Promise.all([account.idToken(), account.address()])
    if (token && address) return { token, address }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('Your sign-in is not ready. Sign in again and retry.')
}
