import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import SidePanel from '../components/SidePanel'
import { toast } from '../components/Toaster'
import { useSeenSnapshot, isNewSince } from '../lib/newSince'

const FILTERS = ['All', 'Software', 'Gear', 'Finance', 'Education']
const CATEGORIES = ['Software', 'Gear', 'Finance', 'Education']

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 9, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, width: '40%', background: 'rgba(255,255,255,0.07)', borderRadius: 4, marginBottom: 7 }} />
            <div style={{ height: 11, width: '70%', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
          </div>
          <div style={{ height: 24, width: 60, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

export default function Links() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', description: '', url: '', category: 'Software', emoji: '' })
  const seenSnapshot = useSeenSnapshot('links')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('links').select('*').eq('approved', true).order('created_at', { ascending: false })
    setLinks(data || [])
    setLoading(false)
  }

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function submit() {
    if (!form.name || !form.url) { setError('Name and URL are required.'); return }
    setSaving(true)
    setError('')
    let url = form.url.trim()
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url
    const { error: insertError } = await supabase.from('links').insert([{ ...form, url, approved: false }])
    if (insertError) { setError('Submission failed. Try again.'); setSaving(false); return }
    setSaving(false)
    setShowForm(false)
    setSubmitted(true)
    toast("Sent for review — it'll show up here once it's approved.")
  }

  const visible = links.filter(l => filter === 'All' || l.category === filter)

  return (
    <Layout>
      <div className="section-label">Curated</div>
      <div className="section-title">Links</div>
      <p className="section-desc">Tools, services, and recommendations from the community — vetted and sorted.</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div className="filter-tags">
          {FILTERS.map(f => (
            <button key={f} className={`filter-tag${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        {submitted && <span className="pending-pill">✓ Sent for review</span>}
        {!submitted && (
          <button
            onClick={() => setShowForm(true)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(255,45,120,0.15)', border: '1px solid rgba(255,45,120,0.35)', borderRadius: 8, padding: '10px 18px', color: 'var(--pink)', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(255,45,120,0.35)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            + Suggest a Link
          </button>
        )}
      </div>

      {showForm && (
        <SidePanel
          title="Suggest a link"
          onClose={() => setShowForm(false)}
          onSubmit={submit}
          saving={saving}
          canSave={!!form.name.trim() && !!form.url.trim()}
          submitLabel="Submit for review"
        >
          <p className="panel-note">Goes to the admin for a quick review before it shows up here.</p>
          <div className="adm-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="ln-name">Name *</label>
              <input id="ln-name" className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="HoneyBook" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ln-emoji">Emoji icon</label>
              <input id="ln-emoji" className="form-input" value={form.emoji} onChange={e => setField('emoji', e.target.value)} placeholder="📋" />
            </div>
            <div className="form-group full">
              <label className="form-label" htmlFor="ln-url">URL *</label>
              <input id="ln-url" className="form-input" value={form.url} onChange={e => setField('url', e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-group full">
              <label className="form-label" htmlFor="ln-cat">Category</label>
              <select id="ln-cat" className="form-select" value={form.category} onChange={e => setField('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label" htmlFor="ln-desc">Description</label>
              <input id="ln-desc" className="form-input" value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Why this is worth checking out..." />
            </div>
          </div>
          {error && <div className="panel-error">{error}</div>}
        </SidePanel>
      )}

      {loading ? <Skeleton /> : visible.length === 0 ? (
        <div className="empty">No links found.</div>
      ) : (
        <div className="links-grid">
          {visible.map(link => (
            <a key={link.id} className="link-item" href={link.url} target="_blank" rel="noopener noreferrer">
              <div className="link-icon-wrap">{link.emoji || '🔗'}</div>
              <div className="link-info">
                <div className="link-name">{link.name}{isNewSince(link.created_at, seenSnapshot) && <span className="new-chip" style={{ marginLeft: 10 }}>New</span>}</div>
                <div className="link-desc">{link.description}</div>
              </div>
              <span className="link-cat">{link.category}</span>
            </a>
          ))}
        </div>
      )}
    </Layout>
  )
}
