# Passmark embedded accounts and test minting

Students sign in to Passmark using Google or an email code. The existing MetaMask Embedded Wallets SDK creates/restores their embedded account. No extension, wallet picker, private-key export, or separate MetaMask login is used. The SDK/provider may still show its required consent or security screens. Claiming is a separate explicit action after sign-in.

## Configuration

Use the repository-root .env for Vite. Keep VITE_SUPABASE_URL, VITE_WEB3AUTH_CLIENT_ID and VITE_WEB3AUTH_NETWORK=devnet. Allow http://localhost:5174 in the matching Embedded Wallets dashboard project; enable email and Google login and configure Base Sepolia there. Do not switch the provider environment for existing accounts casually.

Supabase Edge Function secrets: WEB3AUTH_CLIENT_ID (same project), DEPLOYER_PRIVATE_KEY (or RELAYER_PRIVATE_KEY), PASSMARK_CONTRACT_ADDRESS, BASE_SEPOLIA_RPC_URL, and ORGANIZER_WALLET_ADDRESSES (comma-separated authorized embedded account addresses). The relayer must have issuer/admin permission on the contract and Base Sepolia test ETH. No secrets belong in VITE_ variables. Local empty private-key settings do not establish which secrets are configured remotely.

Apply existing database migrations, then deploy me, claim and events to Supabase to activate the backend fixes. The frontend updates alone do not patch deployed functions. Wallet claims in the provider's signed identity token are mandatory; a browser-submitted address cannot substitute for proof of ownership. If the provider returns a token without wallet claims, verify its project/token configuration rather than re-enabling the insecure fallback.

## Foundry

From repository root install the locked npm dependencies. Then run:

    cd contracts
    forge test
    forge build

Hardhat remains supported. Foundry reuses the same Solidity contract and npm OpenZeppelin dependency. Four Forge tests cover issuance, unauthorized minting, transfer locking and revoke/reissue. A deployment script is included but was not broadcast. It accepts only local chain 31337 or Base Sepolia 84532 and requires PASSMARK_ADMIN_ADDRESS. Use an encrypted Foundry keystore if deploying later; do not paste a private key into shell history. Reusing the existing contract needs no new deployment merely to adopt Foundry.

## Verification and limits

Test Google/email login first; check a stable account address across sign-out/sign-in, then test an explicit claim only after confirming backend secrets and test funding. Check the confirmed transaction and ownerOf against the embedded account. No real login, mint, deployment or scanner interaction was performed as part of this implementation.

The implementation fails on missing relayer configuration, reverted receipts, or missing matching mint logs. It does not invent token IDs or simulated passes. Existing credentials can still be returned without a relayer.

Before a public pilot, add durable claim reservations/idempotency, coordinated relayer nonces, and recovery when a transaction succeeds but the database write fails. Existing capacity checks are not atomic under concurrent claims. Blockchain-to-database revocation/ownership synchronization remains outstanding. The claim page still displays seeded demo event details. These limits make this suitable for controlled testnet integration work, not a finished public deployment.
