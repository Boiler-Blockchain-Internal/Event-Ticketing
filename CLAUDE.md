# Passmark (Event-Ticketing)

> **Note**: See [AGENT.md](./AGENT.md) for canonical agent instructions, architecture invariants, and standards across all AI coding assistants.

Verifiable event tickets, member cards and attendance records for student orgs, piloted with Boiler Blockchain.
Attendees sign in with email, show a rotating QR, and get in. They never see a wallet, gas, or chain terms.

Source of truth for scope: the Notion doc "Web3 Event Ticketing & Membership Platform: Product & Technical Planning Doc".
If code and that doc disagree, the code wins for *how*, the doc wins for *what*. Ask before changing scope.

## Layout

- `package.json`: npm workspaces root (`web`, `contracts`).
- `web/`: Vite + React 19 + TypeScript SPA. **Not Next.js** (the Notion doc says Next.js; the repo chose Vite).
  - `src/router.ts`: hash routing via `useSyncExternalStore`. No react-router.
  - `src/data.ts`: mock data, stands in until the backend and contract exist.
  - `src/verify.ts`: door-side scan check. Local stand-in for the real backend check.
  - `src/auth.tsx`: `useAccount()`: MetaMask Embedded Wallets login + signer when `VITE_WEB3AUTH_CLIENT_ID` and `VITE_SUPABASE_URL` are set, else a demo key. The SDK lives in `src/auth-live.tsx` and is imported only in live mode (it prefetches MetaMask's frame on import).
  - `src/pages/`, `src/components/`: screens and UI pieces (`Qr.tsx`, `HeroTicket.tsx`, `Logo.tsx`).
- `supabase/functions/_shared/`: code shared by edge functions and the web app (imported by relative path). `pass.ts` rotating signed QR payload; `scan.ts` door check; `staff.ts` scoped staff-link token; `login.ts` MetaMask ID-token check (ES256 via WebCrypto) and wallet address; `supabase.ts` PostgREST deps over fetch. Runs in Node (tests) and Deno.
- `supabase/functions/scan/`: the scan edge function (`verify_jwt = false` in `config.toml`; the staff token is the auth).
- `supabase/functions/me/`: saves the signed-in attendee + wallet, returns their passes (`verify_jwt = false`; MetaMask's ID token is the auth). Needs `WEB3AUTH_CLIENT_ID`.
- `supabase/functions/events/`: creates events in Postgres and registers on Base Sepolia (`verify_jwt = false`). Returns claim and staff scan URLs.
- `scripts/staff-link.ts`: prints a door-staff link until the admin dashboard exists.
- `supabase/migrations/`: Postgres schema, RLS, and the atomic `check_in` function.
- `contracts/`: Hardhat 3 + viem (not Foundry), OpenZeppelin v5 ERC-721 + ERC-5192 (`contracts/contracts/Passmark.sol`), Hardhat Ignition module (`ignition/modules/Passmark.ts`), deployed to Base Sepolia at `0x256c1A87b79f28de3989cBf1742144E3Ca21705C` (chain ID 84532), 11 unit tests (`test/Passmark.ts`).
- `index.html` (root): static marketing page with the design tokens (`--bg`, `--accent`, `--amber`, `--red`, Geist fonts). Reuse these tokens in `web/`.

## Commands

```bash
npm install            # from repo root
npm run dev            # web dev server
npm run compile        # hardhat compile contracts
npm test -w contracts  # hardhat unit tests (11 tests)
npm test -w web        # unit tests, web + server (node:test runs .ts directly, Node 23.6+)
npm run build -w web   # typecheck and build web app
```

## Conventions

- TypeScript strict, `noUnusedLocals`, `noUnusedParameters`. Imports use explicit `.ts` extensions.
- Tests: `node:test` + `node:assert/strict`, colocated as `*.test.ts`. No Jest or Vitest.
- Minimal dependencies. Prefer the platform (native camera API, CSS) before adding a package.
- Deliberate shortcuts get a `ponytail:` comment naming the ceiling and the upgrade path.
- Scan results are exactly three states: green `admit`, amber `repeat` (shows first check-in time), red `invalid` (plain-language reason).
- UI copy never says wallet, gas, chain, mint, or token to attendees or door staff.

## Architecture decisions (from the spec)

- Credential: ERC-721 with transfers locked by default (ERC-5192 soulbound), issuer-only revoke + reissue. One shared contract for all orgs.
- On-chain: credential ID, holder address, event ID, issuer, status, metadata hash. **Never** emails, names, or other personal data.
- Off-chain (Postgres on Supabase): event details, users, wallet mapping, check-ins, nonces.
- Chain: Base (Sepolia testnet first). Contracts: Solidity + Foundry + OpenZeppelin.
- Wallets: MetaMask Embedded Wallets (formerly Web3Auth; packages are still `@web3auth/*`) with email/Google login. No extension. Platform pays gas.
- QR payload: credential ID, event ID, issued-at, nonce, signed by the holder's wallet. Refreshes every 30s.
- Server scan check: signature recovers to the on-chain owner, timestamp within 60s, not revoked, event matches, nonce unseen.
- Atomic check-in: `UNIQUE (event_id, credential_id)` in Postgres. Two scanners racing cannot both admit.
- Door staff use a scoped, expiring per-event link with no admin powers.

## Build order (MVP must-haves, above the cut line)

1. Contract on Base Sepolia: mint, transfer lock, revoke/reissue, events. (Deployed: `0x256c1A87b79f28de3989cBf1742144E3Ca21705C` on Base Sepolia chain 84532; 11 unit tests passing).
2. Supabase schema: users, events, credentials, checkins (unique constraint), nonces.
3. Email/Google sign-in with embedded wallet; platform-sponsored mint.
4. Admin: create event / membership tier; issue by CSV and capped claim link.
5. Attendee: ticket/member card with rotating signed QR.
6. Staff scan page: camera scan, replace `verify.ts` mock with the server check.
7. Attendance log + CSV export; admin revoke/reissue; role permissions.

Out of scope: payments, resale/marketplace, multi-chain, native apps. Stretch only after the Month 2 gate: offline allowlist, Apple/Google Wallet passes, external wallet linking, transfers, analytics.

## Decided

- Backend: Supabase edge functions (Deno). Shared logic in `supabase/functions/_shared/`.
- Wallet provider: MetaMask Embedded Wallets (2026-11-04). Free Base plan: 1,000 monthly active wallets, its own email/Google login, no custom JWT or account abstraction (those are Growth, $69/mo).

## Open decisions (do not assume; ask)

- Base vs Optimism final pick (the Notion tasks page says Base), mainnet vs testnet for the pilot.
