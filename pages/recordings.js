import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

function getTagColor(tag) {
  if (tag === 'Sales' || tag === 'Pricing') return 'tag-pink'
  if (tag === 'Mindset') return 'tag-purple'
  if (tag === 'Ops') return 'tag-cyan'
  return 'tag-amber'
}

const FILTERS = ['All', 'Sales', 'Mindset', 'Ops', 'Pricing', 'Marketing', 'Q&A']

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

  const visible = recordings.filter(r => {
    const tags = r.tags || []
    const matchFilter = filter === 'All' || tags.includes(filter)
    const matchSearch = !search ||
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <Layout>
      <div className="section-label">Archive</div>
      <div className="section-title">Call Recordings</div>
      <p className="section-desc">Every coaching call, hot seat, and community session — searchable and tagged.</p>

      <div className="controls">
        <input className="search-input" placeholder="Search recordings..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="filter-tags">
          {FILTERS.map(f => (
            <button key={f} className={`filter-tag${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? <Skeleton /> : visible.length === 0 ? (
        <div className="empty">No recordings found.</div>
      ) : (
        <div className="rec-list">
          {visible.map((rec, idx) => {
            const isNewest = idx === 0 && filter === 'All' && !search
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
                    {isNewest && <span className="tag" style={{ background: 'rgba(255,45,120,0.2)', color: 'var(--pink)', border: '1px solid rgba(255,45,120,0.4)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4 }}>Latest</span>}
                    {(rec.tags || []).map(tag => (
                      <span key={tag} className={`tag ${getTagColor(tag)}`}>{tag}</span>
                    ))}
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
      )}
    </Layout>
  )
}
