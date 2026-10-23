import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminContext'
import { SidePanel } from './ui'
import { membershipEndedEmail } from '../../lib/emails/membershipEnded'

// "Revoke membership": ends someone's login access and/or sends them the
// membership-ended email (from hello@theradpad.org, through Resend).
// The email goes out through /api/send-membership-ended, which needs the
// admin passphrase.

const PASS_KEY = 'radpad:admin-send-pass'
const TEST_KEY = 'radpad:admin-send-test'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function prettyDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function read(key) { try { return window.sessionStorage.getItem(key) || '' } catch { return '' } }
function write(key, v) { try { window.sessionStorage.setItem(key, v) } catch { /* ignore */ } }
function readLocal(key) { try { return window.localStorage.getItem(key) || '' } catch { return '' } }
function writeLocal(key, v) { try { window.localStorage.setItem(key, v) } catch { /* ignore */ } }

const PROBLEMS = {
  'not-configured': 'Email sending isn’t switched on yet. In Vercel, add RESEND_API_KEY and ADMIN_SEND_PASSPHRASE, then redeploy.',
  'bad-passphrase': 'That passphrase isn’t right.',
  'too-many': 'Too many emails in the last hour. Try again later.',
  'bad-recipient': 'That email address doesn’t look right.',
}

async function sendEmail({ to, firstName, endDate, passphrase }) {
  try {
    const r = await fetch('/api/send-membership-ended', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-passphrase': passphrase },
      body: JSON.stringify({ to, firstName, endDate }),
    })
    const data = await r.json().catch(() => ({}))
    if (r.ok) return { ok: true }
    return { ok: false, message: PROBLEMS[data.error] || data.detail || `Couldn’t send (${r.status}).` }
  } catch {
    return { ok: false, message: 'Couldn’t reach the site to send. Check your connection.' }
  }
}

export default function RevokePanel({ row, onClose, onDone }) {
  const { toast, refreshCounts } = useAdmin()
  const [firstName, setFirstName] = useState(() => (row.name || '').trim().split(/\s+/)[0] || '')
  const [date, setDate] = useState(todayISO)
  const [removeAccess, setRemoveAccess] = useState(true)
  const [sendIt, setSendIt] = useState(true)
  const [passphrase, setPassphrase] = useState(() => read(PASS_KEY))
  const [testTo, setTestTo] = useState(() => readLocal(TEST_KEY))
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')

  const mail = useMemo(() => membershipEndedEmail({ firstName: firstName.trim() || 'there', endDate: prettyDate(date) }), [firstName, date])
  const canRun = (removeAccess || sendIt) && (!sendIt || (firstName.trim() && passphrase.trim()))

  async function sendTest() {
    const to = testTo.trim()
    if (!to || !passphrase.trim()) { setProblem('Enter an address to send the test to, and the passphrase.'); return }
    setBusy(true); setProblem('')
    const r = await sendEmail({ to, firstName: firstName.trim() || 'there', endDate: prettyDate(date), passphrase: passphrase.trim() })
    setBusy(false)
    if (!r.ok) { setProblem(r.message); return }
    write(PASS_KEY, passphrase.trim()); writeLocal(TEST_KEY, to)
    toast(`Test email sent to ${to}`)
  }

  async function run() {
    setBusy(true); setProblem('')
    if (sendIt) {
      const r = await sendEmail({ to: row.email, firstName: firstName.trim(), endDate: prettyDate(date), passphrase: passphrase.trim() })
      if (!r.ok) { setBusy(false); setProblem(r.message); return } // nothing has been removed yet
      write(PASS_KEY, passphrase.trim())
    }
    if (removeAccess) {
      const { error } = await supabase.from('authorized_emails').delete().eq('id', row.id)
      if (error) {
        setBusy(false)
        setProblem(`${sendIt ? 'The email was sent, but ' : ''}removing their access failed: ${error.message}`)
        return
      }
    }
    setBusy(false)
    toast([sendIt && `Email sent to ${row.email}`, removeAccess && 'login access removed'].filter(Boolean).join(' · '), { duration: 6000 })
    refreshCounts()
    onDone()
    onClose()
  }

  const label = sendIt && removeAccess ? 'Remove access and send email' : sendIt ? 'Send email' : 'Remove access'

  return (
    <SidePanel title="Revoke membership" onClose={onClose} onSubmit={run} saving={busy} canSave={!!canRun} submitLabel={label}>
      <p className="panel-note">For <b>{row.email}</b>{row.name ? ` (${row.name})` : ''}. This is the one email sent to members whose access has ended.</p>

      <div className="adm-form-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="rv-name">First name</label>
          <input id="rv-name" className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jordan" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="rv-date">Access ended</label>
          <input id="rv-date" className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      <div className="adm-checks">
        <label><input type="checkbox" checked={removeAccess} onChange={e => setRemoveAccess(e.target.checked)} /> Remove their login access <span>(signed out the next time they open the site)</span></label>
        <label><input type="checkbox" checked={sendIt} onChange={e => setSendIt(e.target.checked)} /> Send the membership-ended email <span>(from hello@theradpad.org)</span></label>
      </div>

      {sendIt && (
        <div className="adm-form-grid" style={{ marginTop: 14 }}>
          <div className="form-group full">
            <label className="form-label" htmlFor="rv-pass">Admin passphrase</label>
            <input id="rv-pass" className="form-input" type="password" autoComplete="off" value={passphrase} onChange={e => setPassphrase(e.target.value)} placeholder="The phrase you set in Vercel" />
          </div>
        </div>
      )}

      <div className="adm-label" style={{ marginTop: 22 }}>Preview</div>
      <iframe className="adm-revoke-prev" title="Email preview" sandbox="" srcDoc={mail.html} />

      {sendIt && (
        <div className="adm-test">
          <div className="adm-label" style={{ marginBottom: 8 }}>Send yourself a test first</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" type="email" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="your own email" aria-label="Send a test to" />
            <button type="button" className="adm-btn cyan" onClick={sendTest} disabled={busy}>Send test</button>
          </div>
        </div>
      )}

      {problem && <div className="panel-error">{problem}</div>}
    </SidePanel>
  )
}
