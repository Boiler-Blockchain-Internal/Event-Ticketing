# Web3 Event Ticketing & Membership Platform: Product & Technical Planning Doc

## 1. Problem & Opportunity

Student orgs and small events need tickets and membership proof that are cheap to issue, hard to fake, and fast to check at the door, and neither paper nor a generic ticketing site delivers all three.

**What breaks today**

- Paper tickets and screenshots are trivially copied, and nobody can tell which copy is real.
- Centralized ticketing tools (Eventbrite, Google Forms plus a spreadsheet) charge fees, lock the data inside one vendor, and give attendees nothing they own.
- Membership lives in a roster that one officer maintains, so it is lost at every leadership turnover and cannot be verified by a third party (a sponsor, another club, a venue).
- Attendance history is rarely captured, so orgs cannot show sponsors or the university real engagement numbers.

**Why a digital credential helps**

- **Verifiable ownership:** a credential is cryptographically tied to a holder, so a check-in can prove the holder is legitimate without calling a central server for every scan.
- **Portable and durable:** the member keeps proof of membership and past attendance even after the org's admin team changes.
- **Composable:** other orgs and sponsors can recognize a credential (for example, a discount for Boiler Blockchain members) without a custom integration.
- **Fast check-in:** a rotating QR code on a phone is scanned in about a second, with no printed lists.

**Why us, why now:** a campus blockchain org is a natural first user and first audience. A small, contained product (ticket, member card, attendance record) is a realistic semester scope and avoids the marketplace and speculation features that sink most web3 ticketing attempts.

**What success looks like for the MVP:** one real event with 100 or more attendees checked in with no duplicate entries, median scan time under 3 seconds, and attendees who never needed to understand gas, seed phrases, or chains to get in.

## 2. Target users & jobs-to-be-done

Three roles use the product, and the door staff role sets the speed and simplicity bar for everything else.

| Role | Who they are | Jobs to be done | What they must never have to do |
| --- | --- | --- | --- |
| Organization admin | Officer or event lead at a student org, usually non-technical | Create an event or membership tier in under 5 minutes. Issue credentials to a list of people. See who showed up. Export attendance for sponsors and the university. | Deploy contracts, hold gas tokens, or manage keys. |
| Attendee / member | Student, often with no crypto wallet | Claim a ticket or member card from an email link. Show a QR at the door. Keep a record of events attended. | Install a wallet extension or write down a seed phrase on day one. |
| Door / check-in staff | A volunteer with a phone, in a loud, crowded, poorly connected room | Scan a QR and get a clear green or red result in about a second. Handle edge cases (already used, wrong event) without arguing. | Understand blockchain, or log in with admin powers. |

**Secondary stakeholders (not MVP users):** sponsors who want attendance proof, and the university or Student Org office that asks for engagement reports.

## 3. Core user flows

Five flows cover the whole MVP; each one is designed so the attendee never sees a blockchain term.

**3.1 Create event / membership (admin)**

1. Admin signs in with a school email or Google account.
2. Admin picks a type: one-time event ticket, or membership (semester term).
3. Admin enters name, date, venue, capacity, and optional check-in window.
4. Platform creates the event record and registers it on-chain through the shared contract (no deploy by the admin).
5. Admin gets a dashboard with an invite link and a staff check-in link.

**3.2 Issue credential (admin to attendee)**

1. Admin uploads a CSV of emails or shares a public claim link with a cap.
2. Each recipient opens the link and signs in with email or Google.
3. Platform creates an embedded wallet for them silently and mints the credential to it; platform sponsors the gas.
4. Recipient sees a ticket or member card in their account and can add it to Apple or Google Wallet as a stretch goal.
5. Advanced users can later link their own wallet to claim the same credential.

**3.3 Present QR (attendee)**

1. Attendee opens the ticket on their phone.
2. App shows a QR that refreshes every 30 seconds and encodes the credential ID, event ID, a timestamp, and a signature from the holder's wallet.
3. A screenshot of the QR goes stale within one refresh window.

