// RFC 4180 CSV. Attendee names are typed by attendees, so a cell starting with = + - @ (or tab/CR)
// gets a leading ' to stop Excel/Sheets from running it as a formula.
const cell = (v: string | null | undefined) => {
  let s = v ?? ''
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export const toCsv = (rows: (string | null | undefined)[][]) => rows.map(r => r.map(cell).join(',')).join('\r\n') + '\r\n'

// Native download: a Blob URL on a temporary link, no library.
export function downloadCsv(filename: string, rows: (string | null | undefined)[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
