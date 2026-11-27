// Revoke a pass, or reissue it to another attendee (lost phone, wrong recipient).
// Usage:
//   node scripts/revoke.ts <credentialId>                 revoke pass #0142 -> credentialId 142
//   node scripts/revoke.ts <credentialId> <new@email>     reissue to someone who has signed in once
// Env: DEPLOYER_PRIVATE_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//      (optional) PASSMARK_CONTRACT_ADDRESS, BASE_SEPOLIA_RPC_URL
// ponytail: CLI for organizers' rare cases; an admin button can call the same revokePass later.
import type { Address } from 'viem'
import { createChainRelayer, DEFAULT_CONTRACT_ADDRESS, DEFAULT_RPC_URL } from '../supabase/functions/_shared/chain.ts'
import { revokePass } from '../supabase/functions/_shared/revoke.ts'
import { supabaseDeps } from '../supabase/functions/_shared/supabase.ts'

const [credentialId, newHolderEmail] = process.argv.slice(2)
const { DEPLOYER_PRIVATE_KEY: key, SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceKey } = process.env
if (!credentialId || !key || !url || !serviceKey) {
  console.error('Usage: DEPLOYER_PRIVATE_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/revoke.ts <credentialId> [newHolderEmail]')
  process.exit(1)
}

const chain = createChainRelayer(key,
  (process.env.PASSMARK_CONTRACT_ADDRESS || DEFAULT_CONTRACT_ADDRESS) as Address,
  process.env.BASE_SEPOLIA_RPC_URL || DEFAULT_RPC_URL)
try {
  const r = await revokePass(credentialId, supabaseDeps(url, serviceKey), chain, newHolderEmail)
  console.log(r.newCredentialId
    ? `Reissued pass ${credentialId} as ${r.newCredentialId} to ${newHolderEmail}. Tx ${r.txHash}`
    : `Revoked pass ${credentialId}. Tx ${r.txHash}`)
} catch (e) {
  console.error((e as Error).message)
  process.exit(1)
}