**3.4 Verify & check in (door staff)**

1. Staff opens the staff link on a phone and picks the event (no admin rights).
2. Staff scans the QR with the phone camera.
3. Backend checks the signature, the freshness of the timestamp, ownership of the credential, event match, and that it has not been used.
4. Screen shows green (admit), amber (already checked in, with the time), or red (invalid, with a plain reason).
5. A successful scan writes a check-in record; the credential is marked used for that event.
6. If the venue has no signal, staff can use a cached allowlist mode (stretch goal; see Risks).

**3.5 View attendance history**

- **Admin:** per-event list of attendees, check-in time, and no-shows, plus CSV export.
- **Attendee:** a personal timeline of events attended and memberships held, which doubles as a shareable proof of participation.

## 4. Credential model decision

**Decision: a hybrid, non-transferable-by-default credential, with a minimal on-chain proof and off-chain metadata.** Each credential is a token on-chain that records issuer, event, and holder, while names, art, descriptions, and attendance details live in our database.

| Option | Strengths | Weaknesses for a semester MVP |
| --- | --- | --- |
| Transferable NFT ticket | Familiar, works with existing wallets and marketplaces | Invites scalping and resale, needs royalty and marketplace logic, harder to bind a ticket to a person, and pushes us toward the marketplace scope we want to avoid |
| Non-transferable (soulbound) token | Strong fit for membership and attendance proof; no resale; simple semantics | Lost wallet means a lost credential unless we add recovery; some events need to hand a ticket to a friend |
| Hybrid: minimal on-chain proof plus off-chain metadata, non-transferable by default | Cheap to mint, easy to update metadata, supports recovery by admin re-issue, and leaves room for an optional transfer flag later | Needs a small backend and a clear trust model for what is off-chain |

**Why the hybrid wins for a semester**

- **Membership and attendance are the real value.** These are naturally non-transferable, so soulbound semantics are correct, not a limitation.
- **Tickets can be handled with an admin-controlled transfer flag.** Default off; an admin can allow a one-time reissue (burn and remint to a new holder) for friends or lost access, which gives us controlled transfer without a marketplace.
- **Lost wallet is handled by re-issue.** Because an admin is the issuer, they can revoke and mint to a new wallet, so users are never stuck with a dead credential.
- **Cost and speed.** Storing only a small record on-chain (credential ID, holder, event ID, issuer, status, a metadata hash) keeps gas low on an L2 and keeps metadata editable (typos, venue changes) without remints.
- **Honest about trust.** The chain proves who issued what to whom and when; the database holds everything else, and the hash anchors it so tampering is detectable.

**Token standard:** an ERC-721 with transfers disabled by default (or ERC-5192 minimal soulbound interface) plus an issuer-only revoke and reissue path. We will confirm the exact standard with leadership (see Open questions).

## 5. MVP feature list

The MVP is the smallest product that runs one real event end to end: create, issue, present, verify, and see attendance. Anything below the cut line waits until the pilot is done.

**Must-have (above the cut line)**

- [ ]  Email or Google sign-in with an auto-created embedded wallet
- [ ]  Admin dashboard: create an event and a membership tier
- [ ]  Credential minting on an L2 testnet first, then mainnet for the pilot, with platform-sponsored gas
- [ ]  Issuance by CSV upload and by a capped claim link
- [ ]  Attendee view: ticket or member card with a rotating QR
- [ ]  Staff check-in page: camera scan, green, amber, or red result, no admin rights
- [ ]  Anti-replay: signed, time-limited QR plus single-use check-in enforcement
- [ ]  Attendance log per event with CSV export
- [ ]  Admin revoke and reissue (covers lost access and wrong recipient)
- [ ]  Basic role permissions (admin, staff, attendee)

**--- CUT LINE ---**

**Stretch (only if must-haves are done and stable)**

