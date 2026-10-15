import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react'
import { HeroTicket } from '../components/HeroTicket'
import { Qr } from '../components/Qr'
import { Arrow, Logo, Shield } from '../components/Logo'

const i = (n: number) => ({ '--i': n }) as CSSProperties

// In-page anchors would clash with hash routing, so scroll instead of changing the hash.
const jump = (e: MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault()
  document.getElementById(e.currentTarget.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
}

const problems = [
  ['Screenshots get copied', "Paper tickets and screenshots are trivial to duplicate, and nobody at the door can tell which copy is real."],
  ['Vendors own your data', 'Eventbrite or Google Forms plus a spreadsheet charge fees, lock data inside one vendor and give attendees nothing they own.'],
  ['Rosters vanish at turnover', "Membership lives in one officer's spreadsheet. It's lost every election and can't be verified by a sponsor or venue."],
  ['Attendance goes unrecorded', "Without history, orgs can't show sponsors or the university real engagement numbers."],
]

const steps = [
  ['Signed payload', "The code carries the credential ID, event ID, a timestamp and a nonce, signed by the holder's wallet."],
  ['Refreshes every 30 seconds', 'The server accepts a 60-second window to allow for clock drift. Anything older is red.'],
  ['Ownership and event match', "The signature must recover to the credential's owner, the credential must be active, and it must belong to this event."],
  ['Atomic check-in', "A unique constraint on event and credential means two scanners hitting at once can't both succeed. Repeat scans show amber with the first check-in time."],
]

const stages = [
  ['Stage 0 · Nov 2026', 'Internal dry run', 'The team plays admin, attendee and staff on testnet with test credentials.', '5–10 people'],
  ['Stage 1 · Dec 2026', 'Soft pilot', 'Member cards issued to current members, scanned alongside the old sign-in sheet.', '20–40 people'],
  ['Stage 2 · Jan 2027', 'Full pilot', 'QR check-in as the only method. Zero duplicates, median scan under 3 seconds.', '100+ people'],
  ['Stage 3 · Jan 2027', 'Review', 'Survey attendees and officers, export attendance and pick the next org to onboard.', 'Results memo'],
]

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
    }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' })
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(scrollY > 8)
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  return scrolled
}

