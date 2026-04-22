import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const FILTERS = ['All', 'Templates', 'Guides', 'Scripts', 'Finance']

const ICON_COLORS = { Templates: '#00F5E4', Guides: '#B47EFF', Scripts: '#FF2D78', Finance: '#FFB432' }

function Skeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 22, display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.05)', marginBottom: 14 }} />
          <div style={{ height: 14, width: '75%', background: 'rgba(255,255,255,0.07)', borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 11, width: '100%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 11, width: '80%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, marginBottom: 'auto' }} />
          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0 12px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ height: 10, width: '40%', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
            <div style={{ height: 26, width: 70, background: 'rgba(255,255,255,0.04)', borderRadius: 5 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Resources() {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('resources').select('*').order('created_at', { ascending: false })
      setResources(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const visible = resources.filter(r => {
    const matchFilter = filter === 'All' || r.category === filter
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <Layout>
      <div className="section-label">Library</div>
      <div className="section-title">Resources</div>
      <p className="section-desc">Downloadable files, templates, and guides — all in one place.</p>

      <div className="controls">
        <input className="search-input" placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="filter-tags">
          {FILTERS.map(f => (
            <button key={f} className={`filter-tag${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? <Skeleton /> : visible.length === 0 ? (
        <div className="empty">No resources found.</div>
      ) : (
        <div className="card-grid">
          {visible.map((res, idx) => {
            const c = ICON_COLORS[res.category] || '#FF2D78'
            const isNewest = idx === 0 && filter === 'All' && !search
            return (
              <div key={res.id} className="card" style={isNewest ? { borderColor: `${c}55`, background: `${c}08` } : {}}>
                <div className="res-icon" style={{ background: `${c}18`, border: `1px solid ${c}33` }}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="12" height="14" rx="1.5" stroke={c} strokeWidth="1.3"/>
                    <path d="M5 6h6M5 9h4" stroke={c} strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>
                {isNewest && (
                  <div style={{ position: 'absolute', top: 14, right: 14, fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: c, background: `${c}20`, border: `1px solid ${c}40`, borderRadius: 4, padding: '2px 7px' }}>New</div>
                )}
                <div className="res-title">{res.title}</div>
                <div className="res-desc">{res.description}</div>
                <div className="res-footer">
                  <span className="res-type">{res.category} · {res.file_type}</span>
                  {res.file_url && (
                    <a className="dl-btn" href={res.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                      {res.file_type === 'Link' ? 'Open' : 'Download'}
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
