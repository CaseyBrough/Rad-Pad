import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

function getTagColor(type) {
  if (type === 'Live') return 'tag-pink'
  if (type === 'Workshop') return 'tag-amber'
  if (type === 'Office Hrs') return 'tag-cyan'
  if (type === 'Hot Seat') return 'tag-purple'
  if (type === 'Mindset') return 'tag-purple'
  return 'tag-cyan'
}

export default function Calendar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })
      setEvents(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function formatDate(dateStr) {
    if (!dateStr) return { month: '', day: '' }
    const d = new Date(dateStr + 'T00:00:00')
    return {
      month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
      day: d.getDate()
    }
  }

  return (
    <Layout>
      <div className="section-label">Schedule</div>
      <div className="section-title">Calendar</div>
      <p className="section-desc">Upcoming community calls, events, and office hours.</p>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', display: 'flex', gap: 24 }}>
              <div style={{ minWidth: 48, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: 10, width: 32, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
                <div style={{ height: 28, width: 36, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, width: '60%', background: 'rgba(255,255,255,0.07)', borderRadius: 4, marginBottom: 10 }} />
                <div style={{ height: 11, width: '90%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, marginBottom: 6 }} />
                <div style={{ height: 11, width: '70%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, marginBottom: 12 }} />
                <div style={{ height: 10, width: '40%', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '52px 40px', textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>📅</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, letterSpacing: '0.04em', color: 'var(--text)', marginBottom: 10 }}>Next Call TBD</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 24 }}>
            Nothing scheduled yet — check back soon. Calls are usually posted 1–2 weeks out.
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cyan)' }}>
            In the meantime → check the Slack for announcements
          </div>
        </div>
      ) : (
        <div className="event-list">
          {events.map(ev => {
            const { month, day } = formatDate(ev.event_date)
            const tagColor = getTagColor(ev.type)
            return (
              <div key={ev.id} className="event-item" style={{ cursor: 'default' }}>
                <div className="event-date-block">
                  <div className="event-month">{month}</div>
                  <div className="event-day">{day}</div>
                </div>
                <div className="event-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div className="event-title">{ev.title}</div>
                    {ev.type && <span className={`tag ${tagColor}`} style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>{ev.type}</span>}
                  </div>
                  <div className="event-desc">{ev.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div className="event-meta">
                      {ev.time && <span>{ev.time}</span>}
                      {ev.duration && <span>{ev.duration}</span>}
                      {ev.platform && <span>{ev.platform}</span>}
                    </div>
                    {ev.zoom_url && (
                      <a
                        href={ev.zoom_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: '#fff',
                          background: 'var(--pink)',
                          border: 'none',
                          borderRadius: 6,
                          padding: '7px 14px',
                          textDecoration: 'none',
                          boxShadow: '0 0 14px rgba(255,45,120,0.35)',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 22px rgba(255,45,120,0.6)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 14px rgba(255,45,120,0.35)'}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" stroke="white" strokeWidth="1.3"/>
                          <path d="M14 6l-4 2 4 2V6z" fill="white"/>
                        </svg>
                        Join Zoom
                      </a>
                    )}
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
