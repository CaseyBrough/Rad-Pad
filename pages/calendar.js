import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import AddToCalendar from '../components/AddToCalendar'
import MonthGrid from '../components/MonthGrid'
import { useNow } from '../components/Countdown'
import { supabase } from '../lib/supabase'
import { useSeenSnapshot, isNewSince } from '../lib/newSince'
import { eventSpan, formatInViewerZone, calendarDaysUntil, hasDate, isNotice } from '../lib/calendar'

const CALENDLY_URL = 'https://calendly.com/radpad2026/2hrs?month=2026-04'

function getTagColor(type) {
  if (type === 'Live') return 'tag-pink'
  if (type === 'Workshop') return 'tag-amber'
  if (type === 'Office Hrs') return 'tag-cyan'
  if (type === 'Hot Seat') return 'tag-purple'
  if (type === 'Mindset') return 'tag-purple'
  if (type === 'Skills Call') return 'tag-amber'
  if (type === 'Q&A') return 'tag-purple'
  return 'tag-cyan'
}

function dateParts(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: d.getDate(),
    weekday: d.toLocaleString('en-US', { weekday: 'long' }),
    group: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  }
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="ev-row skel">
          <div className="ev-date shimmer" />
          <div style={{ flex: 1 }}>
            <div className="shimmer" style={{ height: 16, width: '55%', borderRadius: 4, marginBottom: 12 }} />
            <div className="shimmer" style={{ height: 12, width: '85%', borderRadius: 4, marginBottom: 8 }} />
            <div className="shimmer" style={{ height: 12, width: '40%', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Calendar() {
  const [events, setEvents] = useState([])
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)
  const seenSnapshot = useSeenSnapshot('events')
  const now = useNow(30000)

  useEffect(() => {
    async function load() {
      const [ev, rec] = await Promise.all([
        supabase.from('events').select('*').order('event_date', { ascending: true }),
        supabase.from('recordings').select('id,date,title').order('date', { ascending: false }),
      ])
      setEvents(ev.data || [])
      setRecordings(rec.data || [])
      setLoading(false)
    }
    load()
  }, [])

  // A call counts as upcoming until it has finished, in the member's timezone.
  // Drafts with no usable date are kept aside as "date to be announced".
  const { upcoming, past, undated } = useMemo(() => {
    if (!now) return { upcoming: [], past: [], undated: [] }
    const withSpan = events.filter(hasDate).map(ev => ({ ev, span: eventSpan(ev) }))
    return {
      upcoming: withSpan.filter(x => x.span.endMs > now).sort((a, b) => a.span.startMs - b.span.startMs),
      past: withSpan.filter(x => x.span.endMs <= now).sort((a, b) => b.span.startMs - a.span.startMs),
      undated: events.filter(ev => !hasDate(ev)),
    }
  }, [events, now])

  // The replay for a past call, found by matching the date.
  const recordingByDate = useMemo(() => {
    const map = new Map()
    recordings.forEach(r => { if (r.date && !map.has(r.date)) map.set(r.date, r) })
    return map
  }, [recordings])

  // Group upcoming calls under month headings.
  const groups = useMemo(() => {
    const out = []
    upcoming.forEach(item => {
      const label = dateParts(item.ev.event_date).group
      const last = out[out.length - 1]
      if (last && last.label === label) last.items.push(item)
      else out.push({ label, items: [item] })
    })
    return out
  }, [upcoming])

  const nextId = upcoming.find(x => !isNotice(x.ev))?.ev.id

  return (
    <Layout>
      <div className="section-label">Schedule</div>
      <div className="section-title">Calendar</div>
      <p className="section-desc">Upcoming community calls, events, and office hours — shown in your time.</p>

      {/* Host a call CTA */}
      <div className="cta-strip">
        <div>
          <div className="cta-title">Want to host a call?</div>
          <div className="cta-sub">Grab a slot and bring a topic — the community loves member-led sessions.</div>
        </div>
        <a className="cta-btn" href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">Book a Slot →</a>
      </div>

      {loading || !now ? <Skeleton /> : (
        <>
          <MonthGrid events={events.filter(hasDate)} now={now} recordingByDate={recordingByDate} bookUrl={CALENDLY_URL} />

          {upcoming.length === 0 ? (
            <div className="empty-card">
              <div style={{ fontSize: 32, marginBottom: 14 }}>📅</div>
              <div className="empty-title">Next Call TBD</div>
              <div className="empty-text">Nothing scheduled yet — check back soon. Calls are usually posted 1–2 weeks out.</div>
            </div>
          ) : (
            groups.map(group => (
              <section key={group.label} className="ev-group">
                <h2 className="ev-month">{group.label}</h2>
                <div className="ev-list">
                  {group.items.map(({ ev, span }) => {
                    const { month, day, weekday } = dateParts(ev.event_date)
                    const isNext = ev.id === nextId
                    const notice = isNotice(ev)
                    const live = !notice && !span.allDay && now >= span.startMs && now < span.endMs
                    const days = calendarDaysUntil(span.startMs, now)
                    const when = notice ? null : live ? 'Happening now' : days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : null
                    return (
                      <article key={ev.id} className={`ev-row${isNext ? ' next' : ''}${notice ? ' notice' : ''}`}>
                        <div className="ev-date" aria-hidden="true">
                          <span>{month}</span>
                          <b>{day}</b>
                        </div>
                        <div className="ev-main">
                          <div className="ev-head">
                            <h3 className="ev-title">{ev.title}</h3>
                            {live && <span className="live-chip"><span className="live-dot" />Live</span>}
                            {notice && <span className="when-chip">Notice</span>}
                            {!live && isNext && <span className="next-chip">Up next</span>}
                            {!live && !isNext && isNewSince(ev.created_at, seenSnapshot) && <span className="new-chip">New</span>}
                            {when && !live && <span className="when-chip">{when}</span>}
                            {ev.type && <span className={`tag ${getTagColor(ev.type)} ev-type`}>{ev.type}</span>}
                          </div>
                          {ev.description && <p className="ev-desc">{ev.description}</p>}
                          <div className="ev-meta">
                            <span>{weekday}{ev.time ? ` · ${ev.time}` : ''}</span>
                            {ev.duration && <span>{ev.duration}</span>}
                            {ev.platform && <span>{ev.platform}</span>}
                          </div>
                          {span.hasZone && !notice && <div className="ev-local">Your time: {formatInViewerZone(span.startMs)}</div>}
                          {!notice && (
                            <div className="ev-actions">
                              {ev.zoom_url && <a className="btn-join" href={ev.zoom_url} target="_blank" rel="noopener noreferrer">Join on Zoom</a>}
                              <AddToCalendar ev={ev} />
                            </div>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            ))
          )}

          {undated.length > 0 && (
            <section className="ev-group">
              <h2 className="ev-month">Date to be announced</h2>
              <div className="ev-list">
                {undated.map(ev => (
                  <article key={ev.id} className="ev-row tba">
                    <div className="ev-date" aria-hidden="true"><span>TBA</span><b>?</b></div>
                    <div className="ev-main">
                      <div className="ev-head">
                        <h3 className="ev-title">{ev.title}</h3>
                        {ev.type && <span className={`tag ${getTagColor(ev.type)} ev-type`}>{ev.type}</span>}
                      </div>
                      {ev.description && <p className="ev-desc">{ev.description}</p>}
                      <div className="ev-meta">
                        {ev.time && <span>{ev.time}</span>}
                        {ev.duration && <span>{ev.duration}</span>}
                        {ev.platform && <span>{ev.platform}</span>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="ev-group">
              <button type="button" className="past-toggle" aria-expanded={showPast} onClick={() => setShowPast(v => !v)}>
                <span>Past calls <em>{past.length}</em></span>
                <span className="chev" aria-hidden="true">{showPast ? '−' : '+'}</span>
              </button>
              {showPast && (
                <div className="past-list">
                  {past.map(({ ev }) => {
                    const rec = recordingByDate.get(ev.event_date)
                    const { month, day } = dateParts(ev.event_date)
                    return (
                      <div key={ev.id} className="past-row">
                        <span className="past-date">{month} {day}</span>
                        <span className="past-title">{ev.title}</span>
                        {ev.type && <span className={`tag ${getTagColor(ev.type)}`}>{ev.type}</span>}
                        {rec ? (
                          <Link className="past-watch" href={{ pathname: '/recordings', query: { v: rec.id } }}>▶ Watch recording</Link>
                        ) : (
                          <span className="past-none">No recording</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </Layout>
  )
}
