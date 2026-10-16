// Print a door-staff scan link for one event.
// Usage: STAFF_LINK_SECRET=... node scripts/staff-link.ts <eventId> [hours=12] [appUrl=http://localhost:5173]
// ponytail: CLI until the admin dashboard (build step 4) issues these.
import { makeStaffToken } from '../supabase/functions/_shared/staff.ts'

const [eventId, hours = '12', appUrl = 'http://localhost:5173'] = process.argv.slice(2)
const secret = process.env.STAFF_LINK_SECRET
if (!eventId || !secret) {
  console.error('Usage: STAFF_LINK_SECRET=... node scripts/staff-link.ts <eventId> [hours] [appUrl]')
  process.exit(1)
}
const expires = Math.floor(Date.now() / 1000) + Number(hours) * 3600
console.log(`${appUrl}/#/scan?t=${await makeStaffToken(eventId, expires, secret)}`)
