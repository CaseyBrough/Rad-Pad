import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import '../styles/globals.css'
import { supabase } from '../lib/supabase'

// /login has its own form, no gate needed.
// /admin-rp2026 keeps its existing obscure-URL-only protection - it's Casey's
// own panel, not member content, and should never depend on member auth.
const PUBLIC_ROUTES = ['/login']
const UNGATED_ROUTES = ['/admin-rp2026']

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [authState, setAuthState] = useState('checking') // checking | ok | denied

  const needsGate = !PUBLIC_ROUTES.includes(router.pathname) && !UNGATED_ROUTES.includes(router.pathname)

  useEffect(() => {
    if (!needsGate) {
      setAuthState('ok')
      return
    }

    let active = true
    setAuthState('checking')

    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        if (active) {
          setAuthState('denied')
          router.replace('/login')
        }
        return
      }
      const email = session.user.email?.toLowerCase()
      const { data: match } = await supabase.from('authorized_emails').select('email').eq('email', email).maybeSingle()
      if (!match) {
        await supabase.auth.signOut()
        if (active) {
          setAuthState('denied')
          router.replace('/login')
        }
        return
      }
      if (active) setAuthState('ok')
    }

    check()

    const { data: listener } = supabase.auth.onAuthStateChange(() => check())
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [router.pathname])

  if (needsGate && authState !== 'ok') {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0A0E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D8D4E8' }}>
          {authState === 'checking' ? 'Checking access...' : 'Redirecting...'}
        </div>
      </div>
    )
  }

  return <Component {...pageProps} />
}
