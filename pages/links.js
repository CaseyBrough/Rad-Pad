import { useState, useEffect, useMemo, useRef } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import SidePanel from '../components/SidePanel'
import { toast } from '../components/Toaster'
import { useSeenSnapshot, isNewSince } from '../lib/newSince'

const CATEGORIES = ['Software', 'Gear', 'Finance', 'Education']
const CAT_COLORS = { Software: '#00F5E4', Gear: '#FFB432', Finance: '#B47EFF', Education: '#FF2D78' }
const colorOf = cat => CAT_COLORS[cat] || '#FF2D78'

// Logos come from Google's favicon service. Flip this off to fall back to the
// emoji icons only (no third-party request when the page loads).
const USE_FAVICONS = true

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

// Logo lookup works on the brand's main domain: next.frame.io -> frame.io,
// manychat.partnerlinks.io (an affiliate link) -> manychat.com.
function logoHost(host) {
  const partner = host.match(/^([a-z0-9-]+)\.partnerlinks\.io$/i)
  if (partner) return `${partner[1]}.com`
  const labels = host.split('.')
  return labels.length > 2 ? labels.slice(-2).join('.') : host
}

// Descriptions are free text typed by members. Pull a promo code out of them so
// it can be shown (and copied) as a perk instead of buried in a sentence.
function readPerk(desc) {
  const text = String(desc || '')
  const code = text.match(/use code:?\s*([A-Za-z0-9_-]{3,24})/i)
  if (!code) return null
  const off = text.match(/(\d{1,2}\s?%\s*off)/i)
  return { code: code[1].toUpperCase(), off: off ? off[1].replace(/\s+/g, ' ') : null }
}

function cleanDescription(desc, hasPerk) {
  const lines = String(desc || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const kept = hasPerk ? lines.filter(l => !/use code/i.test(l)) : lines
  return kept.join(' · ')
}

function isMemberBuilt(desc) { return /built by a rad pad member/i.test(desc || '') }

function Logo({ link }) {
  const [broken, setBroken] = useState(false)
  const host = hostOf(link.url)
  const fallback = link.emoji || '🔗'
  if (!USE_FAVICONS || !host || broken) return <span className="lk-logo emoji" aria-hidden="true">{fallback}</span>
  return (
    <span className="lk-logo" aria-hidden="true">
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(logoHost(host))}&sz=64`}
        alt=""
        width="28" height="28"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        onLoad={e => { if (e.currentTarget.naturalWidth < 24) setBroken(true) }}
      />
    </span>
  )
}

function copyCode(code) {
  const ok = () => toast(`Code ${code} copied`)
  const fail = () => toast(`Code: ${code}`)
  try {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(ok, fail)
    else fail()
  } catch { fail() }
}

function LinkCard({ link, isNew }) {
  const [open, setOpen] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const descRef = useRef(null)
  const perk = readPerk(link.description)
  const desc = cleanDescription(link.description, !!perk)

  // Only offer "Read more" when the clamp is actually hiding text.
  useEffect(() => {
    const el = descRef.current
    if (!el || open) return
    const check = () => setTruncated(el.scrollHeight > el.clientHeight + 1)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [desc, open])
  const c = colorOf(link.category)
  return (
    <div className="lk-card" style={{ '--c': c }}>
      <div className="lk-head">
        <Logo link={link} />
        <div className="lk-id">
          <a className="lk-name" href={link.url} target="_blank" rel="noopener noreferrer">{link.name}</a>
          <span className="lk-host">{hostOf(link.url)}</span>
        </div>
        {isNew && <span className="new-chip">New</span>}
      </div>

      {desc && <p ref={descRef} className={`lk-desc${open ? '' : ' clamp'}`}>{desc}</p>}
      {(truncated || open) && (
        <button type="button" className="lk-more" onClick={() => setOpen(o => !o)}>{open ? 'Show less' : 'Read more'}</button>
      )}

      <div className="lk-foot">
        <span className="lk-cat">{link.category}</span>
        {isMemberBuilt(link.description) && <span className="lk-badge">Member-built</span>}
        {perk && (
          <button type="button" className="lk-perk" onClick={() => copyCode(perk.code)} title="Copy promo code">
            {perk.off ? `${perk.off} · ` : ''}<b>{perk.code}</b> <span aria-hidden="true">⧉</span>
          </button>
        )}
        <span className="lk-visit" aria-hidden="true">Visit ↗</span>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="lk-grid">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="lk-card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="shimmer" style={{ width: 48, height: 48, borderRadius: 12 }} />
            <div className="shimmer" style={{ height: 16, width: '50%', borderRadius: 4 }} />
          </div>
          <div className="shimmer" style={{ height: 12, width: '100%', borderRadius: 4 }} />
          <div className="shimmer" style={{ height: 12, width: '75%', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

export default function Links() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
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

  const categories = useMemo(() => {
    const counts = {}
    links.forEach(l => { if (l.category) counts[l.category] = (counts[l.category] || 0) + 1 })
    const known = CATEGORIES.filter(c => counts[c]).map(c => [c, counts[c]])
    const extra = Object.entries(counts).filter(([c]) => !CATEGORIES.includes(c))
    return [...known, ...extra]
  }, [links])

  const q = search.trim().toLowerCase()
  const visible = links.filter(l => {
    const matchFilter = filter === 'All' || l.category === filter
    const matchSearch = !q || `${l.name} ${l.description} ${l.category} ${hostOf(l.url)}`.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const browsing = filter === 'All' && !q
  const perks = browsing ? links.filter(l => readPerk(l.description)) : []
  const sections = browsing
    ? categories.map(([cat]) => ({ cat, items: links.filter(l => l.category === cat) })).filter(s => s.items.length)
    : [{ cat: null, items: visible }]

  const card = l => <LinkCard key={l.id} link={l} isNew={isNewSince(l.created_at, seenSnapshot)} />

  return (
    <Layout>
      <div className="section-label">Curated</div>
      <div className="section-title">Links</div>
      <p className="section-desc">The tools, gear, and services this community actually uses — recommended by members, reviewed before they go up.</p>

      <div className="controls">
        <input className="search-input" type="search" placeholder="Search tools…" aria-label="Search links" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="filter-tags">
          <button className={`filter-tag${filter === 'All' ? ' active' : ''}`} onClick={() => setFilter('All')}>All · {links.length}</button>
          {categories.map(([cat, n]) => (
            <button key={cat} className={`filter-tag${filter === cat ? ' active' : ''}`} onClick={() => setFilter(cat)}>{cat} · {n}</button>
          ))}
        </div>
        <span className="controls-spacer" />
        {submitted ? <span className="pending-pill">✓ Sent for review</span> : (
          <button type="button" className="btn pink" onClick={() => setShowForm(true)}>+ Suggest a link</button>
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
          <p className="panel-note">Goes to the admin for a quick review before it shows up here. Got a member discount? Add “Use code: YOURCODE” to the description and it will show up as a perk.</p>
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
        <div className="empty">No links match that search.</div>
      ) : (
        <>
          {perks.length > 0 && (
            <section className="sec">
              <div className="sec-head"><h2>Member perks</h2><span className="count">{perks.length}</span></div>
              <div className="lk-grid">{perks.map(card)}</div>
            </section>
          )}
          {sections.map(s => (
            <section key={s.cat || 'results'} className="sec">
              {s.cat && <div className="sec-head"><h2>{s.cat}</h2><span className="count">{s.items.length}</span></div>}
              <div className="lk-grid">{s.items.map(card)}</div>
            </section>
          ))}
        </>
      )}
    </Layout>
  )
}
