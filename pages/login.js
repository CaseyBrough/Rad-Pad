import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { readGateNote, clearGateNote } from '../lib/gate'

export default function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | checking | sent | not-approved | error
  const [error, setError] = useState('')
  const [note, setNote] = useState(null)

  // If the hub just sent a signed-in member back here, say why (once).
  useEffect(() => {
    const n = readGateNote()
    if (n && n.hadSession && n.kind === 'login' && n.reason !== 'logout' && n.reason !== 'not-approved') setNote(n)
    clearGateNote()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!clean) return

    setStatus('checking')
    setError('')

    const { data: match } = await supabase
      .from('authorized_emails')
      .select('email')
      .eq('email', clean)
      .maybeSingle()

    if (!match) {
      setStatus('not-approved')
      return
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    })

    if (otpError) {
      setStatus('error')
      setError(otpError.message)
      return
    }

    setStatus('sent')
  }

  function reset() {
    setStatus('idle')
    setError('')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: 'var(--pink)', textShadow: '0 0 44px rgba(255,45,120,0.8)', marginBottom: 6 }}>The Rad Pad</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>Members Hub</div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 30px' }}>
          {status === 'sent' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, marginBottom: 14 }}>✉️</div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, letterSpacing: '0.04em', marginBottom: 10 }}>Check your email</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 20 }}>
                We sent a sign-in link to <span style={{ color: 'var(--text)' }}>{email.trim()}</span>. Click it to get in — you can close this tab.
              </div>
              <button onClick={reset} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 18px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Use a different email
              </button>
            </div>
          ) : status === 'not-approved' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, marginBottom: 14 }}>🔒</div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, letterSpacing: '0.04em', marginBottom: 10, color: 'var(--pink)' }}>Not on the list yet</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 20 }}>
                <span style={{ color: 'var(--text)' }}>{email.trim()}</span> isn't approved for access. Reach out in the community if you think this is a mistake.
              </div>
              <button onClick={reset} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 18px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Try another email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {note && (
                <div style={{ marginBottom: 18, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.25)', fontSize: 13, lineHeight: 1.55, color: 'var(--text)', textAlign: 'center' }}>
                  Your sign-in wasn’t recognized, so please sign in again.
                  <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>code: {note.reason}</div>
                </div>
              )}
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, letterSpacing: '0.04em', marginBottom: 6, textAlign: 'center' }}>Sign In</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, textAlign: 'center', lineHeight: 1.6 }}>
                Enter your email and we'll send you a link — no password needed.
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  style={{ fontFamily: 'inherit' }}
                  type="email"
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com"
                />
              </div>
              {error && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--pink)', marginBottom: 14 }}>{error}</div>}
              <button className="submit-btn" style={{ margin: 0, width: '100%' }} type="submit" disabled={status === 'checking' || !email.trim()}>
                {status === 'checking' ? 'Checking...' : 'Send Sign-In Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
