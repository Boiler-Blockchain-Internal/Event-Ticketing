# Passmark — Event Ticketing

Web3 Event Ticketing & Membership Platform for student orgs, piloted with Boiler Blockchain.

## npm workspaces

- `web/` — React 19 + TypeScript (Vite). Routes: `#/` landing, `#/redeem` claim a pass, `#/tickets` my passes, `#/scan` staff check-in.
- `contracts/` — Hardhat 3 (viem toolbox, OpenZeppelin). Put Solidity in `contracts/contracts/`, tests in `contracts/test/`.
- `supabase/` — Postgres schema, RLS policies, and Deno Edge Functions (`scan`, `me`, `events`, `claim`).

## Commands

```bash
npm install
npm run dev            # web on http://localhost:5173
npm run build          # typecheck + production build
npm test -w web        # scan & backend verification unit tests
npm run compile        # hardhat build
npm test -w contracts  # hardhat unit tests (11 tests)
```

## Backend & Supabase Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Populate the environment variables in `.env.local`:
   - `VITE_SUPABASE_URL`: Found in the Supabase Dashboard under **Project Settings > Data API > Project URL** (e.g. `https://<project-ref>.supabase.co`).
   - `STAFF_LINK_SECRET`: A shared HMAC passphrase for signing and verifying door-staff links (obtain from project lead or team password vault).
   - `VITE_WEB3AUTH_CLIENT_ID`: (Optional for live sign-in) Client ID from [Web3Auth / MetaMask Dashboard](https://dashboard.web3auth.io). Leave blank to use local demo mode.
   - `VITE_WEB3AUTH_NETWORK`: `devnet` (supports `http://localhost:5173`) or `mainnet`.
3. In the Supabase project dashboard (**Project Settings > Edge Functions > Secrets**), add the runtime secrets:
   - `STAFF_LINK_SECRET`: Same shared secret passphrase as above.
   - `WEB3AUTH_CLIENT_ID`: Same client ID as `VITE_WEB3AUTH_CLIENT_ID` (required for `/functions/v1/me` and `/functions/v1/claim` ID token verification).
   - `DEPLOYER_PRIVATE_KEY`: Platform admin relayer key on Base Sepolia for on-chain event registration and sponsored minting (`/functions/v1/events` and `/functions/v1/claim`).
   - `PASSMARK_CONTRACT_ADDRESS`: (Optional) Contract address (defaults to `0x256c1A87b79f28de3989cBf1742144E3Ca21705C`).
4. Generate an expiring door-staff scan link:
   ```bash
   STAFF_LINK_SECRET=your_secret node scripts/staff-link.ts bb-fgm 12 http://localhost:5173
   ```
