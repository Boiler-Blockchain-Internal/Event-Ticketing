# Agent Instructions & Architecture Standards

Passmark is a Web3 Event Ticketing & Membership Platform piloted with Boiler Blockchain. It provides verifiable tickets, member cards, and attendance records with zero wallet or gas friction for attendees (email sign-in + embedded wallet). Attendees and door staff never see crypto jargon (wallet, gas, chain, mint, token).

## Source of Truth

- Canonical product and technical specifications reside in `docs/notion/`.
- If code and documentation disagree: **code wins for how, doc wins for what**. Always clarify before altering scope.

## Repository Layout

- `contracts/`: Solidity 0.8.28 ERC-721 + ERC-5192 soulbound credentials (`contracts/contracts/Passmark.sol`), Hardhat 3 + viem, Hardhat Ignition deployment (`ignition/modules/Passmark.ts`), and 9 unit tests (`test/Passmark.ts`).
- `supabase/`: Postgres schema & RLS migrations (`supabase/migrations/20261015000000_init.sql`), Deno scan Edge Function (`supabase/functions/scan/`), and runtime-agnostic shared crypto/verification (`supabase/functions/_shared/`).
- `web/`: Vite + React 19 + TypeScript SPA (mobile-first ticketing PWA). Hash-based routing via `useSyncExternalStore`, design tokens (`--bg`, `--accent`, etc.), zero-dependency QR generation (`qrcode-generator`).
- `scripts/`: Operational CLI tools (e.g. `staff-link.ts` generating HMAC-signed door links).
- `docs/notion/`: Canonical planning documentation and specifications.

## Core Architecture Invariants

- **On-chain boundary**: Store only credential ID (token ID), holder address, event ID, issuer address, status, and metadata hash. **NEVER write personal data (names, emails) on-chain.**
- **Off-chain data (Postgres / Supabase)**: Manages users, auth, event details, wallet mappings, check-in logs, and nonces with Row Level Security (RLS).
- **Anti-replay QR protocol**: Attendees sign `pm1.<credId>.<eventId>.<timestamp>.<nonce>` via EIP-191 `personal_sign`. QRs refresh every 30s (`REFRESH`) and remain valid for 60s (`MAX_AGE`) on the server.
- **Atomic check-in**: Database procedure `check_in()` enforces `UNIQUE (event_id, credential_id)` on `checkins` table to prevent race conditions across door scanners.
- **Three door scan states**: Green `admit`, amber `repeat` (shows initial check-in time), and red `invalid` (plain-language explanation).
- **Scoped staff access**: Door staff authenticate using stateless HMAC-SHA256 tokens (`STAFF_LINK_SECRET`) formatted as `<eventId>.<expires>.<HMAC>` without administrative credentials.

## Essential Commands

```bash
npm install            # Install workspace dependencies
npm run dev            # Start web dev server (http://localhost:5173)
npm run compile        # Compile contracts with Hardhat (solc 0.8.28)
npm test -w contracts  # Run 9 Hardhat contract tests (viem + node:test)
npm test -w web        # Run 6 web & shared crypto unit tests (node:test)
npm run build -w web   # Typecheck and production build web app
```

## Git & Development Conventions

- **Branching**: Never commit directly to `main`. Always branch off `main` (e.g. `docs/*`, `feat/*`, `fix/*`).
- **PR Protocol**: Only open **Draft Pull Requests** (`gh pr create --draft`). Require explicit review before merge.
- **XP / Atomic Changes**: Keep pull requests small and focused (<5 files, <200 lines). Verify locally before committing.
- **Testing**: Colocate unit tests (`*.test.ts`) using native `node:test` and `node:assert/strict`. No Jest or Vitest.
- **Shortcuts**: Mark intentional trade-offs with `// ponytail:` explaining the limitation and upgrade path.
- **Attribution**:
  - Author: `BenHirschy33 <179422209+BenHirschy33@users.noreply.github.com>`
  - Co-author: `Co-authored-by: Antigravity <agent@antigravity.local>`