export function Landing() {
  useReveal()
  const scrolled = useScrolled()

  return (
    <>
      <header className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="wrap">
          <Logo />
          <nav className="nav-links" aria-label="Primary">
            <a href="#how" onClick={jump}>How it works</a>
            <a href="#security" onClick={jump}>Security</a>
            <a href="#/tickets">My tickets</a>
            <a href="#/scan">Staff scan</a>
          </nav>
          <a href="#/redeem" className="btn btn-primary btn-sm">Claim a pass</a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <p className="eyebrow intro" style={i(0)}>Tickets · Membership · Attendance</p>
              <h1 className="intro" style={i(1)}>Tickets that can't be faked. <em>No wallet required.</em></h1>
              <p className="lead intro" style={i(2)}>Passmark gives student orgs verifiable tickets and member cards that are cheap to issue, hard to fake and fast to check at the door. Attendees sign in with their school email and never see a seed phrase.</p>
              <div className="hero-ctas intro" style={i(3)}>
                <a href="#/redeem" className="btn btn-primary">Claim your pass <Arrow /></a>
                <a href="#how" onClick={jump} className="btn btn-ghost">See how it works</a>
              </div>
              <p className="hero-note intro" style={i(4)}>
                <Shield /> No wallet or crypto needed. We set up a secure pass when you sign in.
              </p>
            </div>
            <HeroTicket />
          </div>
        </section>

        <div className="stats">
          <div className="wrap">
            <div className="stat reveal" style={i(0)}><b>&lt;3s</b><span>median scan at the door</span></div>
            <div className="stat reveal" style={i(1)}><b>30s</b><span>QR refresh, stale screenshots</span></div>
            <div className="stat reveal" style={i(2)}><b>0</b><span>duplicate entries, enforced in the database</span></div>
            <div className="stat reveal" style={i(3)}><b>$0</b><span>gas for attendees and admins</span></div>
          </div>
        </div>

        <section className="block">
          <div className="wrap">
            <div className="head reveal">
              <p className="eyebrow">The problem</p>
              <h2>Paper tickets, spreadsheets and screenshots don't hold up.</h2>
              <p className="lead">Student orgs need proof of entry and membership that is cheap, hard to fake and quick to check. Today's tools give you one of the three at best.</p>
            </div>
            <div className="problems">
              {problems.map(([title, body], n) => (
                <div className="problem reveal" style={i(n)} key={title}>
                  <span className="num">0{n + 1}</span><h3>{title}</h3><p className="muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="block" id="how">
          <div className="wrap">
            <div className="head reveal">
              <p className="eyebrow">How it works</p>
              <h2>Three roles. Not one of them touches a blockchain.</h2>
              <p className="lead">The chain proves who issued what to whom. Everyone else just signs in, shows a code, or scans one.</p>
            </div>
            <div className="roles">
              <article className="role reveal" style={i(0)}>
                <p className="eyebrow">Admin</p>
                <h3>Create and issue in five minutes</h3>
                <p>Officers pick an event or membership tier, set a cap, and share a claim link or upload a CSV of emails.</p>
                <div className="preview" aria-hidden="true">
                  <div className="mini-stats">
                    <div><span>ISSUED</span><b>120</b></div>
                    <div><span>CLAIMED</span><b>83</b></div>
                    <div><span>IN</span><b>61</b></div>
                  </div>
                  <div className="row"><span>Priya S. <span className="mono muted">#0142</span></span><span className="pill ok">Checked in</span></div>
                  <div className="row"><span>Aisha R. <span className="mono muted">#0139</span></span><span className="pill claimed">Claimed</span></div>
                  <div className="row"><span>Ethan W. <span className="mono muted">#0131</span></span><span className="pill revoked">Revoked</span></div>
                </div>
                <ul>
                  <li>Capped claim links and CSV issuance</li>
                  <li>Revoke and reissue for lost access</li>
                  <li>Attendance export for sponsors</li>
                </ul>
                <p className="never"><b>Never:</b> deploy contracts, hold gas or manage keys.</p>
              </article>

              <article className="role reveal" style={i(1)}>
                <p className="eyebrow">Attendee</p>
                <h3>Claim with email, show a code</h3>
                <p>Sign in with Google or a school email. A wallet is created silently in the background and the pass lands in your account.</p>
                <div className="preview" aria-hidden="true">
                  <div className="mini-ticket">
                    <Qr size={15} />
                    <div><small>MEMBER · FALL 2026</small><b>Boiler Blockchain</b><span className="pill ok" style={{ background: 'rgba(61,219,132,.18)', color: '#1a8a4e' }}>active</span></div>
                  </div>
                </div>
                <ul>
                  <li>Rotating QR, refreshed every 30 seconds</li>
                  <li>Membership that survives officer turnover</li>
                  <li>A personal record of events attended</li>
                </ul>
                <p className="never"><b>Never:</b> install an extension or write down a seed phrase.</p>
                <a href="#/tickets" className="btn btn-ghost btn-sm role-link">Open my tickets <Arrow /></a>
              </article>

              <article className="role reveal" style={i(2)}>
                <p className="eyebrow">Door staff</p>
                <h3>Point, scan, admit</h3>
                <p>Volunteers open a scoped staff link on their phone. One scan gives a clear answer in about a second, even in a loud room.</p>
                <div className="preview results" aria-hidden="true">
                  <div className="result green">Admit <small>first entry</small></div>
                  <div className="result amber">Already in <small>at 7:02 PM</small></div>
                  <div className="result red">Invalid <small>wrong event</small></div>
                </div>
                <ul>
                  <li>Green, amber or red, with a plain reason</li>
                  <li>Scan-only link, no admin powers</li>
                  <li>Two scanners can't race a double entry</li>
                </ul>
                <p className="never"><b>Never:</b> understand blockchain or log in as an admin.</p>
                <a href="#/scan" className="btn btn-ghost btn-sm role-link">Open the scanner <Arrow /></a>
              </article>
            </div>
          </div>
        </section>

        <section className="block" id="security">
          <div className="wrap security">
            <div className="head reveal">
              <p className="eyebrow">Anti-replay</p>
              <h2>A screenshot goes stale before it reaches the door.</h2>
              <p className="lead">Every QR is a short-lived payload signed by the holder's wallet. The verifier trusts the signature, the clock and a single-use flag.</p>
              <div className="defeats"><span>Screenshots</span><span>Forwarded codes</span><span>Double check-in</span></div>
            </div>
            <ol className="steps">
              {steps.map(([title, body]) => (
                <li className="reveal" key={title}><div><h3>{title}</h3><p>{body}</p></div></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="block" id="data">
          <div className="wrap">
            <div className="head reveal">
              <p className="eyebrow">Credential model</p>
              <h2>Minimal proof on-chain. Everything else stays editable.</h2>
              <p className="lead">Each pass is a non-transferable token on an Ethereum L2. The chain anchors ownership; our database holds the details, with a hash that makes tampering detectable.</p>
            </div>
            <div className="split">
              <div className="split-col chain reveal" style={i(0)}>
                <p className="eyebrow">On-chain</p>
                <h3>Verifiable without trusting us</h3>
                <dl>
                  <div><dt>Credential, holder, event, issuer</dt><dd>Ownership and revocation anyone can check.</dd></div>
                  <div><dt>Status: active or revoked</dt><dd>Admins can revoke and reissue, so nobody is stuck with a dead pass.</dd></div>
                  <div><dt>Metadata hash</dt><dd>Lets anyone detect changes to the off-chain record.</dd></div>
                </dl>
              </div>
              <div className="split-col reveal" style={i(1)}>
                <p className="eyebrow" style={{ color: 'var(--text-muted)' }}>Off-chain</p>
                <h3>Fast, private and fixable</h3>
                <dl>
                  <div><dt>Event name, date, venue, art</dt><dd>Fix a typo or move rooms without a remint or any gas.</dd></div>
                  <div><dt>Profiles and wallet mapping</dt><dd>Personal data belongs in a database, not a public ledger.</dd></div>
                  <div><dt>Check-in records</dt><dd>Atomic writes that work at the door, anchored per event.</dd></div>
                </dl>
              </div>
            </div>
            <p className="privacy reveal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
              No email addresses, names or other personal data are ever written on-chain.
            </p>
          </div>
        </section>

        <section className="block" id="pilot">
          <div className="wrap">
            <div className="head reveal">
              <p className="eyebrow">Pilot · Boiler Blockchain</p>
              <h2>Proven at a real door before anywhere else.</h2>
              <p className="lead">We start with an audience that understands the tech and will tell us the truth, then scale up one stage at a time.</p>
            </div>
            <div className="timeline">
              {stages.map(([when, title, body, size], n) => (
                <div className="stage-card reveal" style={i(n)} key={title}>
                  <span className="when">{when}</span><h3>{title}</h3><p>{body}</p><span className="size">{size}</span>
                </div>
              ))}
            </div>
            <div className="scope reveal" aria-label="Out of scope">
              <span>Resale marketplace</span><span>Payments</span><span>Royalties</span><span>Speculative tokens</span><span>Multi-chain</span>
            </div>
          </div>
        </section>

        <section className="block" id="start" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="cta reveal">
              <p className="eyebrow">For student orgs</p>
              <h2>Run your next event on Passmark.</h2>
              <p>Create an event, share a claim link and check people in with a phone. Free for the pilot semester.</p>
              <a href="mailto:hello@passmark.app" className="btn btn-dark">Request early access <Arrow /></a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <span style={{ color: 'var(--text)' }}><Logo /></span>
          <span className="mono">Built with Boiler Blockchain · Purdue</span>
        </div>
      </footer>
    </>
  )
}
