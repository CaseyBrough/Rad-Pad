import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const FILTERS = ['All', 'Software', 'Gear', 'Finance', 'Education']

export default function Links() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('links')
        .select('*')
        .order('created_at', { ascending: false })
      setLinks(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const visible = links.filter(l =>
    filter === 'All' || l.category === filter
  )

  return (
    <Layout>
      <div className="section-label">Curated</div>
      <div className="section-title">Links</div>
      <p className="section-desc">Tools, services, and recommendations from the community — vetted and sorted.</p>

      <div className="controls">
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
        <div className="loading">Loading links...</div>
      ) : visible.length === 0 ? (
        <div className="empty">No links found.</div>
      ) : (
        <div>
          {visible.map(link => (
            <a
              key={link.id}
              className="link-item"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="link-icon-wrap">
                {link.emoji || '🔗'}
              </div>
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