- [ ]  Offline-tolerant check-in with a cached allowlist
- [ ]  Add to Apple Wallet or Google Wallet pass
- [ ]  Link an external wallet to claim credentials
- [ ]  Attendee-facing attendance timeline page with shareable proof
- [ ]  Multi-event membership benefits (for example, member gets free entry to a series)
- [ ]  Admin-approved ticket transfer
- [ ]  Simple analytics (repeat attendance rate, no-show rate)

**Explicitly out of scope**

- Paid ticketing, payments, or refunds
- Secondary marketplace, resale, royalties, or tokens with market value
- Multi-chain support
- Custom branding per org beyond logo and color
- Native mobile apps (we ship a mobile-first web app)

## 6. Technical architecture

A thin web app and API sit in front of one shared contract on an L2; the chain is the source of truth for ownership, and the backend is the source of truth for everything else.

[embedded content: architecture · 6 components]

The web app talks only to our backend. The backend writes to Postgres and, through the wallet provider, to the contract, while an indexer copies contract events back so a scan never waits on the chain.

**6.1 Auth and wallet strategy**

- **Default path:** email or Google sign-in through an embedded-wallet provider, which creates a non-custodial wallet in the background. No extension, no seed phrase.
- **Gas:** the platform pays through a paymaster or relayer, so users and admins never hold native tokens.
- **Upgrade path (stretch):** a user can link an external wallet (MetaMask, Coinbase Wallet) through a signed message and move to self-custody.
- **Staff auth:** a scoped, expiring check-in link or staff role per event, with no ability to mint or revoke.

**6.2 Contract responsibilities**

One shared, audited-by-peer contract serves all orgs, so admins never deploy anything.

- Register an event or membership tier under an issuer (org) address.
- Mint a credential to a holder; enforce a non-transferable default with an optional per-event transfer flag.
- Revoke and reissue, callable only by the issuer or a platform admin role.
- Record a check-in (event ID, credential ID, timestamp) so attendance has an on-chain anchor. If gas or latency is a concern, we batch check-ins and anchor a Merkle root per event instead.
- Emit events for every state change so the backend can index them.
- Not responsible for: payments, pricing, metadata storage, or identity.

**6.3 QR verification design (including anti-replay)**

The QR carries a short-lived signed payload, and the verifier trusts the signature, the clock, and a server-side used flag.

1. **Payload:** credential ID, event ID, issued-at timestamp, and a nonce.
2. **Signature:** the holder's wallet signs the payload. The QR refreshes every 30 seconds.
3. **Server check on scan:**
    - Signature recovers to the address that owns the credential on-chain (or in the indexer cache).
    - Timestamp is within a 60-second window (allowing for clock drift).
    - Credential is not revoked and matches the event being scanned.
    - Nonce has not been seen, and the credential has no existing check-in for this event.
4. **Atomic check-in:** the check-in write uses a unique constraint on (event ID, credential ID), so two scanners hitting at once cannot both succeed.
5. **Result:** green on first success, amber with the original check-in time on repeat, red with a reason otherwise.

This defeats screenshots (stale within one window), forwarded codes (the signature binds to the holder and time), and double check-in (unique constraint). It does not defeat a person physically handing their unlocked phone to a friend; that is a social problem handled by optional ID spot checks.

**6.4 Data split: on-chain vs off-chain**

| Data | Where | Why |
| --- | --- | --- |
| Credential ID, holder address, event ID, issuer, status (active or revoked) | On-chain | Verifiable ownership and revocation without trusting us |
| Hash of metadata | On-chain | Lets anyone detect tampering with off-chain data |
| Event name, date, venue, description, art | Off-chain (Postgres, cached via CDN) | Editable, cheap, no gas |
| User profile, email, wallet mapping | Off-chain (Postgres) | Personal data should not go on a public chain |
| Check-in records (primary) | Off-chain (Postgres) with unique constraint | Fast, atomic, works at the door |
| Check-in anchor (Merkle root per event) | On-chain (stretch) | Tamper-evident attendance without per-scan gas |
| Nonces and short-lived scan state | Off-chain (Redis or Postgres) | Ephemeral |

No email addresses, names, or other personal data are ever written on-chain.

