// Mock data until the backend and contract exist.
export const event = {
  id: 'bb-fgm',
  org: 'Boiler Blockchain',
  orgInitials: 'BB',
  name: 'Fall General Meeting',
  date: 'Thu, Nov 12 · 7:00 PM',
  shortDate: 'Thu, Nov 12',
  venue: 'Lawson B155',
  doors: '6:45 – 7:30 PM',
  capacity: 120,
  claimed: 83,
  checkedIn: 61,
}

export type Attendee = { name: string; revoked?: string }

export const attendees: Record<string, Attendee> = {
  '#0142': { name: 'Priya S.' },
  '#0141': { name: 'Marcus L.' },
  '#0139': { name: 'Aisha R.' },
  '#0137': { name: 'Daniel O.' },
  '#0131': { name: 'Ethan W.', revoked: '#0140' },
}

export const myTicket = { id: '#0142', holder: 'Priya S.', initials: 'PS' }

export const membership = { label: 'Member · Fall 2026', org: 'Boiler Blockchain', status: 'active' }

export const history = [
  { name: 'Spring Hack Night', org: 'Boiler Blockchain', date: 'Apr 18, 2026', id: '#0097' },
  { name: 'Intro to Solidity Workshop', org: 'Boiler Blockchain', date: 'Feb 27, 2026', id: '#0061' },
  { name: 'Spring General Meeting', org: 'Boiler Blockchain', date: 'Jan 22, 2026', id: '#0024' },
]
