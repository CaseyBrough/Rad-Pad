import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const FILTERS = ['All', 'Templates', 'Guides', 'Scripts', 'Finance']

const ICON_COLORS = {
  Templates: '#00F5E4', Guides: '#B47EFF', Scripts: '#FF2D78', Finance: '#FFB432'
}

export default function Resources() {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false })
      setResources(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const visible = resources.filter(r => {
    const matchFilter = filter === 'All' || r.category === filter
    const matchSearch = !search ||
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <Layout>
      <div className="section-label">Library</div>
      <div className="section-title">Resources</div>
      <p className="section-desc">Downloadable files, templates, and guides — all in one place.</p>

      <div className="controls">
        <input
          className="search-input"
          placeholder="Search resources..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-tags">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`filter-tag${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading resources...</div>
      ) : visible.length === 0 ? (
        <div className="empty">No resources found.</div>
      ) : (
        <div className="card-grid">
          {visible.map(res => {
            const c = ICON_COLORS[res.category] || '#FF2D78'
            return (
              <div key={res.id} className="card">
                <div className="res-icon" style={{
                  background: `${c}18`,
                  border: `1px solid ${c}33`
                }}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="12" height="14" rx="1.5" stroke={c} strokeWidth="1.3"/>
                    <path d="M5 6h6M5 9h4" stroke={c} strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="res-title">{res.title}</div>
                <div className="res-desc">{res.description}</div>
                <div className="res-footer">
                  <span className="res-type">{res.category} · {res.file_type}</span>
                  {res.file_url && (
                    <a
                      className="dl-btn"
                      href={res.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                    >
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
