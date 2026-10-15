# Passmark — Event Ticketing

npm workspaces:

- `web/` — React + TypeScript (Vite). Routes: `#/` landing, `#/redeem` claim a pass, `#/tickets` my passes, `#/scan` staff check-in.
- `contracts/` — Hardhat 3 (viem toolbox, OpenZeppelin). Put Solidity in `contracts/contracts/`, tests in `contracts/test/`.

```bash
npm install
npm run dev            # web on http://localhost:5173
npm run build          # typecheck + production build
npm test -w web        # scan verification tests
npm run compile        # hardhat build
npm run test:contracts # hardhat test
```

Data in `web/src/data.ts` is mock until the backend and contract exist.
