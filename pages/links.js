import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const FILTERS = ['All', 'Software', 'Gear', 'Finance', 'Education']

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

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('links').select('*').order('created_at', { ascending: false })
      setLinks(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const visible = links.filter(l => filter === 'All' || l.category === filter)

  return (
    <Layout>
      <div className="section-label">Curated</div>
      <div className="section-title">Links</div>
      <p className="section-desc">Tools, services, and recommendations from the community — vetted and sorted.</p>

      <div className="controls">
        <div className="filter-tags">
          {FILTERS.map(f => (
            <button key={f} className={`filter-tag${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

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
