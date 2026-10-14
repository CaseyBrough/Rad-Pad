import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toaster'
import { useSeenSnapshot, isNewSince, parseTs } from '../lib/newSince'

const ICON_COLORS = { Templates: '#00F5E4', Guides: '#B47EFF', Scripts: '#FF2D78', Finance: '#FFB432' }
const colorOf = category => ICON_COLORS[category] || '#FF2D78'

// "PDF" / "Google Doc" / "Link" -> the short label printed on the document icon.
function typeLabel(fileType) {
  const t = String(fileType || '').toLowerCase()
  if (t.includes('pdf')) return 'PDF'
  if (t.includes('doc')) return 'DOC'
  if (t.includes('sheet') || t.includes('xls')) return 'XLS'
  if (t.includes('slide') || t.includes('ppt')) return 'PPT'
  if (t.includes('video')) return 'VID'
  if (t.includes('zip')) return 'ZIP'
  if (t.includes('link')) return 'URL'
  return (fileType || 'FILE').slice(0, 4).toUpperCase()
}

function DocIcon({ label, color, big }) {
  const w = big ? 64 : 48
  return (
    <svg className="doc-icon" width={w} height={w * 1.2} viewBox="0 0 48 58" fill="none" aria-hidden="true">
      <path d="M6 4a4 4 0 0 1 4-4h20l12 12v42a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V4Z" fill={`${color}14`} stroke={color} strokeOpacity="0.6" strokeWidth="1.5" />
      <path d="M30 0v8a4 4 0 0 0 4 4h8" stroke={color} strokeOpacity="0.6" strokeWidth="1.5" />
      <rect x="11" y="33" width="26" height="14" rx="3" fill={color} />
      <text x="24" y="43.2" textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="600" fontSize="9" letterSpacing="0.6" fill="#0D0A0E">{label}</text>
      <path d="M12 20h18M12 25h12" stroke={color} strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function copyLink(url) {
  const ok = () => toast('Link copied')
  const fail = () => toast('Could not copy that link.', { type: 'error' })
  try {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(ok, fail)
    else fail()
  } catch { fail() }
}

function Skeleton() {
  return (
    <div className="rs-grid">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rs-card">
          <div className="shimmer" style={{ width: 48, height: 58, borderRadius: 8 }} />
          <div className="shimmer" style={{ height: 16, width: '70%', borderRadius: 4 }} />
          <div className="shimmer" style={{ height: 12, width: '100%', borderRadius: 4 }} />
          <div className="shimmer" style={{ height: 12, width: '80%', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

function Actions({ res }) {
  if (!res.file_url) return null
  return (
    <div className="rs-actions">
      <a className="btn pink sm" href={res.file_url} target="_blank" rel="noopener noreferrer">Open ↗</a>
      <button type="button" className="btn sm" onClick={() => copyLink(res.file_url)}>Copy link</button>
    </div>
  )
}

function Card({ res, isNew }) {
  const c = colorOf(res.category)
  return (
    <article className="rs-card" style={{ '--c': c }}>
      <div className="rs-top">
        <DocIcon label={typeLabel(res.file_type)} color={c} />
        <div className="rs-tags">
          <span className="rs-cat">{res.category}</span>
          {isNew && <span className="new-chip">New</span>}
        </div>
      </div>
      <h3 className="rs-title">{res.title}</h3>
      {res.description && <p className="rs-desc">{res.description}</p>}
      <div className="rs-foot">
        <span className="rs-type">{res.file_type}</span>
        <Actions res={res} />
      </div>
    </article>
  )
}

function Featured({ res, isNew }) {
  const c = colorOf(res.category)
  return (
    <article className="rs-feature" style={{ '--c': c }}>
      <div className="rs-feature-art"><DocIcon label={typeLabel(res.file_type)} color={c} big /></div>
      <div className="rs-feature-body">
        <div className="lib-eyebrow cyan"><span className="dot" />{isNew ? 'New' : 'Latest'} · {res.category}</div>
        <h2 className="rs-feature-title">{res.title}</h2>
        {res.description && <p className="rs-feature-desc">{res.description}</p>}
        <div className="rs-foot flat">
          <span className="rs-type">{res.file_type}{res.created_at && parseTs(res.created_at) ? ` · Added ${parseTs(res.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</span>
          <Actions res={res} />
        </div>
      </div>
    </article>
  )
}

export default function Resources() {
  const router = useRouter()
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const seenSnapshot = useSeenSnapshot('resources')

  // /resources?q=Title (from the global search) pre-fills the search box.
  useEffect(() => {
    if (router.isReady && typeof router.query.q === 'string') setSearch(router.query.q)
  }, [router.isReady, router.query.q])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('resources').select('*').order('created_at', { ascending: false })
      setResources(data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Only offer categories that actually have something in them.
  const categories = useMemo(() => {
    const counts = {}
    resources.forEach(r => { if (r.category) counts[r.category] = (counts[r.category] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [resources])

  const q = search.trim().toLowerCase()
  const visible = resources.filter(r => {
    const matchFilter = filter === 'All' || r.category === filter
    const matchSearch = !q || r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const showFeature = filter === 'All' && !q && visible.length >= 3
  const feature = showFeature ? visible[0] : null
  const rest = showFeature ? visible.slice(1) : visible

  return (
    <Layout>
      <div className="section-label">Library</div>
      <div className="section-title">Resources</div>
      <p className="section-desc">Guides, templates, and the handouts from our skills calls. {resources.length > 0 ? `${resources.length} ${resources.length === 1 ? 'resource' : 'resources'} and counting.` : ''}</p>

      <div className="controls">
        <input className="search-input" type="search" placeholder="Search resources…" aria-label="Search resources" value={search} onChange={e => setSearch(e.target.value)} />
        {categories.length > 1 && (
          <div className="filter-tags">
            <button className={`filter-tag${filter === 'All' ? ' active' : ''}`} onClick={() => setFilter('All')}>All · {resources.length}</button>
            {categories.map(([cat, n]) => (
              <button key={cat} className={`filter-tag${filter === cat ? ' active' : ''}`} onClick={() => setFilter(cat)}>{cat} · {n}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? <Skeleton /> : visible.length === 0 ? (
        <div className="empty">{resources.length === 0 ? 'Nothing here yet — new guides land after each skills call.' : 'No resources match that search.'}</div>
      ) : (
        <>
          {feature && <Featured res={feature} isNew={isNewSince(feature.created_at, seenSnapshot)} />}
          {rest.length > 0 && (
            <div className="rs-grid">
              {rest.map(res => <Card key={res.id} res={res} isNew={isNewSince(res.created_at, seenSnapshot)} />)}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
