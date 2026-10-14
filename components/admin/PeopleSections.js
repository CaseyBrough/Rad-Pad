import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminContext'
import { PageHeader, EmptyState, Loading, SearchBox, Field, SidePanel, matches } from './ui'
import { AREA_OPTIONS, describePlacement } from '../../lib/placement'

const sub = (...p) => p.filter(Boolean).join(' · ')

function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

// Shared shape for Members and Map Pins: approved rows only (pending ones live
// in Approvals), searchable, edited in a slide-over, removed with undo.
function ApprovedList({ table, title, subtitle, searchHint, fields, searchText, row, noun, extra }) {
  const { toast, refreshCounts, deleteWithUndo, isHidden } = useAdmin()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [panel, setPanel] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from(table).select('*').eq('approved', true).order('created_at', { ascending: false })
    if (error) toast(`Couldn't load: ${error.message}`, { type: 'error', duration: 6000 })
    setItems(data || [])
    setLoading(false)
  }, [table, toast])

  useEffect(() => { load() }, [load])

  const live = items.filter(i => !isHidden(table, i.id))
  const visible = useMemo(() => live.filter(i => matches(query, ...searchText(i))), [live, query]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true)
    const { id, created_at, ...rest } = panel.form
    const { error } = await supabase.from(table).update(rest).eq('id', id)
    setSaving(false)
    if (error) { toast(`Couldn't save: ${error.message}`, { type: 'error', duration: 6000 }); return }
    toast(`${noun} updated`)
    setPanel(null)
    load()
    refreshCounts()
  }

  return (
    <>
      <PageHeader title={title} sub={subtitle} />
      {loading ? <Loading /> : live.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} yet`}>Approved submissions show up here.</EmptyState>
      ) : (
        <>
          <div className="adm-toolbar"><SearchBox value={query} onChange={setQuery} placeholder={searchHint} /></div>
          <div className="adm-count">{query.trim() ? `${visible.length} of ${live.length}` : live.length} {title.toLowerCase()}</div>
          {visible.length === 0 ? <EmptyState title="No matches">Try a different search.</EmptyState> : (
            <div className="adm-list">
              {visible.map(item => {
                const r = row(item)
                return (
                  <div key={item.id} className="adm-row click" tabIndex={0} role="button"
                    onClick={() => setPanel({ form: { ...item } })}
                    onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setPanel({ form: { ...item } }) } }}>
                    {r.photo ? <img className="adm-avatar" src={r.photo} alt="" />
                      : r.initials ? <div className="adm-avatar ph" aria-hidden="true">{r.initials}</div> : null}
                    <div className="adm-row-body">
                      <div className="adm-row-title">{r.title}</div>
                      {r.meta && <div className="adm-row-meta">{r.meta}</div>}
                    </div>
                    <div className="adm-row-actions">
                      <button className="adm-btn cyan sm" onClick={e => { e.stopPropagation(); setPanel({ form: { ...item } }) }}>Edit</button>
                      <button className="adm-btn danger sm" onClick={e => { e.stopPropagation(); deleteWithUndo({ table, id: item.id, label: r.title, onDone: load }) }}>Remove</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
      {panel && (
        <SidePanel title={`Edit ${noun.toLowerCase()}`} onClose={() => setPanel(null)} onSubmit={save} saving={saving} canSave={!!String(panel.form.name || '').trim()} submitLabel="Save changes">
          <div className="adm-form-grid">
            {fields.map(f => (
              <Field key={f.key} spec={f} form={panel.form} onChange={(k, v) => setPanel(p => ({ ...p, form: { ...p.form, [k]: v } }))} />
            ))}
          </div>
          {extra && extra(panel.form)}
        </SidePanel>
      )}
    </>
  )
}

const MEMBER_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'location', label: 'Location' },
  { key: 'specialty', label: 'Specialty', full: true },
  { key: 'bio', label: 'Bio', type: 'textarea', full: true },
  { key: 'website', label: 'Website', full: true },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'instagram', label: 'Instagram' },
]

export function MembersSection() {
  return (
    <ApprovedList
      table="members" noun="Member" title="Members"
      subtitle="Approved Directory profiles. New submissions wait in Approvals first."
      searchHint="Search by name, location or specialty…"
      fields={MEMBER_FIELDS}
      searchText={m => [m.name, m.location, m.specialty, m.bio]}
      row={m => ({ photo: m.photo_url, initials: initialsOf(m.name), title: m.name, meta: sub(m.specialty, m.location) })}
    />
  )
}

export function PinsSection() {
  return (
    <ApprovedList
      table="map_pins" noun="Pin" title="Map Pins"
      subtitle="Everyone shown on the /map page. Separate from the Directory - editing a pin never touches a Directory profile."
      searchHint="Search by name or location…"
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'location', label: 'Location' },
        { key: 'map_area', label: 'Where it shows on the map', type: 'select', options: AREA_OPTIONS, full: true },
      ]}
      searchText={p => [p.name, p.location]}
      row={p => {
        const d = describePlacement(p)
        return { title: p.name, meta: <>{p.location}<span className={`adm-place ${d.ok ? 'ok' : 'warn'}`}>{d.text}</span></> }
      }}
      extra={form => {
        const d = describePlacement(form)
        return (
          <div className={`adm-place-box ${d.ok ? 'ok' : 'warn'}`}>
            <b>{d.ok ? 'Will show as' : 'Not placed'}</b> {d.text}
            <p>Members outside North America can’t be pinned on this map, so they appear in a “Beyond North America” area next to it, grouped by where they are. Leave this on Automatic unless someone lands in the wrong spot.</p>
          </div>
        )
      }}
    />
  )
}

// ── LOGIN ACCESS ──────────────────────────────────────────────────────────

// Pull every email out of pasted text (a Slack export, a CSV, anything).
function parseBulkEmails(text) {
  const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const seen = new Set()
  const rows = []
  for (const line of text.split('\n').map(l => l.trim()).filter(Boolean)) {
    const match = line.match(emailRe)
    if (!match) continue
    const email = match[0].toLowerCase()
    if (seen.has(email)) continue
    seen.add(email)
    const rest = line.replace(match[0], '').replace(/["',]+/g, ' ').replace(/\s+/g, ' ').trim()
    rows.push({ email, name: rest || null })
  }
  return rows
}

export function AccessSection() {
  const { toast, refreshCounts, deleteWithUndo, isHidden } = useAdmin()
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('authorized_emails').select('*').order('created_at', { ascending: false })
    if (error) toast(`Couldn't load: ${error.message}`, { type: 'error', duration: 6000 })
    setEmails(data || [])
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  const live = emails.filter(e => !isHidden('authorized_emails', e.id))
  const visible = live.filter(e => matches(query, e.name, e.email))

  async function addOne(ev) {
    ev.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!clean) return
    setAdding(true)
    const { error } = await supabase.from('authorized_emails').upsert([{ email: clean, name: name.trim() || null }], { onConflict: 'email' })
    setAdding(false)
    if (error) { toast(`Couldn't add: ${error.message}`, { type: 'error', duration: 6000 }); return }
    setEmail(''); setName('')
    toast(`${clean} can now log in`)
    load(); refreshCounts()
  }

  async function runImport() {
    setImporting(true)
    const { error } = await supabase.from('authorized_emails').upsert(preview, { onConflict: 'email' })
    setImporting(false)
    if (error) { toast(`Import failed: ${error.message}`, { type: 'error', duration: 6000 }); return }
    toast(`Imported ${preview.length} email${preview.length === 1 ? '' : 's'}`)
    setBulkText(''); setPreview(null)
    load(); refreshCounts()
  }

  return (
    <>
      <PageHeader title="Login Access" sub="The list of emails allowed to sign in to the member site. It doesn't touch the public Directory." />

      <form className="adm-card" style={{ marginBottom: 14 }} onSubmit={addOne}>
        <h2>Add someone</h2>
        <div className="adm-form-grid" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="acc-email">Email *</label>
            <input id="acc-email" className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="member@email.com" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="acc-name">Name <span className="adm-opt">(optional)</span></label>
            <input id="acc-name" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Jamie Smith" />
          </div>
        </div>
        <button type="submit" className="adm-btn primary" style={{ marginTop: 16 }} disabled={adding || !email.trim()}>{adding ? 'Adding…' : 'Add email'}</button>
      </form>

      <details className="adm-card adm-details" style={{ marginTop: 0, marginBottom: 32 }}>
        <summary>Bulk import from a list</summary>
        <p style={{ marginBottom: 12 }}>Paste a Slack member export (or any text with emails in it, one per line). Emails are pulled out automatically.</p>
        <textarea className="form-textarea" style={{ minHeight: 140 }} value={bulkText}
          onChange={e => { setBulkText(e.target.value); setPreview(null) }}
          placeholder={'Jamie Smith, jamie@email.com\nAlex Rivera, alex@email.com'} />
        {!preview ? (
          <button className="adm-btn cyan" style={{ marginTop: 12 }} disabled={!bulkText.trim()} onClick={() => setPreview(parseBulkEmails(bulkText))}>Preview import</button>
        ) : preview.length === 0 ? (
          <p style={{ marginTop: 12, color: 'var(--pink)' }}>No email addresses found in that text.</p>
        ) : (
          <>
            <p style={{ marginTop: 12, color: 'var(--cyan)' }}>Found {preview.length} email{preview.length === 1 ? '' : 's'}. Review, then confirm.</p>
            <div className="adm-preview">
              {preview.map(r => <div key={r.email}><span>{r.name || <em style={{ color: 'var(--muted)' }}>no name</em>}</span><code>{r.email}</code></div>)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="adm-btn primary" onClick={runImport} disabled={importing}>{importing ? 'Importing…' : `Import ${preview.length}`}</button>
              <button className="adm-btn" onClick={() => setPreview(null)}>Cancel</button>
            </div>
          </>
        )}
      </details>

      {loading ? <Loading /> : live.length === 0 ? (
        <EmptyState title="No one has access yet">Add an email above.</EmptyState>
      ) : (
        <>
          <div className="adm-toolbar"><SearchBox value={query} onChange={setQuery} placeholder="Search by name or email…" /></div>
          <div className="adm-count">{query.trim() ? `${visible.length} of ${live.length}` : live.length} approved emails</div>
          {visible.length === 0 ? <EmptyState title="No matches">Try a different search.</EmptyState> : (
            <div className="adm-list">
              {visible.map(a => (
                <div key={a.id} className="adm-row">
                  <div className="adm-row-body">
                    {a.name && <div className="adm-row-title">{a.name}</div>}
                    <div className="adm-row-meta" style={a.name ? undefined : { fontSize: 13, color: 'var(--text)' }}>{a.email}</div>
                  </div>
                  <div className="adm-row-actions">
                    <button className="adm-btn danger sm" onClick={() => deleteWithUndo({ table: 'authorized_emails', id: a.id, label: a.email, onDone: load })}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
