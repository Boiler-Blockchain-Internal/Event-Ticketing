export function Logo({ href = '#/' }: { href?: string }) {
  return (
    <a href={href} className="logo" aria-label="Passmark home">
      <span className="logo-mark">
        <svg viewBox="0 0 16 16" fill="none" stroke="#0b2a18" strokeWidth="1.8"><rect x="2" y="3.5" width="12" height="9" rx="2" /><path d="M6 3.5v9" /></svg>
      </span>
      Passmark
    </a>
  )
}

export const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
)

export const Shield = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg>
)
