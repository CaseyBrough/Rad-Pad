import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const TAG_COLORS = {
  Sales: 'tag-pink', Pricing: 'tag-amber', Mindset: 'tag-purple',
  Ops: 'tag-cyan', Marketing: 'tag-amber', 'Q&A': 'tag-cyan'
}

const FILTERS = ['All', 'Sales', 'Mindset', 'Ops', 'Pricing', 'Marketing', 'Q&A']

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
        <input
          className="search-input"
          placeholder="Search recordings..."
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
        <div className="loading">Loading recordings...</div>
      ) : visible.length === 0 ? (
        <div className="empty">No recordings found.</div>
      ) : (
        <div className="rec-list">
          {visible.map(rec => (
            <div
              key={rec.id}
              className="rec-item"
              onClick={() => rec.video_url && window.open(rec.video_url, '_blank')}
            >
              <div className="play-btn">
                <div className="play-triangle" />
              </div>
              <div className="rec-body">
                <div className="rec-tags">
                  {(rec.tags || []).map(tag => (
                    <span key={tag} className={`tag ${TAG_COLORS[tag] || 'tag-cyan'}`}>{tag}</span>
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
          ))}
        </div>
      )}
    </Layout>
  )
}
