import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminContext'
import { PageHeader, EmptyState, Loading } from './ui'

// Members' requests to host a call (Calendar > "Host a call"). Approve puts the
// call on the Calendar with the standing Zoom link and emails the host; decline
// frees the date and emails the host. Requests carry the host's email, so like
// New Applications this tab sits behind the admin passphrase (set there, shared
// here). See docs/migrations/2026-11-08-hosted-call-booking.sql.

const STORE = 'radpad:intakeKey'
const when = iso => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const prettyDate = ymd => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

const SETTINGS = [
  ['standing_zoom_url', 'Standing Zoom link', 'Copied onto every approved call. Change it here when the room or passcode changes.'],
  ['default_call_time', 'Call time', 'e.g. 3:00pm EST'],
  ['default_call_duration', 'Length', 'e.g. 90 min'],
]

export default function CallBookingsSection() {
  const { toast } = useAdmin()
  const [phase, setPhase] = useState('loading') // loading | unset | locked | open
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [items, setItems] = useState([])
  const [working, setWorking] = useState(null)
  const [settings, setSettings] = useState({})
  const [savedSettings, setSavedSettings] = useState({})
  const [savingSettings, setSavingSettings] = useState(false)

  const stored = () => { try { return sessionStorage.getItem(STORE) || '' } catch { return '' } }
  const remember = k => { try { k ? sessionStorage.setItem(STORE, k) : sessionStorage.removeItem(STORE) } catch {} }

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from('site_settings').select('key,value')
    const m = Object.fromEntries((data || []).map(x => [x.key, x.value]))
    setSettings(m); setSavedSettings(m)
  }, [])

  const load = useCallback(async k => {
    const { data, error } = await supabase.rpc('call_requests_list', { k })
    if (error) return { error }
    setItems(data || [])
    return { ok: true }
  }, [])

  useEffect(() => {
    let live = true
    ;(async () => {
      loadSettings()
      const { data: isSet, error } = await supabase.rpc('intake_key_is_set')
      if (!live) return
      if (error) { toast(`Couldn't load: ${error.message}`, { type: 'error', duration: 6000 }); setPhase('locked'); return }
      if (!isSet) { setPhase('unset'); return }
      const saved = stored()
      if (saved) {
        const r = await load(saved)
        if (!live) return
        if (r.ok) { setPhase('open'); return }
        remember('')
      }
      setPhase('locked')
    })()
    return () => { live = false }
  }, [load, loadSettings, toast])

  async function unlock(e) {
    e.preventDefault()
    setFormError('')
    setBusy(true)
    const r = await load(key)
    setBusy(false)
    if (r.error) { setFormError(r.error.message.includes('bad-key') ? 'That passphrase isn’t right.' : r.error.message); return }
    remember(key); setKey(''); setPhase('open')
  }

  function lock() { remember(''); setItems([]); setPhase('locked') }

  async function decide(row, decision) {
    const verb = decision === 'approved' ? 'Approve' : 'Decline'
    if (decision === 'declined' && !window.confirm(`Decline ${row.host_name}’s request for ${prettyDate(row.event_date)}? They’ll get an email.`)) return
    setWorking(row.id)
    try {
      const r = await fetch('/api/call-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ k: stored(), id: row.id, decision }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        const msg = j.error === 'slot-taken' ? 'That date already has a call on the Calendar.'
          : j.error === 'already-decided' ? 'That request was already handled.'
          : j.error === 'bad-key' ? 'The passphrase didn’t work. Lock and unlock again.'
          : `Couldn't ${verb.toLowerCase()} it.`
        toast(msg, { type: 'error', duration: 6000 })
      } else if (decision === 'approved') {
        toast(j.emailed ? `Approved. ${row.host_name} has been emailed and the call is on the Calendar.` : `Approved and on the Calendar, but the email to ${row.host_name} didn’t send. Let them know yourself (${row.host_email}).`, { type: j.emailed ? 'success' : 'error', duration: j.emailed ? 4500 : 9000 })
      } else {
        toast(j.emailed ? 'Declined. The date is open again.' : `Declined, but the email didn’t send. Let ${row.host_name} know (${row.host_email}).`, { type: j.emailed ? 'success' : 'error', duration: j.emailed ? 4500 : 9000 })
      }
      await load(stored())
    } finally {
      setWorking(null)
    }
  }

  async function remove(row) {
    if (!window.confirm('Remove this from the list? The Calendar event (if any) stays.')) return
    const { error } = await supabase.rpc('call_request_delete', { k: stored(), row_id: row.id })
    if (error) { toast(`Couldn't remove: ${error.message}`, { type: 'error', duration: 6000 }); return }
    load(stored())
  }

  async function saveSettings() {
    setSavingSettings(true)
    const rows = SETTINGS.map(([k]) => ({ key: k, value: (settings[k] || '').trim() }))
    const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' })
    setSavingSettings(false)
    if (error) { toast(`Couldn't save: ${error.message}`, { type: 'error', duration: 6000 }); return }
    toast('Settings saved. New approvals use them.')
    loadSettings()
  }

  const header = <PageHeader title="Call Bookings" sub="Members who’ve asked to host a Tuesday call. Approving puts it on the Calendar with the standing Zoom link and emails them." />
  if (phase === 'loading') return <>{header}<Loading /></>

  if (phase === 'unset') {
    return <>{header}<div className="adm-card" style={{ maxWidth: 520 }}><h2>Set your passphrase first</h2><p>Requests include members’ emails, so this tab uses the same passphrase as New Applications. Open that tab once to choose it, then come back here.</p></div></>
  }

  if (phase === 'locked') {
    return (
      <>
        {header}
        <form className="adm-card" style={{ maxWidth: 460 }} onSubmit={unlock}>
          <h2>Enter your passphrase</h2>
          <p>The same one you use for New Applications.</p>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label" htmlFor="ck">Passphrase</label>
            <input id="ck" className="form-input" type="password" autoComplete="current-password" value={key} onChange={e => setKey(e.target.value)} autoFocus />
          </div>
          {formError && <p style={{ color: 'var(--pink)', marginTop: 12 }}>{formError}</p>}
          <button type="submit" className="adm-btn primary" style={{ marginTop: 16 }} disabled={busy || !key}>{busy ? 'Checking…' : 'Unlock'}</button>
        </form>
      </>
    )
  }

  const pending = items.filter(i => i.status === 'pending')
  const done = items.filter(i => i.status !== 'pending')
  const dirty = SETTINGS.some(([k]) => (settings[k] || '') !== (savedSettings[k] || ''))

  return (
    <>
      <PageHeader title="Call Bookings" sub="Members who’ve asked to host a Tuesday call. Approving puts it on the Calendar with the standing Zoom link and emails them.">
        <button className="adm-btn sm" onClick={lock}>Lock</button>
      </PageHeader>

      <div className="adm-section">
        <div className="adm-label hot">Waiting on you ({pending.length})</div>
        {pending.length === 0 ? <EmptyState title="All caught up">When a member asks to host a call, it shows up here.</EmptyState> : (
          <div className="adm-list">
            {pending.map(r => (
              <div key={r.id} className="adm-approval">
                <div className="adm-approval-top">
                  <div className="adm-approval-body">
                    <div className="adm-row-title" style={{ whiteSpace: 'normal' }}>{prettyDate(r.event_date)} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {r.call_type}</span></div>
                    <div className="adm-row-meta" style={{ whiteSpace: 'normal' }}>{r.host_name} · <a href={`mailto:${r.host_email}`} style={{ color: 'var(--cyan)' }}>{r.host_email}</a> · asked {when(r.created_at)}</div>
                    <div className="adm-approval-bio" style={{ color: 'var(--text)', fontWeight: 500 }}>{r.title}</div>
                    {r.description && <div className="adm-approval-bio">{r.description}</div>}
                    {r.note && <div className="adm-approval-bio">📝 Note to the team: {r.note}</div>}
                  </div>
                  <div className="adm-row-actions">
                    <button className="adm-btn cyan sm" disabled={working === r.id} onClick={() => decide(r, 'approved')}>{working === r.id ? 'Working…' : 'Approve'}</button>
                    <button className="adm-btn danger sm" disabled={working === r.id} onClick={() => decide(r, 'declined')}>Decline</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="adm-section">
        <div className="adm-label">Call settings</div>
        <div className="adm-card" style={{ maxWidth: 640, marginTop: 0 }}>
          {SETTINGS.map(([k, label, hint], i) => (
            <div className="form-group" style={{ marginTop: i ? 14 : 0 }} key={k}>
              <label className="form-label" htmlFor={`cs-${k}`}>{label}</label>
              <input id={`cs-${k}`} className="form-input" value={settings[k] || ''} onChange={e => setSettings(s => ({ ...s, [k]: e.target.value }))} placeholder={i ? hint : 'https://…zoom.us/j/…'} />
              {i === 0 && <p style={{ marginTop: 6, fontSize: 13, color: 'var(--muted)' }}>{hint}</p>}
            </div>
          ))}
          <button className="adm-btn primary" style={{ marginTop: 16 }} onClick={saveSettings} disabled={!dirty || savingSettings}>{savingSettings ? 'Saving…' : 'Save settings'}</button>
        </div>
      </div>

      {done.length > 0 && (
        <div className="adm-section">
          <div className="adm-label">Earlier requests ({done.length})</div>
          <div className="adm-list">
            {done.map(r => (
              <div key={r.id} className="adm-row">
                <div className="adm-row-body">
                  <div className="adm-row-title">{prettyDate(r.event_date)} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {r.host_name}</span></div>
                  <div className="adm-row-meta">{r.title} · {r.status}</div>
                </div>
                <div className="adm-row-actions"><button className="adm-btn sm" onClick={() => remove(r)}>Remove</button></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
