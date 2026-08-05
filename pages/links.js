import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

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
    setSubmitted(true)
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
        {!showForm && !submitted && (
          <button
            onClick={() => setShowForm(true)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(255,45,120,0.15)', border: '1px solid rgba(255,45,120,0.35)', borderRadius: 8, padding: '10px 18px', color: 'var(--pink)', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(255,45,120,0.35)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            + Suggest a Link
          </button>
        )}
      </div>

      {/* SUGGEST FORM */}
      {showForm && !submitted && (
        <div style={{ background: 'var(--card)', border: '1px solid rgba(255,45,120,0.25)', borderRadius: 14, padding: 28, marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, letterSpacing: '0.04em', marginBottom: 6 }}>Suggest a Link</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>Goes to the admin for a quick review before it shows up here.</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="HoneyBook" style={{ fontFamily: 'inherit' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setField('category', e.target.value)} style={{ fontFamily: 'inherit' }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }} className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Why this is worth checking out..." style={{ fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">URL *</label>
              <input className="form-input" value={form.url} onChange={e => setField('url', e.target.value)} placeholder="https://..." style={{ fontFamily: 'inherit' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Emoji Icon</label>
              <input className="form-input" value={form.emoji} onChange={e => setField('emoji', e.target.value)} placeholder="📋" style={{ fontFamily: 'inherit' }} />
            </div>
          </div>

          {error && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--pink)', marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="submit-btn" style={{ margin: 0 }} onClick={submit} disabled={saving}>
              {saving ? 'Submitting...' : 'Submit for Review'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 20px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {submitted && (
        <div style={{ background: 'rgba(0,245,228,0.06)', border: '1px solid rgba(0,245,228,0.25)', borderRadius: 14, padding: '28px 32px', marginBottom: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>✅</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, letterSpacing: '0.04em', marginBottom: 8 }}>Sent for review</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65 }}>Thanks for the suggestion — it'll show up here once it's approved.</div>
        </div>
      )}

      {loading ? <Skeleton /> : visible.length === 0 ? (
        <div className="empty">No links found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {visible.map(link => (
            <a key={link.id} className="link-item" href={link.url} target="_blank" rel="noopener noreferrer">
              <div className="link-icon-wrap">{link.emoji || '🔗'}</div>
              <div className="link-info">
                <div className="link-name">{link.name}</div>
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
