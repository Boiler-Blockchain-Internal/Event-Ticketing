import { useEffect, useMemo, useState } from 'react'
import qrcode from 'qrcode-generator'
import { REFRESH } from '../../../supabase/functions/_shared/pass.ts'

// Ticks a countdown and bumps `version` every REFRESH seconds, like the real rotating pass.
export function useRotation() {
  const [left, setLeft] = useState(REFRESH)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setLeft(s => {
      if (s > 1) return s - 1
      setVersion(v => v + 1)
      return REFRESH
    }), 1000)
    return () => clearInterval(id)
  }, [])
  return { left, version, label: `0:${String(left).padStart(2, '0')}` }
}

// Real modules for `value`; without it, a decorative QR (finder patterns plus random modules) for marketing.
function encode(value: string): { n: number; grid: boolean[] } {
  const qr = qrcode(0, 'M')
  qr.addData(value)
  qr.make()
  const n = qr.getModuleCount()
  return { n, grid: Array.from({ length: n * n }, (_, i) => qr.isDark(Math.floor(i / n), i % n)) }
}

function cells(n: number): boolean[] {
  const corners = [[0, 0], [0, n - 7], [n - 7, 0]]
  const nearFinder = (r: number, c: number) => (r < 8 && c < 8) || (r < 8 && c > n - 9) || (r > n - 9 && c < 8)
  const finder = (r: number, c: number) => {
    for (const [fr, fc] of corners) {
      const y = r - fr, x = c - fc
      if (y >= 0 && x >= 0 && y <= 6 && x <= 6) return y === 0 || y === 6 || x === 0 || x === 6 || (y > 1 && y < 5 && x > 1 && x < 5)
    }
    return false // quiet zone around finders
  }
  return Array.from({ length: n * n }, (_, i) => {
    const r = Math.floor(i / n), c = i % n
    return nearFinder(r, c) ? finder(r, c) : Math.random() > 0.55
  })
}

export function Qr({ size, version = 0, label, value }: { size: number; version?: number; label?: string; value?: string }) {
  const { n, grid } = useMemo(() => value ? encode(value) : { n: size, grid: cells(size) }, [size, version, value])
  return (
    <div className="qr" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={!label}>
      {grid.map((on, i) => <i key={i} className={on ? 'on' : undefined} />)}
    </div>
  )
}