## 7. Tech stack decision

We pick mainstream, well-documented tools that a team of five students can learn in a few weeks, and we avoid anything that needs custom infrastructure.

| Layer | Choice | Short justification |
| --- | --- | --- |
| Chain | An Ethereum L2 (Base or Optimism; final pick pending leadership input) | Cents-level fees, EVM tooling, strong wallet and paymaster support |
| Contracts | Solidity with Foundry, OpenZeppelin ERC-721 base | Standard, well-audited building blocks; fast local tests and fuzzing |
| Wallet and auth | Embedded-wallet provider (Privy, Dynamic, or Web3Auth; compare free tiers) plus email or Google login | Removes wallet friction; non-custodial |
| Gas sponsorship | Provider paymaster or a simple relayer | Users and admins never hold gas tokens |
| Frontend | Next.js (React, TypeScript), Tailwind, mobile-first PWA | One codebase for admin, attendee, and staff views; installable on phones |
| QR | Client-side QR generation, browser camera scanning library | No native app needed |
| Backend | Next.js API routes or a small Node (TypeScript) service | Same language as the frontend; fewer moving parts |
| Database | Postgres (Supabase or Neon) | Unique constraints give atomic check-in; hosted free tier |
| Chain indexing | Contract events read by a lightweight indexer job, or a hosted indexer | Fast reads of ownership without hitting the RPC on every scan |
| Hosting | Vercel for web, managed Postgres, RPC from Alchemy or a public endpoint | Free or low cost for a student pilot |
| Quality | GitHub Actions CI, Foundry tests, Playwright for core flows | Catches regressions before the pilot |

**Rules of thumb:** one language end to end (TypeScript plus Solidity), one chain, one wallet provider, and no custom infrastructure. We revisit choices only if a pilot blocker forces it.

## 8. Team roles & ownership

Five people, five clear owners, with each person also named as backup for one neighboring area so nothing stalls if someone is out during midterms.

| # | Role | Owner | Owns | Backup for |
| --- | --- | --- | --- | --- |
| 1 | Product and project lead | TBD | Scope, cut line, weekly priorities, pilot relationship with Boiler Blockchain, docs and demo | Design |
| 2 | Smart contract lead | TBD | Credential contract, tests, deployment scripts, revoke and reissue logic, security review checklist | Backend |
| 3 | Backend and data lead | TBD | API, Postgres schema, indexer, QR verification service, atomic check-in, attendance export | Contracts |
| 4 | Frontend lead | TBD | Admin dashboard, attendee ticket view and QR, staff scan page, PWA behavior on phones | Wallet and auth |
| 5 | Wallet, auth and QA lead | TBD | Embedded-wallet integration, gas sponsorship, login flows, end-to-end tests, pilot-day runbook and on-site support | Frontend |

**Working agreements**

- Weekly 45-minute sync plus a 15-minute async standup thread twice a week.
- One shared board; every task has one owner and a definition of done.
- Pull requests need one review from a different role; contract changes need two.
- The product lead holds the cut line and says no to scope additions without trading something out.
- Names are left as TBD for the team to fill in; swap owners freely, but keep all five areas covered.

## 9. 4-month roadmap

The roadmap runs four monthly phases from early October 2026 to late January 2027, each closed by a gate that must pass before the next phase starts.

[embedded content: roadmap · 4 phases, 4 gates]

Each gate is a yes or no check; if a gate fails, we cut stretch scope before we move the pilot date.

