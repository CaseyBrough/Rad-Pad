import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const SECTIONS = ['Recording', 'Resource', 'Event', 'Link']
const TAG_OPTIONS = ['Sales', 'Mindset', 'Ops', 'Pricing', 'Marketing', 'Q&A']
const RES_CATS = ['Templates', 'Guides', 'Scripts', 'Finance']
const EVENT_TYPES = ['Live', 'Workshop', 'Office Hrs', 'Hot Seat', 'Mindset', 'Q&A']
const LINK_CATS = ['Software', 'Gear', 'Finance', 'Education']

const EMPTY = {
  Recording: { title: '', description: '', date: '', duration: '', host: '', video_url: '', tags: [] },
  Resource: { title: '', description: '', category: 'Templates', file_url: '', file_type: 'PDF' },
  Event: { title: '', description: '', event_date: '', time: '', duration: '', type: 'Live', platform: 'Zoom' },
  Link: { name: '', description: '', url: '', category: 'Software', emoji: '' }
}

const TABLE = { Recording: 'recordings', Resource: 'resources', Event: 'events', Link: 'links' }

export default function Admin() {
  const [section, setSection] = useState('Recording')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState(EMPTY['Recording'])
  const [editId, setEditId] = useState(null)
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)

  useEffect(() => {
    setForm(EMPTY[section])
    setEditId(null)
    setSuccess('')
    loadItems()
  }, [section])

  async function loadItems() {
    setLoadingItems(true)
    const col = section === 'Recording' ? 'created_at' : section === 'Event' ? 'event_date' : 'created_at'
    const { data } = await supabase.from(TABLE[section]).select('*').order(col, { ascending: false })
    setItems(data || [])
    setLoadingItems(false)
  }

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function toggleTag(tag) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
    }))
  }

  function startEdit(item) {
    setEditId(item.id)
    const { id, created_at, ...rest } = item
    setForm({ ...EMPTY[section], ...rest })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditId(null)
    setForm(EMPTY[section])
    setSuccess('')
  }

  async function deleteItem(id) {
    if (!confirm('Delete this item?')) return
    await supabase.from(TABLE[section]).delete().eq('id', id)
    setSuccess('Deleted.')
    loadItems()
  }

  async function save() {
    setSaving(true)
    setSuccess('')
    let error
    if (editId) {
      ;({ error } = await supabase.from(TABLE[section]).update(form).eq('id', editId))
      if (!error) { setEditId(null); setForm(EMPTY[section]); setSuccess('Updated.') }
    } else {
      ;({ error } = await supabase.from(TABLE[section]).insert([form]))
      if (!error) { setForm(EMPTY[section]); setSuccess(`${section} added.`) }
    }
    setSaving(false)
    if (error) setSuccess(`Error: ${error.message}`)
    else loadItems()
  }

  const inp = { fontFamily: 'inherit' }

  function getItemLabel(item) {
    return item.title || item.name || '(untitled)'
  }

  function getItemMeta(item) {
    if (section === 'Recording') return `${item.date || ''} ${item.duration ? '· ' + item.duration : ''} ${item.host ? '· ' + item.host : ''}`
    if (section === 'Resource') return `${item.category || ''} · ${item.file_type || ''}`
    if (section === 'Event') return `${item.event_date || ''} ${item.time ? '· ' + item.time : ''}`
    if (section === 'Link') return `${item.category || ''} ${item.url ? '· ' + item.url : ''}`
    return ''
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '40px 36px', fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--pink)', textShadow: '0 0 20px rgba(255,45,120,0.4)', marginBottom: 4 }}>The Rad Pad</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>Admin Panel</div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {SECTIONS.map(s => (
            <button key={s} className={`filter-tag${section === s ? ' active' : ''}`} onClick={() => setSection(s)}>
              {s}s
            </button>
          ))}
        </div>

        {/* FORM */}
        <div className="admin-form">
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, letterSpacing: '0.05em', color: 'var(--text)', marginBottom: 20 }}>
            {editId ? `Edit ${section}` : `Add ${section}`}
            {editId && (
              <button onClick={cancelEdit} style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Cancel
              </button>
            )}
          </h2>

          {section === 'Recording' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" style={inp} value={form.title || ''} onChange={e => setField('title', e.target.value)} placeholder="Q2 Sales Sprint..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Host</label>
                  <input className="form-input" style={inp} value={form.host || ''} onChange={e => setField('host', e.target.value)} placeholder="Jamie Reeves" />
                </div>
              </div>
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" style={inp} value={form.description || ''} onChange={e => setField('description', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" style={inp} type="date" value={form.date || ''} onChange={e => setField('date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <input className="form-input" style={inp} value={form.duration || ''} onChange={e => setField('duration', e.target.value)} placeholder="58m" />
                </div>
              </div>
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Video URL</label>
                  <input className="form-input" style={inp} value={form.video_url || ''} onChange={e => setField('video_url', e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tags</label>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 6 }}>
                  {TAG_OPTIONS.map(tag => (
                    <button key={tag} type="button" className={`filter-tag${(form.tags || []).includes(tag) ? ' active' : ''}`} onClick={() => toggleTag(tag)}>{tag}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {section === 'Resource' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" style={inp} value={form.title || ''} onChange={e => setField('title', e.target.value)} placeholder="Discovery Call Script" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" style={inp} value={form.category || 'Templates'} onChange={e => setField('category', e.target.value)}>
                    {RES_CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" style={inp} value={form.description || ''} onChange={e => setField('description', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">File / Link URL</label>
                  <input className="form-input" style={inp} value={form.file_url || ''} onChange={e => setField('file_url', e.target.value)} placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label className="form-label">File Type</label>
                  <select className="form-select" style={inp} value={form.file_type || 'PDF'} onChange={e => setField('file_type', e.target.value)}>
                    {['PDF', 'Notion', 'Google Sheets', 'Google Doc', 'Link'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {section === 'Event' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" style={inp} value={form.title || ''} onChange={e => setField('title', e.target.value)} placeholder="Weekly Group Call" />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" style={inp} value={form.type || 'Live'} onChange={e => setField('type', e.target.value)}>
                    {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" style={inp} value={form.description || ''} onChange={e => setField('description', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" style={inp} type="date" value={form.event_date || ''} onChange={e => setField('event_date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Time</label>
                  <input className="form-input" style={inp} value={form.time || ''} onChange={e => setField('time', e.target.value)} placeholder="12:00 PM EST" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <input className="form-input" style={inp} value={form.duration || ''} onChange={e => setField('duration', e.target.value)} placeholder="90 min" />
                </div>
                <div className="form-group">
                  <label className="form-label">Platform</label>
                  <input className="form-input" style={inp} value={form.platform || ''} onChange={e => setField('platform', e.target.value)} placeholder="Zoom" />
                </div>
              </div>
            </>
          )}

          {section === 'Link' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" style={inp} value={form.name || ''} onChange={e => setField('name', e.target.value)} placeholder="HoneyBook" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" style={inp} value={form.category || 'Software'} onChange={e => setField('category', e.target.value)}>
                    {LINK_CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" style={inp} value={form.description || ''} onChange={e => setField('description', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">URL *</label>
                  <input className="form-input" style={inp} value={form.url || ''} onChange={e => setField('url', e.target.value)} placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Emoji</label>
                  <input className="form-input" style={inp} value={form.emoji || ''} onChange={e => setField('emoji', e.target.value)} placeholder="📋" />
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
            <button className="submit-btn" style={{ margin: 0 }} onClick={save} disabled={saving}>
              {saving ? 'Saving...' : editId ? `Save Changes` : `Add ${section}`}
            </button>
            {editId && (
              <button onClick={cancelEdit} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 20px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Cancel
              </button>
            )}
          </div>
          {success && (
            <div className="success-msg" style={{ color: success.startsWith('Error') ? 'var(--pink)' : 'var(--cyan)', marginTop: 12 }}>
              {success}
            </div>
          )}
        </div>

        {/* EXISTING ITEMS */}
        <div style={{ marginTop: 32 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
            Existing {section}s ({items.length})
          </div>

          {loadingItems ? (
            <div className="loading">Loading...</div>
          ) : items.length === 0 ? (
            <div className="empty">None yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(item => (
                <div key={item.id} style={{
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
                  padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{getItemLabel(item)}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.05em' }}>{getItemMeta(item)}</div>
                  </div>
                  <button
                    onClick={() => startEdit(item)}
                    style={{ background: 'rgba(0,245,228,0.08)', border: '1px solid rgba(0,245,228,0.2)', borderRadius: 6, padding: '6px 12px', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    style={{ background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 6, padding: '6px 12px', color: 'var(--pink)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', marginTop: 24 }}>
          Keep this URL private.
        </div>
      </div>
    </div>
  )
}
