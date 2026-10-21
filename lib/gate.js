// Helpers for the sign-in gate in pages/_app.js.

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

// supabase-js keeps the session in localStorage under sb-<project>-auth-token.
function storageKey() {
  try { return `sb-${new URL(URL_).hostname.split('.')[0]}-auth-token` } catch { return null }
}

// True when this browser has a saved sign-in (it may be expired - that is fine,
// it only means "this visitor has signed in before").
export function hasStoredSession() {
  try {
    const key = storageKey()
    return !!key && !!window.localStorage.getItem(key)
  } catch { return false }
}

export function withTimeout(promise, ms) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), ms) }),
  ]).finally(() => clearTimeout(timer))
}

const NOTE_KEY = 'radpad:gate-last'

// Remember why the gate sent someone to /login (shown once on the login page),
// so a "it keeps signing me out" report comes with a reason.
export function noteGateExit(reason, path, hadSession, kind = 'login') {
  try {
    window.localStorage.setItem(NOTE_KEY, JSON.stringify({ at: Date.now(), reason, path, hadSession, kind }))
  } catch { /* storage blocked: nothing to remember */ }
}

export function readGateNote(maxAgeMs = 2 * 60 * 1000) {
  try {
    const n = JSON.parse(window.localStorage.getItem(NOTE_KEY) || 'null')
    if (!n || Date.now() - n.at > maxAgeMs) return null
    return n
  } catch { return null }
}

// The Log out button sets this so the gate can tell "I clicked log out" apart
// from "the browser lost my sign-in".
export function markExplicitLogout() {
  try { window.sessionStorage.setItem('radpad:logout', '1') } catch { /* ignore */ }
}
export function consumeExplicitLogout() {
  try {
    const v = window.sessionStorage.getItem('radpad:logout') === '1'
    window.sessionStorage.removeItem('radpad:logout')
    return v
  } catch { return false }
}

export function clearGateNote() {
  try { window.localStorage.removeItem(NOTE_KEY) } catch { /* ignore */ }
}