| Phase | Milestones | Definition of done (gate) | Lead roles |
| --- | --- | --- | --- |
| Month 1 (Oct 2026): Foundations | Contract skeleton on testnet. Embedded-wallet sign-in. Event creation screen. Pilot sponsor and dates agreed. Provider free-tier limits checked. | A test user signs in with email, an admin creates an event, and a credential mints to that user on testnet. Pilot dates confirmed in writing by a Boiler Blockchain officer. | Contracts, Wallet and auth, Product |
| Month 2 (Nov 2026): Core build | Issuance by CSV and claim link. Rotating signed QR. Staff scan page. Atomic check-in. Attendance log. Internal dry run (pilot stage 0). | The team completes the full flow on testnet with no manual database edits. A double scan returns amber, a QR older than 60 seconds returns red, and core flows have automated tests. | Backend, Frontend |
| Month 3 (Dec 2026): Harden and soft pilot | Revoke and reissue. Attendance CSV export. Peer security review and fixes. Deploy to the chosen L2. Soft pilot at a regular meeting (pilot stage 1). | No open high-severity review findings. Soft pilot check-ins match the sign-in sheet, with fewer than 3 support questions per 10 attendees. | Contracts, QA |
| Month 4 (Jan 2027): Full pilot and review | Full pilot event (pilot stage 2). Attendee and officer survey. Results memo. Handoff docs and runbook. Stretch items only if time remains. | 100 or more attendees, zero duplicate entries, median scan under 3 seconds, at least 90 percent claim without help. Memo delivered and next-semester decision made. | Product, whole team |

**Planning rules:** feature freeze at the start of Month 3 so finals do not collide with new work; stretch items are pulled in only after the Month 2 gate passes; winter break coverage is an open question for leadership (see section 12).

## 10. Pilot plan

Boiler Blockchain is the first real user, run in two steps: a low-stakes soft pilot at a regular meeting, then a full pilot at a larger event.

**Why Boiler Blockchain**

- The audience understands the technology and will give sharp, honest feedback.
- It has recurring meetings (cheap places to test) and larger events (a real stress test).
- Its officers can act as the admin persona, and its members are the attendee persona.
- If it works, the credentials are immediately useful for membership proof and attendance tracking.

**Pilot steps**

| Stage | What happens | Size | Pass criteria |
| --- | --- | --- | --- |
| 0. Internal dry run | Team plays all three roles with test credentials on testnet | 5 to 10 people | All must-have flows work end to end; no unexplained errors |
| 1. Soft pilot | Issue membership credentials to current Boiler Blockchain members; use QR check-in at one regular meeting alongside the old method (sign-in sheet) | 20 to 40 people | Check-in results match the sheet; fewer than 3 support questions per 10 attendees |
| 2. Full pilot | Ticketed event with QR check-in as the only method, backup list on hand | 100 or more people | Zero duplicate entries, median scan under 3 seconds, at least 90 percent of attendees claim without help |
| 3. Review | Survey attendees and officers; export attendance; write a short results memo | n/a | Decision on next semester scope and a second org to onboard |

**Setup and support**

- Agree on a pilot sponsor among the Boiler Blockchain officers and a date for each stage at least 3 weeks ahead.
- Send an attendee how-to (3 screenshots, 1 minute) with the claim link before the event.
- Staff the door with two scanners plus one team member as a floater, and keep a printed backup list for the first event only.
- Run a short pre-event checklist: staff links work, venue Wi-Fi or cellular tested, spare charged phones, claim link live.
- Collect metrics: claim rate, time to claim, scan time, error counts by type, and support questions.

**If Boiler Blockchain cannot host:** the fallback is another Purdue org with a recurring meeting (for example, a coding, entrepreneurship, or finance club), using the same stages.

## 11. Risks & mitigations

The biggest risks are door-day failures and scope creep, so most mitigations are about testing the check-in path early and holding the cut line.

