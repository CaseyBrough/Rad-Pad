import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import '../styles/globals.css'
import '../styles/admin.css'
import { supabase } from '../lib/supabase'
import { hasStoredSession, noteGateExit, withTimeout, consumeExplicitLogout } from '../lib/gate'

// /login has its own form, no gate needed.
// /admin-rp2026 keeps its existing obscure-URL-only protection - it's Casey's
// own panel, not member content, and should never depend on member auth.
const PUBLIC_ROUTES = ['/login']
const UNGATED_ROUTES = ['/admin-rp2026']

const SESSION_TIMEOUT_MS = 12000
const LOOKUP_TIMEOUT_MS = 10000
const ROUNDS = 3

// One pass of the access check. Resolves to:
//   { status: 'ok' }
//   { status: 'login', reason }   - we KNOW this visitor is not signed in / not approved
//   { status: 'retry', reason }   - we could not find out (slow network, server hiccup)
// A hiccup is never treated as "not signed in": that is what used to bounce
// members to /login on a refresh and, worse, signed them out for good.
async function verify() {
  let session
  try {
    const res = await withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS)
    if (res.error) {
      const transient = res.error.name === 'AuthRetryableFetchError' || res.error.status === 0 || res.error.status === 429 || res.error.status >= 500
      return { status: transient ? 'retry' : 'login', reason: transient ? 'session-network' : 'session-invalid' }
    }
    session = res.data.session
  } catch (e) {
    return { status: 'retry', reason: e?.message === 'timeout' ? 'session-timeout' : 'session-exception' }
  }
  if (!session) return { status: 'login', reason: 'no-session' }

  const email = session.user.email?.toLowerCase()
  try {
    const { data: match, error } = await withTimeout(
      supabase.from('authorized_emails').select('email').eq('email', email).maybeSingle(),
      LOOKUP_TIMEOUT_MS,
    )
    if (error) return { status: 'retry', reason: 'lookup-error' }
    if (!match) {
      await supabase.auth.signOut()
      return { status: 'login', reason: 'not-approved' }
    }
    return { status: 'ok' }
  } catch (e) {
    return { status: 'retry', reason: e?.message === 'timeout' ? 'lookup-timeout' : 'lookup-exception' }
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

const SCREEN = { minHeight: '100vh', background: '#0D0A0E', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }
const MONO = { fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D8D4E8' }
const BTN = { background: 'none', border: '1px solid rgba(240,235,248,0.25)', borderRadius: 8, padding: '10px 18px', color: '#F8F5FF', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [authState, setAuthState] = useState('checking') // checking | ok | denied | trouble
  const authRef = useRef('checking')
  const [attempt, setAttempt] = useState(0)

  const needsGate = !PUBLIC_ROUTES.includes(router.pathname) && !UNGATED_ROUTES.includes(router.pathname)

  function set(state) { authRef.current = state; setAuthState(state) }

  useEffect(() => {
    if (!needsGate) {
      // Public pages render regardless. Reset to "checking" so the next gated
      // page always verifies from scratch before showing anything.
      set('checking')
      return
    }

    let active = true
    let running = false
    const hadSession = hasStoredSession()
    // Moving between pages of the hub while already verified doesn't blank the
    // screen; a fresh load (or a retry) always starts from "checking".
    if (authRef.current !== 'ok') set('checking')

    function toLogin(reason) {
      noteGateExit(reason, router.pathname, hadSession)
      set('denied')
      router.replace('/login')
    }

    async function check(silent) {
      if (running) return
      running = true
      try {
        let result = { status: 'retry', reason: 'none' }
        for (let round = 0; round < ROUNDS && active; round++) {
          result = await verify()
          if (result.status !== 'retry') break
          if (silent) break
          await sleep(1500 * (round + 1))
        }
        if (!active) return
        if (result.status === 'ok') set('ok')
        else if (result.status === 'login') toLogin(result.reason)
        else if (!silent) {
          // Still can't tell. Nobody who was never signed in gets here
          // (they'd have no stored session): send them to /login. Everyone
          // else keeps their session and gets a retry button.
          if (hasStoredSession()) { noteGateExit(result.reason, router.pathname, true, 'trouble'); set('trouble') }
          else toLogin(result.reason)
        }
        // silent + retry: leave the page as it is.
      } finally {
        running = false
      }
    }

    check(authRef.current === 'ok')

    // Supabase fires this callback immediately on every subscribe, while
    // still holding an internal lock - calling supabase.auth.* methods
    // (like verify() does via getSession()) directly inside it can deadlock.
    // Deferring with setTimeout escapes that synchronous context.
    const { data: listener } = supabase.auth.onAuthStateChange(event => {
      setTimeout(() => {
        if (!active) return
        if (event === 'SIGNED_OUT') toLogin(consumeExplicitLogout() ? 'logout' : 'signed-out')
        else check(true)
      }, 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [router.pathname, attempt])

  if (needsGate && authState !== 'ok') {
    if (authState === 'trouble') {
      return (
        <div style={SCREEN}>
          <div style={{ maxWidth: 360 }}>
            <div style={{ ...MONO, marginBottom: 14 }}>Having trouble confirming your sign-in</div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.6, color: '#D8D4E8', marginBottom: 22 }}>
              Your connection may be slow. You haven’t been signed out.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" style={BTN} onClick={() => { set('checking'); setAttempt(a => a + 1) }}>Try again</button>
              <button type="button" style={{ ...BTN, borderColor: 'rgba(240,235,248,0.12)', color: '#D8D4E8' }} onClick={() => router.replace('/login')}>Sign in again</button>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div style={SCREEN}>
        <div style={MONO}>{authState === 'checking' ? 'Checking access...' : 'Redirecting...'}</div>
      </div>
    )
  }

  return <Component {...pageProps} />
}
