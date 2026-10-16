import { useSyncExternalStore } from 'react'

// Hash routing: works on any static host with no server rewrites.
// ponytail: swap for react-router when routes need params or loaders.
const subscribe = (cb: () => void) => {
  addEventListener('hashchange', cb)
  return () => removeEventListener('hashchange', cb)
}
const getRoute = () => location.hash.replace(/^#/, '').split('?')[0] || '/'
export const routeParam = (name: string) => new URLSearchParams(location.hash.split('?')[1]).get(name)

export const useRoute = () => useSyncExternalStore(subscribe, getRoute)
export const navigate = (to: string) => { location.hash = to }
