import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const SECTIONS = ['Recording', 'Resource', 'Event', 'Link']

const TAG_OPTIONS = ['Sales', 'Mindset', 'Ops', 'Pricing', 'Marketing', 'Q&A']
const RES_CATS = ['Templates', 'Guides', 'Scripts', 'Finance']
const EVENT_TYPES = ['Live', 'Workshop', 'Office Hrs', 'Hot Seat', 'Mindset', 'Q&A']
const LINK_CATS = ['Software', 'Gear', 'Finance', 'Education']

export default function Admin() {
  const [section, setSection] = useState('Recording')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  // Recording form
  const [rec, setRec] = useState({ title: '', description: '', date: '', duration: '', host: '', video_url: '', tags: [] })

  // Resource form
  const [res, setRes] = useState({ title: '', description: '', category: 'Templates', file_url: '', file_type: 'PDF' })

  // Event form
  const [ev, setEv] = useState({ title: '', description: '', event_date: '', time: '', duration: '', type: 'Live', platform: 'Zoom', zoom_url: '' })

  // Link form
  const [lnk, setLnk] = useState({ name: '', description: '', url: '', category: 'Software', emoji: '' })

  function toggleTag(tag) {
    setRec(r => ({
      ...r,
      tags: r.tags.includes(tag) ? r.tags.filter(t => t !== tag) : [...r.tags, tag]
    }))
  }

  async function save() {
    setSaving(true)
    setSuccess('')
    let error
    if (section === 'Recording') {
      ;({ error } = await supabase.from('recordings').insert([rec]))
      if (!error) setRec({ title: '', description: '', date: '', duration: '', host: '', video_url: '', tags: [] })
    } else if (section === 'Resource') {
      ;({ error } = await supabase.from('resources').insert([res]))
      if (!error) setRes({ title: '', description: '', category: 'Templates', file_url: '', file_type: 'PDF' })
    } else if (section === 'Event') {
      ;({ error } = await supabase.from('events').insert([ev]))
      if (!error) setEv({ title: '', description: '', event_date: '', time: '', duration: '', type: 'Live', platform: 'Zoom', zoom_url: '' })
    } else if (section === 'Link') {
      ;({ error } = await supabase.from('links').insert([lnk]))
      if (!error) setLnk({ name: '', description: '', url: '', category: 'Software', emoji: '' })
    }
    setSaving(false)
    setSuccess(error ? `Error: ${error.message}` : `${section} added successfully.`)
  }

  const inputStyle = { fontFamily: 'inherit' }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '40px 36px', fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--pink)', textShadow: '0 0 20px rgba(255,45,120,0.4)', marginBottom: 4 }}>The Rad Pad</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>Admin Panel</div>
        </div>

        {/* Section switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {SECTIONS.map(s => (
            <button
              key={s}
              className={`filter-tag${section === s ? ' active' : ''}`}
              onClick={() => { setSection(s); setSuccess('') }}
            >
              Add {s}
            </button>
          ))}
        </div>

        <div className="admin-form">
          {/* RECORDING */}
          {section === 'Recording' && (
            <>
              <h2>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="var(--pink)" strokeWidth="1.3"/><path d="M6.5 5.5l4 2.5-4 2.5V5.5z" fill="var(--pink)"/></svg>
                Add Recording
              </h2>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" style={inputStyle} value={rec.title} onChange={e => setRec(r => ({ ...r, title: e.target.value }))} placeholder="Q2 Sales Sprint: Closing Higher-Value Clients" />
                </div>
                <div className="form-group">
                  <label className="form-label">Host</label>
                  <input className="form-input" style={inputStyle} value={rec.host} onChange={e => setRec(r => ({ ...r, host: e.target.value }))} placeholder="Jamie Reeves" />
                </div>
              </div>
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" style={inputStyle} value={rec.description} onChange={e => setRec(r => ({ ...r, description: e.target.value }))} placeholder="Brief description of what was covered..." />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date (YYYY-MM-DD)</label>
                  <input className="form-input" style={inputStyle} type="date" value={rec.date} onChange={e => setRec(r => ({ ...r, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (e.g. 1h 12m)</label>
                  <input className="form-input" style={inputStyle} value={rec.duration} onChange={e => setRec(r => ({ ...r, duration: e.target.value }))} placeholder="58m" />
                </div>
              </div>
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Video URL (Zoom / Loom / Drive link)</label>
                  <input className="form-input" style={inputStyle} value={rec.video_url} onChange={e => setRec(r => ({ ...r, video_url: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tags</label>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 6 }}>
                  {TAG_OPTIONS.map(tag => (
                    <button
                      key={tag}
                      className={`filter-tag${rec.tags.includes(tag) ? ' active' : ''}`}
                      onClick={() => toggleTag(tag)}
                      type="button"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* RESOURCE */}
          {section === 'Resource' && (
            <>
              <h2>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="14" rx="1.5" stroke="var(--pink)" strokeWidth="1.3"/><path d="M5 6h6M5 9h4" stroke="var(--pink)" strokeWidth="1.3" strokeLinecap="round"/></svg>
                Add Resource
              </h2>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" style={inputStyle} value={res.title} onChange={e => setRes(r => ({ ...r, title: e.target.value }))} placeholder="Discovery Call Script" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" style={inputStyle} value={res.category} onChange={e => setRes(r => ({ ...r, category: e.target.value }))}>
                    {RES_CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" style={inputStyle} value={res.description} onChange={e => setRes(r => ({ ...r, description: e.target.value }))} placeholder="What's in this resource and who it's for..." />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">File / Link URL</label>
                  <input className="form-input" style={inputStyle} value={res.file_url} onChange={e => setRes(r => ({ ...r, file_url: e.target.value }))} placeholder="https://drive.google.com/..." />
                </div>
                <div className="form-group">
                  <label className="form-label">File Type</label>
                  <select className="form-select" style={inputStyle} value={res.file_type} onChange={e => setRes(r => ({ ...r, file_type: e.target.value }))}>
                    {['PDF', 'Notion', 'Google Sheets', 'Google Doc', 'Link'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* EVENT */}
          {section === 'Event' && (
            <>
              <h2>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="var(--pink)" strokeWidth="1.3"/><path d="M5 2v2M11 2v2M2 7h12" stroke="var(--pink)" strokeWidth="1.3" strokeLinecap="round"/></svg>
                Add Event
              </h2>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" style={inputStyle} value={ev.title} onChange={e => setEv(v => ({ ...v, title: e.target.value }))} placeholder="Weekly Group Call" />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" style={inputStyle} value={ev.type} onChange={e => setEv(v => ({ ...v, type: e.target.value }))}>
                    {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" style={inputStyle} value={ev.description} onChange={e => setEv(v => ({ ...v, description: e.target.value }))} placeholder="What members can expect from this session..." />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" style={inputStyle} type="date" value={ev.event_date} onChange={e => setEv(v => ({ ...v, event_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Time (e.g. 12:00 PM EST)</label>
                  <input className="form-input" style={inputStyle} value={ev.time} onChange={e => setEv(v => ({ ...v, time: e.target.value }))} placeholder="12:00 PM EST" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Duration (e.g. 90 min)</label>
                  <input className="form-input" style={inputStyle} value={ev.duration} onChange={e => setEv(v => ({ ...v, duration: e.target.value }))} placeholder="90 min" />
                </div>
                <div className="form-group">
                  <label className="form-label">Platform</label>
                  <input className="form-input" style={inputStyle} value={ev.platform} onChange={e => setEv(v => ({ ...v, platform: e.target.value }))} placeholder="Zoom" />
                </div>
              </div>
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Zoom Link (members click to join)</label>
                  <input className="form-input" style={inputStyle} value={ev.zoom_url || ''} onChange={e => setEv(v => ({ ...v, zoom_url: e.target.value }))} placeholder="https://zoom.us/j/..." />
                </div>
              </div>
            </>
          )}

          {/* LINK */}
          {section === 'Link' && (
            <>
              <h2>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5L7 4" stroke="var(--pink)" strokeWidth="1.3" strokeLinecap="round"/><path d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5L9 12" stroke="var(--pink)" strokeWidth="1.3" strokeLinecap="round"/></svg>
                Add Link
              </h2>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" style={inputStyle} value={lnk.name} onChange={e => setLnk(l => ({ ...l, name: e.target.value }))} placeholder="HoneyBook" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" style={inputStyle} value={lnk.category} onChange={e => setLnk(l => ({ ...l, category: e.target.value }))}>
                    {LINK_CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row single">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" style={inputStyle} value={lnk.description} onChange={e => setLnk(l => ({ ...l, description: e.target.value }))} placeholder="Why this is recommended..." />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">URL *</label>
                  <input className="form-input" style={inputStyle} value={lnk.url} onChange={e => setLnk(l => ({ ...l, url: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Emoji Icon</label>
                  <input className="form-input" style={inputStyle} value={lnk.emoji} onChange={e => setLnk(l => ({ ...l, emoji: e.target.value }))} placeholder="📋" />
                </div>
              </div>
            </>
          )}

          <button className="submit-btn" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : `Add ${section}`}
          </button>
          {success && (
            <div className="success-msg" style={{ color: success.startsWith('Error') ? 'var(--pink)' : 'var(--cyan)' }}>
              {success}
            </div>
          )}
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', marginTop: 12 }}>
          Keep this URL private. Changes appear on the site immediately.
        </div>
      </div>
    </div>
  )
}
