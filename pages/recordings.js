import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useSeenSnapshot, isNewSince } from '../lib/newSince'

function getTypeColor(type) {
  if (type === 'Community Call') return 'tag-cyan'
  if (type === 'Skills Call') return 'tag-amber'
  if (type === 'Theme Call') return 'tag-purple'
  return 'tag-amber'
}

const FILTERS = ['All', 'Community Call', 'Skills Call', 'Theme Call']
const PAGE_SIZE = 12

// Hosts are typed by hand, so the same person shows up as "Casey O.",
// "Casey OFarrell" and "Casey O'Farrell". Group them by first name + the first
// letter of the last name, and split co-hosted calls ("A and B") into people.
function hostNames(host) {
  if (!host) return []
  return host
    .split(/\s*(?:,|&|\+|\band\b)\s*/i)
    .map(n => n.trim().replace(/\.+$/, ''))
    .filter(Boolean)
}

function hostKey(name) {
  const parts = name.toLowerCase().replace(/[’'`.]/g, '').split(/\s+/)
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}` : parts[0]
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 10, width: '30%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 10 }} />
            <div style={{ height: 14, width: '70%', background: 'rgba(255,255,255,0.07)', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 11, width: '90%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, marginBottom: 12 }} />
            <div style={{ height: 10, width: '40%', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Recordings() {
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [host, setHost] = useState('All')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const seenSnapshot = useSeenSnapshot('recordings')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('recordings')
        .select('*')
        .order('date', { ascending: false })
      setRecordings(data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Any change to what's being looked at starts the list back at the top page.
  useEffect(() => { setLimit(PAGE_SIZE) }, [filter, search, sort, host])

  // A host typed with just a first name ("Mattin") is the same person as the one
  // full name that shares it ("Mattin Peikari") - but only when that match is unique.
  const hostAlias = useMemo(() => {
    const keys = new Set()
    recordings.forEach(r => hostNames(r.host).forEach(n => keys.add(hostKey(n))))
    const alias = new Map()
    keys.forEach(k => {
      if (k.includes(' ')) return
      const full = [...keys].filter(x => x.startsWith(k + ' '))
      if (full.length === 1) alias.set(k, full[0])
    })
    return alias
  }, [recordings])
  const canon = name => { const k = hostKey(name); return hostAlias.get(k) || k }

  // Hosts with at least two calls, most-hosted first, labelled by their most common full-name spelling.
  const hostOptions = useMemo(() => {
    const groups = new Map()
    recordings.forEach(r => {
      const seen = new Set()
      hostNames(r.host).forEach(name => {
        const key = canon(name)
        if (seen.has(key)) return
        seen.add(key)
        const g = groups.get(key) || { key, count: 0, spellings: new Map() }
        g.count += 1
        g.spellings.set(name, (g.spellings.get(name) || 0) + 1)
        groups.set(key, g)
      })
    })
    return [...groups.values()]
      .filter(g => g.count >= 2)
      .map(g => ({
        key: g.key,
        count: g.count,
        // "Rebecca H" -> "Rebecca H." (a lone trailing initial reads better with its period)
        label: [...g.spellings.entries()].sort((a, b) => (+b[0].includes(' ') - +a[0].includes(' ')) || b[1] - a[1] || b[0].length - a[0].length)[0][0].replace(/\s([A-Za-z])$/, ' $1.'),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  }, [recordings, hostAlias]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.trim().toLowerCase()
  const visible = useMemo(() => {
    const list = recordings.filter(r => {
      const matchFilter = filter === 'All' || r.call_type === filter
      const matchHost = host === 'All' || hostNames(r.host).some(n => canon(n) === host)
      const matchSearch = !q ||
        r.title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.sub_topic?.toLowerCase().includes(q) ||
        r.host?.toLowerCase().includes(q)
      return matchFilter && matchHost && matchSearch
    })
    return sort === 'oldest' ? [...list].reverse() : list
  }, [recordings, filter, host, q, sort, hostAlias]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = visible.slice(0, limit)
  const remaining = visible.length - shown.length
  const pristine = filter === 'All' && host === 'All' && !q && sort === 'newest'

  return (
    <Layout>
      <div className="section-label">Archive</div>
      <div className="section-title">Call Recordings</div>
      <p className="section-desc">Every community call, skills session, and themed deep dive — searchable and organized.</p>

      <div className="controls">
        <input className="search-input" placeholder="Search recordings..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="filter-tags">
          {FILTERS.map(f => (
            <button key={f} className={`filter-tag${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      <div className="controls" style={{ marginTop: -12 }}>
        {hostOptions.length > 0 && (
          <select className="ctl-select" value={host} onChange={e => setHost(e.target.value)} aria-label="Filter by host">
            <option value="All">All hosts</option>
            {hostOptions.map(h => <option key={h.key} value={h.key}>{h.label} ({h.count})</option>)}
          </select>
        )}
        <select className="ctl-select" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort order">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        {!loading && <span className="more-count" style={{ marginLeft: 'auto' }}>{visible.length} {visible.length === 1 ? 'recording' : 'recordings'}</span>}
      </div>

      {loading ? <Skeleton /> : visible.length === 0 ? (
        <div className="empty">No recordings found.</div>
      ) : (
        <>
          <div className="rec-list">
            {shown.map((rec, idx) => {
              const isNewest = idx === 0 && pristine
              const isNew = isNewSince(rec.created_at, seenSnapshot)
              return (
                <div
                  key={rec.id}
                  className="rec-item"
                  style={isNewest ? { borderColor: 'rgba(255,45,120,0.35)', background: 'rgba(255,45,120,0.04)' } : {}}
                  onClick={() => rec.video_url && window.open(rec.video_url, '_blank')}
                >
                  <div className="play-btn">
                    <div className="play-triangle" />
                  </div>
                  <div className="rec-body">
                    <div className="rec-tags">
                      {isNew && <span className="new-chip">New</span>}
                      {isNewest && !isNew && (
                        <span className="tag" style={{ background: 'rgba(255,45,120,0.2)', color: 'var(--pink)', border: '1px solid rgba(255,45,120,0.4)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4 }}>Latest</span>
                      )}
                      {rec.call_type && (
                        <span className={`tag ${getTypeColor(rec.call_type)}`}>
                          {rec.call_type}{rec.sub_topic ? ` · ${rec.sub_topic}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="rec-title">{rec.title}</div>
                    <div className="rec-desc">{rec.description}</div>
                    <div className="rec-meta">
                      <span>{rec.date}</span>
                      {rec.duration && <span className="meta-dur">{rec.duration}</span>}
                      {rec.host && <span>Host: {rec.host}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {remaining > 0 && (
            <div className="more-wrap">
              <span className="more-count">Showing {shown.length} of {visible.length}</span>
              <button className="more-btn" onClick={() => setLimit(l => l + PAGE_SIZE)}>
                Show {Math.min(PAGE_SIZE, remaining)} more
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
