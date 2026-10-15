import { useSyncExternalStore } from 'react'

// Hash routing: works on any static host with no server rewrites.
// ponytail: swap for react-router when routes need params or loaders.
const subscribe = (cb: () => void) => {
  addEventListener('hashchange', cb)
  return () => removeEventListener('hashchange', cb)
}
const getRoute = () => location.hash.replace(/^#/, '') || '/'

export const useRoute = () => useSyncExternalStore(subscribe, getRoute)
export const navigate = (to: string) => { location.hash = to }
