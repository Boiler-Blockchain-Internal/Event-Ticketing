import { useEffect, useRef, useState } from 'react'
import { event, myTicket } from '../data'
import { routeParam } from '../router'
import { verify, type ScanResult } from '../verify'
import type { EventSummary } from '../../../supabase/functions/_shared/supabase.ts'

// Demo codes cycled by "Simulate scan" until real passes exist: admit, admit, repeat, revoked, wrong event.
const demoCodes = ['#0142', '#0141', '#0142', '#0131'].map(t => `passmark:${event.id}:${t}`).concat('passmark:other:#0137')

// Live mode: a staff link (#/scan?t=...) plus a configured Supabase project. Otherwise the local demo.
const API = import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan` : null

type Detector = { detect(src: HTMLVideoElement): Promise<{ rawValue: string }[]> }
declare global { interface Window { BarcodeDetector?: new (o: { formats: string[] }) => Detector } }

const clock = (d = new Date()) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

async function post(token: string, code?: string): Promise<{ event: EventSummary | null; result: ScanResult | null }> {
  const res = await fetch(API!, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, code }) })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? 'Check-in service hiccup. Scan again.')
  return body
}

export function Scan() {
  const token = useRef(routeParam('t')).current
  const live = !!(API && token)
  const checkins = useRef(new Map<string, string>())
  const [head, setHead] = useState({ name: event.name, capacity: event.capacity as number | null })
  const [count, setCount] = useState(live ? 0 : event.claimed)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [camera, setCamera] = useState(false)
  const demo = useRef(0)
  const video = useRef<HTMLVideoElement>(null)
  const busy = useRef(false) // ignore frames while a request is in flight or a result is on screen

  const showEvent = (e: EventSummary | null) => {
    if (!e) return
    setHead({ name: e.name, capacity: e.capacity })
    setCount(e.checkedIn)
  }

  useEffect(() => {
    if (live) post(token!).then(r => showEvent(r.event), e => setLinkError(e instanceof TypeError ? 'No connection · reload to retry' : e.message))
  }, [])

  const handle = async (code: string) => {
    busy.current = true
    let r: ScanResult
    if (live) {
      try {
        const res = await post(token!, code)
        showEvent(res.event)
        r = res.result!
        if (r.kind === 'repeat') r = { ...r, at: clock(new Date(r.at)) }
      } catch (e) {
        r = { kind: 'invalid', reason: e instanceof TypeError ? 'No connection · scan again' : (e as Error).message }
      }
    } else {
      r = verify(code, checkins.current, clock())
      if (r.kind === 'admit') setCount(c => c + 1)
    }
    setResult(r)
    navigator.vibrate?.(r.kind === 'admit' ? 80 : [60, 60, 60])
  }

  const next = () => { setResult(null); busy.current = false }

  // Rear camera + native BarcodeDetector where the browser has it (Chrome on Android/macOS).
  useEffect(() => {
    let stream: MediaStream | undefined
    let timer: number | undefined
    let gone = false
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } }).then(s => {
      stream = s
      if (gone || !video.current) return s.getTracks().forEach(t => t.stop())
      video.current.srcObject = s
      setCamera(true)
      if (!window.BarcodeDetector) return
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      timer = window.setInterval(async () => {
        if (busy.current || !video.current) return
        const [hit] = await detector.detect(video.current).catch(() => [])
        if (hit) handle(hit.rawValue)
      }, 400)
    }).catch(() => setCamera(false))
    return () => { gone = true; clearInterval(timer); stream?.getTracks().forEach(t => t.stop()) }
  }, [])

  const tone = result?.kind === 'admit' ? 'green' : result?.kind === 'repeat' ? 'amber' : 'red'

  return (
    <main className="app scan">
      <header className="scan-head">
        <a href="#/" className="icon-btn" aria-label="Exit check-in">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
        </a>
        <div>
          <p className="eyebrow muted-eyebrow">Staff check-in</p>
          <h1>{head.name}</h1>
        </div>
        <p className="scan-count"><b>{count}</b>{head.capacity != null && ` / ${head.capacity}`}<small>checked in</small></p>
      </header>

      <section className="viewfinder">
        <video ref={video} autoPlay playsInline muted hidden={!camera} />
        <span className="corners" aria-hidden="true" />
        <p role={linkError ? 'alert' : undefined}>{linkError ?? (camera ? "Point the camera at the attendee's code" : live ? 'Camera unavailable — allow camera access and reload' : 'Camera unavailable — use Simulate scan')}</p>
      </section>

      {result ? (
        <section className={`scan-result ${tone}`} aria-live="assertive">
          <div className="scan-result-head">
            <span className="scan-icon" aria-hidden="true">
              {result.kind === 'admit'
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>
                : result.kind === 'repeat'
                  ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 7v6M12 17h.01" /></svg>
                  : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 6l12 12M18 6L6 18" /></svg>}
            </span>
            <div>
              <h2>{result.kind === 'admit' ? 'Admit' : result.kind === 'repeat' ? 'Already checked in' : 'Do not admit'}</h2>
              <p>{result.kind === 'admit' ? 'Valid ticket · first entry' : result.kind === 'repeat' ? `First scanned at ${result.at}` : result.reason}</p>
            </div>
          </div>
          {result.ticket && (
            <dl>
              <div><dt>Pass</dt><dd>Ticket {result.ticket}</dd></div>
              {result.holder && <div><dt>Holder</dt><dd>{result.holder}</dd></div>}
            </dl>
          )}
        </section>
      ) : !live && (
        <button className="btn btn-ghost btn-block" onClick={() => handle(demoCodes[demo.current++ % demoCodes.length])}>
          Simulate scan
        </button>
      )}

      <button className="btn btn-light btn-block scan-next" onClick={next} disabled={!result}>Scan next</button>
      {!live && <p className="note mono">Demo: try pass {myTicket.id} twice to see a repeat scan.</p>}
    </main>
  )
}
