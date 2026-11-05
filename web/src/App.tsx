import { useEffect } from 'react'
import { useRoute } from './router'
import { Landing } from './pages/Landing'
import { Redeem } from './pages/Redeem'
import { Tickets } from './pages/Tickets'
import { Scan } from './pages/Scan'
import { Admin } from './pages/Admin'

const pages: Record<string, () => React.JSX.Element> = {
  '/': Landing,
  '/redeem': Redeem,
  '/tickets': Tickets,
  '/scan': Scan,
  '/admin': Admin,
}

export default function App() {
  const route = useRoute()
  useEffect(() => { window.scrollTo(0, 0) }, [route])
  const Page = pages[route] ?? Landing
  return <Page key={route} />
}
