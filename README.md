# Passmark — Event Ticketing

Web3 Event Ticketing & Membership Platform for student orgs, piloted with Boiler Blockchain.

## npm workspaces

- `web/` — React 19 + TypeScript (Vite). Routes: `#/` landing, `#/redeem` claim a pass, `#/tickets` my passes, `#/scan` staff check-in.
- `contracts/` — Hardhat 3 (viem toolbox, OpenZeppelin). Put Solidity in `contracts/contracts/`, tests in `contracts/test/`.
- `supabase/` — Postgres schema, RLS policies, and Deno Edge Functions (`scan`).

## Commands

```bash
npm install
npm run dev            # web on http://localhost:5173
npm run build          # typecheck + production build
npm test -w web        # scan & backend verification unit tests
npm run compile        # hardhat build
npm test -w contracts  # hardhat unit tests (9 tests)
```

## Backend & Supabase Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Populate `VITE_SUPABASE_URL` and `STAFF_LINK_SECRET` in `.env.local`.
3. In the Supabase project dashboard (**Project Settings > Edge Functions > Secrets**), add `STAFF_LINK_SECRET` with the same secret value.
4. Generate an expiring door-staff scan link:
   ```bash
   STAFF_LINK_SECRET=your_secret node scripts/staff-link.ts bb-fgm 12 http://localhost:5173
   ```
