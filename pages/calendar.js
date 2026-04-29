import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const CALENDLY_URL = 'https://calendly.com/your-link-here'

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

  const today = new Date().toISOString().split('T')[0]

  return (
    <Layout>
      <div className="section-label">Schedule</div>
      <div className="section-title">Calendar</div>
      <p className="section-desc">Upcoming community calls, events, and office hours.</p>

      {/* Host a call CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'rgba(0,245,228,0.06)', border: '1px solid rgba(0,245,228,0.2)', borderRadius: 12, padding: '16px 22px', marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>Want to host a call?</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Grab a slot and bring a topic — the community loves member-led sessions.</div>
        </div>
        <a
          href={CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cyan)', background: 'rgba(0,245,228,0.1)', border: '1px solid rgba(0,245,228,0.3)', borderRadius: 8, padding: '10px 18px', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(0,245,228,0.35)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          Book a Slot →
        </a>
      </div>

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
          {[
            ...events.filter(ev => ev.event_date >= today),
            ...events.filter(ev => ev.event_date < today).reverse()
          ].map(ev => {
            const { month, day } = formatDate(ev.event_date)
            const tagColor = getTagColor(ev.type)
            const isPast = ev.event_date < today
            return (
              <div key={ev.id} className="event-item" style={isPast ? { opacity: 0.4, cursor: 'default' } : {}}>
                <div className="event-date-block" style={{ position: 'relative' }}>
                  <div className="event-month" style={isPast ? { color: 'var(--muted)' } : {}}>{month}</div>
                  <div className="event-day" style={isPast ? { color: 'var(--muted)' } : {}}>{day}</div>
                  {isPast && (
                    <svg viewBox="0 0 48 56" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.6 }}>
                      <line x1="0" y1="56" x2="48" y2="0" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <div className="event-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div className="event-title" style={isPast ? { textDecoration: 'line-through', textDecorationColor: 'rgba(255,255,255,0.2)' } : {}}>{ev.title}</div>
                    {isPast
                      ? <span style={{ marginLeft: 'auto', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: 4 }}>Past</span>
                      : ev.type && <span className={`tag ${tagColor}`} style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>{ev.type}</span>
                    }
                  </div>
                  <div className="event-desc">{ev.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div className="event-meta">
                      {ev.time && <span>{ev.time}</span>}
                      {ev.duration && <span>{ev.duration}</span>}
                      {ev.platform && <span>{ev.platform}</span>}
                    </div>
                    {ev.zoom_url && !isPast && (
                      <a
                        href={ev.zoom_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: 'var(--pink)', border: 'none', borderRadius: 6, padding: '7px 14px', textDecoration: 'none', boxShadow: '0 0 14px rgba(255,45,120,0.35)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 28px rgba(255,45,120,0.65)'}
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