| Risk | Likelihood | Impact | Mitigation | Owner |
| --- | --- | --- | --- | --- |
| QR screenshot or replay | High | High | 30-second rotating signed QR, 60-second server window, nonce tracking, signature bound to the holder | Backend |
| Double check-in or two scanners racing | Medium | High | Unique constraint on (event, credential) in the database; amber screen shows the first check-in time | Backend |
| Wallet friction (attendees stuck at login or claim) | High | High | Embedded wallets with email or Google sign-in; claim page tested with non-crypto users; 1-minute how-to; floater on pilot day | Wallet and auth |
| Gas costs or sponsor funds run out | Low | Medium | Use an L2, cap mints per event, set a budget alert, batch check-in anchoring, keep a small gas reserve | Contracts |
| Poor venue connectivity at the door | Medium | High | Lightweight scan payloads, tested on cellular, printed backup list for first event; cached allowlist as stretch | Frontend |
| Lost access or wrong recipient | Medium | Medium | Admin revoke and reissue flow; documented procedure | Contracts |
| Third-party provider outage or free-tier limits (wallet, RPC, database) | Medium | High | Check limits in Month 1, set alerts, keep a second RPC endpoint configured, know the manual fallback | Wallet and auth |
| Contract bug or exploit | Low | High | Small contract surface, OpenZeppelin base, fuzz and invariant tests, two-person review, testnet soak, no funds held by the contract | Contracts |
| Privacy concern (emails or names tied to wallets) | Medium | Medium | No personal data on-chain; short privacy note; data deletion path off-chain | Product |
| Scope creep into marketplace, payments, or token features | High | Medium | Written out-of-scope list; product lead owns the cut line; any addition must trade out an equal item | Product |
| Team capacity dips during midterms, finals, or break | High | Medium | Backups named per role; buffer weeks in the roadmap; cut stretch items first | Product |
| Low adoption (org does not host or attendees ignore it) | Medium | High | Secure the pilot sponsor and dates in Month 1; keep a fallback org | Product |

## 12. Open questions for internal-dev leadership

These are the decisions we need from leadership in the first two weeks, because they unblock contracts, auth, and the pilot.

**Scope and ownership**

- [ ]  Is the target a Boiler Blockchain internal tool, a product other Purdue orgs can adopt, or both? This changes how much admin self-serve we build.
- [ ]  Who owns the product after this semester (maintenance, hosting bills, on-call on event days)?
- [ ]  Do we have a named Boiler Blockchain officer who will commit to the pilot dates in Month 3 and Month 4?

**Technical and budget**

- [ ]  Which L2 do we standardize on (Base, Optimism, or another), and is mainnet acceptable for the pilot or should we stay on testnet?
- [ ]  Is there a budget for gas sponsorship, the wallet provider tier, and hosting? If not, what is the maximum free-tier plan we should design around?
- [ ]  Which wallet provider is approved (Privy, Dynamic, Web3Auth, or another), considering cost, data handling, and campus policy?
- [ ]  Do we need an outside security review of the contract before mainnet, or is peer review enough for a student pilot?
- [ ]  Are we locked to ERC-721 with a transfer lock, or can we use a soulbound standard like ERC-5192?

**Policy and compliance**

- [ ]  Does Purdue or the Student Org office have rules about collecting student emails or attendance data, and do we need an approval before the pilot?
- [ ]  Is a blockchain-based credential acceptable for official org membership records, or only as a supplement to the existing roster?
- [ ]  Any restrictions on running a crypto-adjacent product under the Boiler Blockchain or Purdue name (branding, liability, insurance)?

**Schedule**

- [ ]  How do we handle winter break in the roadmap: pause, reduced coverage, or shift Month 4 to the first weeks of spring semester?
- [ ]  What is the earliest event date Boiler Blockchain can offer for the full pilot, and can we count on a venue with reliable connectivity?

[Front End - Logic](Web3%20Event%20Ticketing%20&%20Membership%20Platform%20Product/Front%20End%20-%20Logic%200215874326fc834e90c701d015ba0842.md)

[Backend](Web3%20Event%20Ticketing%20&%20Membership%20Platform%20Product/Backend%20a905874326fc820e9ec3817092a2dfc7.md)

[Web3 - Tasks as of now](Web3%20Event%20Ticketing%20&%20Membership%20Platform%20Product/Web3%20-%20Tasks%20as%20of%20now%20ea45874326fc838ea2ca019c828e6052.md)

[Plan - Yuvraj](Web3%20Event%20Ticketing%20&%20Membership%20Platform%20Product/Plan%20-%20Yuvraj%206385874326fc82718aa4817b7ec08951.md)