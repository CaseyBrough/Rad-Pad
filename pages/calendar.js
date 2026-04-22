import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const TAG_COLORS = {
  'Live': 'tag-pink',
  'Workshop': 'tag-amber',
  'Office Hrs': 'tag-cyan',
  'Hot Seat': 'tag-purple',
  'Mindset': 'tag-purple',
  'Q&A': 'tag-cyan'
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
        <div className="loading">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="empty">No upcoming events.</div>
      ) : (
        <div className="event-list">
          {events.map(ev => {
            const { month, day } = formatDate(ev.event_date)
            const tagColor = TAG_COLORS[ev.type] || 'tag-cyan'
            return (
              <div key={ev.id} className="event-item">
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
                  <div className="event-meta">
                    {ev.time && <span>{ev.time}</span>}
                    {ev.duration && <span>{ev.duration}</span>}
                    {ev.platform && <span>{ev.platform}</span>}
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
