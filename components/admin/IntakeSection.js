import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminContext'
import { PageHeader, EmptyState, Loading, SearchBox, SidePanel, matches } from './ui'

// Applications from /newmemberintake. They contain personal and financial
// details, so unlike the other tabs this data is not readable with the site's
// public key: it is fetched through database functions that check a passphrase
// you set the first time you open this tab (docs/migrations/2026-11-08-...).

const STORE = 'radpad:intakeKey'
const sub = (...p) => p.filter(Boolean).join(' · ')
const fullName = r => `${r.first_name} ${r.last_name}`.trim()
const isUrl = s => /^(https?:\/\/|www\.)/i.test(String(s || '').trim())
const href = s => (/^https?:\/\//i.test(s) ? s : `https://${s}`)
const when = iso => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

const ANSWERS = [
  ['about_business', 'About the business'],
  ['going_well_challenge', 'What’s going well / the challenge'],
  ['hoping_to_get', 'Hoping to get from the community'],
  ['strengths', 'What they’d bring to the group'],
  ['anything_else', 'Anything else'],
]

function Value({ text }) {
  if (isUrl(text)) return <a href={href(text.trim())} target="_blank" rel="noopener noreferrer">{text}</a>
  return <>{text}</>
}

export default function IntakeSection() {
  const { toast } = useAdmin()
  const [phase, setPhase] = useState('loading') // loading | set | locked | open
  const [key, setKey] = useState('')
  const [key2, setKey2] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('new') // new | all
  const [query, setQuery] = useState('')
  const [panel, setPanel] = useState(null)
  const [saving, setSaving] = useState(false)

  const stored = () => { try { return sessionStorage.getItem(STORE) || '' } catch { return '' } }
  const remember = k => { try { k ? sessionStorage.setItem(STORE, k) : sessionStorage.removeItem(STORE) } catch {} }

  const load = useCallback(async k => {
    const { data, error } = await supabase.rpc('intake_list', { k })
    if (error) return { error }
    setItems(data || [])
    return { ok: true }
  }, [])

  useEffect(() => {
    let live = true
    ;(async () => {
      const { data: isSet, error } = await supabase.rpc('intake_key_is_set')
      if (!live) return
      if (error) { toast(`Couldn't load: ${error.message}`, { type: 'error', duration: 6000 }); setPhase('locked'); return }
      if (!isSet) { setPhase('set'); return }
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
  }, [load, toast])

  async function setPassphrase(e) {
    e.preventDefault()
    setFormError('')
    if (key.length < 8) { setFormError('Use at least 8 characters.'); return }
    if (key !== key2) { setFormError('The two passphrases don’t match.'); return }
    setBusy(true)
    const { error } = await supabase.rpc('intake_set_key', { new_key: key })
    if (error) {
      setBusy(false)
      setFormError(error.message.includes('already-set') ? 'A passphrase was already set. Enter it instead.' : error.message)
      if (error.message.includes('already-set')) setPhase('locked')
      return
    }
    const r = await load(key)
    setBusy(false)
    if (r.error) { setFormError(r.error.message); return }
    remember(key); setKey(''); setKey2(''); setPhase('open')
    toast('Passphrase saved')
  }

  async function unlock(e) {
    e.preventDefault()
    setFormError('')
    setBusy(true)
    const r = await load(key)
    setBusy(false)
    if (r.error) { setFormError(r.error.message.includes('bad-key') ? 'That passphrase isn’t right.' : r.error.message); return }
    remember(key); setKey(''); setPhase('open')
  }

  function lock() { remember(''); setItems([]); setPanel(null); setPhase('locked') }

  async function toggleStatus() {
    const row = panel.row
    const next = row.status === 'new' ? 'reviewed' : 'new'
    setSaving(true)
    const { error } = await supabase.rpc('intake_set_status', { k: stored(), row_id: row.id, new_status: next })
    setSaving(false)
    if (error) { toast(`Couldn't update: ${error.message}`, { type: 'error', duration: 6000 }); return }
    toast(next === 'reviewed' ? 'Marked reviewed' : 'Marked new')
    setPanel(null)
    load(stored())
  }

  async function remove() {
    const row = panel.row
    if (!window.confirm(`Delete ${fullName(row)}’s application? This can’t be undone.`)) return
    const { error } = await supabase.rpc('intake_delete', { k: stored(), row_id: row.id })
    if (error) { toast(`Couldn't delete: ${error.message}`, { type: 'error', duration: 6000 }); return }
    toast('Application deleted')
    setPanel(null)
    load(stored())
  }

  const newCount = items.filter(i => i.status === 'new').length
  const shown = useMemo(
    () => items.filter(i => (filter === 'all' || i.status === 'new') && matches(query, fullName(i), i.email, i.business_name, i.location, i.referred_by)),
    [items, filter, query],
  )

  const header = <PageHeader title="New Applications" sub="Submissions from theradpad.org/newmemberintake. Review them here, then add approved people under Login Access." />

  if (phase === 'loading') return <>{header}<Loading /></>

  if (phase === 'set' || phase === 'locked') {
    const isSet = phase === 'set'
    return (
      <>
        {header}
        <form className="adm-card" style={{ maxWidth: 460 }} onSubmit={isSet ? setPassphrase : unlock}>
          <h2>{isSet ? 'Choose a passphrase' : 'Enter your passphrase'}</h2>
          <p>
            {isSet
              ? 'Applications include emails and revenue, so this tab is locked with a passphrase only you know. Pick something you will remember: it can’t be recovered from here.'
              : 'This tab is locked because applications include personal details.'}
          </p>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label" htmlFor="ik">{isSet ? 'New passphrase' : 'Passphrase'}</label>
            <input id="ik" className="form-input" type="password" autoComplete={isSet ? 'new-password' : 'current-password'} value={key} onChange={e => setKey(e.target.value)} autoFocus />
          </div>
          {isSet && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label" htmlFor="ik2">Type it again</label>
              <input id="ik2" className="form-input" type="password" autoComplete="new-password" value={key2} onChange={e => setKey2(e.target.value)} />
            </div>
          )}
          {formError && <p style={{ color: 'var(--pink)', marginTop: 12 }}>{formError}</p>}
          <button type="submit" className="adm-btn primary" style={{ marginTop: 16 }} disabled={busy || !key || (isSet && !key2)}>
            {busy ? 'Checking…' : isSet ? 'Save passphrase' : 'Unlock'}
          </button>
        </form>
      </>
    )
  }

  return (
    <>
      <PageHeader title="New Applications" sub="Submissions from theradpad.org/newmemberintake. Review them here, then add approved people under Login Access.">
        <button className="adm-btn sm" onClick={lock}>Lock</button>
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState title="No applications yet">When someone fills out the form, it shows up here.</EmptyState>
      ) : (
        <>
          <div className="adm-toolbar">
            <SearchBox value={query} onChange={setQuery} placeholder="Search by name, email, business or who referred them…" />
            <button className={`adm-btn sm${filter === 'new' ? ' cyan' : ''}`} onClick={() => setFilter('new')}>New ({newCount})</button>
            <button className={`adm-btn sm${filter === 'all' ? ' cyan' : ''}`} onClick={() => setFilter('all')}>All ({items.length})</button>
          </div>
          {shown.length === 0 ? <EmptyState title={query.trim() ? 'No matches' : 'All caught up'}>{query.trim() ? 'Try a different search.' : 'Every application has been reviewed.'}</EmptyState> : (
            <div className="adm-list">
              {shown.map(r => (
                <div key={r.id} className="adm-row click" tabIndex={0} role="button"
                  onClick={() => setPanel({ row: r })}
                  onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setPanel({ row: r }) } }}>
                  <div className="adm-row-body">
                    <div className="adm-row-title">{fullName(r)} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {r.business_name}</span></div>
                    <div className="adm-row-meta">{sub(r.location, r.referred_by && `referred by ${r.referred_by}`, when(r.created_at))}</div>
                  </div>
                  <div className="adm-row-actions">
                    {r.status === 'new' && <span className="adm-badge">New</span>}
                    <button className="adm-btn cyan sm" onClick={e => { e.stopPropagation(); setPanel({ row: r }) }}>Read</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {panel && (
        <SidePanel
          title={fullName(panel.row)}
          onClose={() => setPanel(null)}
          onSubmit={toggleStatus}
          saving={saving}
          submitLabel={panel.row.status === 'new' ? 'Mark reviewed' : 'Mark as new'}
        >
          <div className="adm-card" style={{ marginTop: 0 }}>
            {[
              ['Email', panel.row.email],
              ['Business', panel.row.business_name],
              ['Website', panel.row.website],
              ['Location', panel.row.location],
              ['Referred by', panel.row.referred_by],
              ['Years in business', panel.row.years_in_business],
              ['Annual revenue', panel.row.annual_revenue],
              ['Best recent project', panel.row.best_project_link],
              ['Applied', when(panel.row.created_at)],
            ].filter(([, v]) => v).map(([label, v]) => (
              <p key={label} style={{ marginBottom: 8 }}><b style={{ color: 'var(--text)' }}>{label}:</b> {label === 'Email' ? <a href={`mailto:${v}`}>{v}</a> : <Value text={v} />}</p>
            ))}
          </div>
          {ANSWERS.filter(([k]) => panel.row[k]).map(([k, label]) => (
            <div key={k} style={{ marginTop: 16 }}>
              <div className="adm-label">{label}</div>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>{panel.row[k]}</p>
            </div>
          ))}
          <button type="button" className="adm-btn danger sm" style={{ marginTop: 24 }} onClick={remove}>Delete application</button>
        </SidePanel>
      )}
    </>
  )
}
