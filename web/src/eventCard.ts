import type { EventRecord } from '../../supabase/functions/_shared/supabase.ts'

// What the claim page shows. `null` rows are hidden rather than filled with made-up values.
export type EventCard = {
  name: string; org: string; orgInitials: string; kind: string
  date: string | null; venue: string | null; doors: string | null; spots: string | null
}

export const day = (iso: string | null) => iso ? new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : null
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
export const initials = (s: string) => s.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')

// `e` is the events GET response's `event`; `claimed` is its active pass count.
export function eventCard(e: EventRecord & { org?: string | null }, claimed?: number | null): EventCard {
  const org = e.org ?? ''
  const doors = e.doorsOpenAt && e.doorsCloseAt ? `${time(e.doorsOpenAt)} – ${time(e.doorsCloseAt)}`
    : e.doorsOpenAt ? `From ${time(e.doorsOpenAt)}` : null
  return {
    name: e.name, org, orgInitials: initials(org || e.name),
    kind: e.kind === 'membership' ? 'Member card' : 'Event ticket',
    date: e.startsAt ? `${day(e.startsAt)} · ${time(e.startsAt)}` : null,
    venue: e.venue,
    doors,
    spots: e.capacity != null && claimed != null ? `${Math.max(0, e.capacity - claimed)} of ${e.capacity}` : null,
  }
}
