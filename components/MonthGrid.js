import { useState, useMemo } from 'react'
import Link from 'next/link'
import AddToCalendar from './AddToCalendar'
import { CALL_WEEKDAYS, eventSpan, formatInViewerZone, isNotice } from '../lib/calendar'
import { callTypeDot } from '../lib/callTypes'

// Month view of the call schedule. A filled dot is a booked call; an open dot is
// a standing call day with nothing booked yet; a dash is a "no call" notice.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const pad = n => String(n).padStart(2, '0')
const key = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

function dotColor(type) {
  if (callTypeDot(type)) return callTypeDot(type)
  if (type === 'Skills Call' || type === 'Workshop') return 'amber'
  if (type === 'Q&A' || type === 'Mindset' || type === 'Theme Call' || type === 'Hot Seat') return 'purple'
  if (type === 'Live') return 'pink'
  return 'cyan'
}
const TAG = { amber: 'tag-amber', purple: 'tag-purple', pink: 'tag-pink', cyan: 'tag-cyan' }

export default function MonthGrid({ events, now, recordingByDate, bookUrl }) {
  const today = useMemo(() => {
    const d = new Date(now)
    return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() }
  }, [now])
  const todayKey = key(today.y, today.m, today.d)

  const byDate = useMemo(() => {
    const map = new Map()
    events.forEach(ev => {
      const list = map.get(ev.event_date) || []
      list.push(ev)
      map.set(ev.event_date, list)
    })
    return map
  }, [events])

  // Open on the month of the next call (or this month if there is none).
  const [cursor, setCursor] = useState(() => {
    const next = events.map(e => e.event_date).filter(k => k >= todayKey && !isNotice(byDate.get(k)?.[0] || {})).sort()[0]
    if (next) { const [y, m] = next.split('-').map(Number); return { y, m: m - 1 } }
    return { y: today.y, m: today.m }
  })
  const [selected, setSelected] = useState(() => {
    const upcoming = events.filter(e => e.event_date >= todayKey && !isNotice(e)).map(e => e.event_date).sort()[0]
    return upcoming || todayKey
  })

  const first = new Date(cursor.y, cursor.m, 1)
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < first.getDay(); i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function shift(delta) {
    const d = new Date(cursor.y, cursor.m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }
  function goToday() { setCursor({ y: today.y, m: today.m }); setSelected(todayKey) }

  function statusOf(k, weekday) {
    const list = byDate.get(k) || []
    const calls = list.filter(e => !isNotice(e))
    if (calls.length) return { kind: 'booked', calls, list }
    if (list.length) return { kind: 'none', list }
    if (CALL_WEEKDAYS.includes(weekday) && k >= todayKey) return { kind: 'open', list }
    return { kind: 'empty', list }
  }

  const [sy, sm, sd] = selected.split('-').map(Number)
  const selDate = new Date(sy, sm - 1, sd)
  const sel = statusOf(selected, selDate.getDay())
  const selLabel = selDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const monthLabel = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <section className="mg" aria-label="Month view">
      <div className="mg-cal">
        <div className="mg-head">
          <h2>{monthLabel}</h2>
          <div className="mg-nav">
            <button type="button" onClick={goToday}>Today</button>
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
            <button type="button" onClick={() => shift(1)} aria-label="Next month">›</button>
          </div>
        </div>
        <div className="mg-week" aria-hidden="true">{WEEKDAYS.map(w => <span key={w}>{w}</span>)}</div>
        <div className="mg-grid">
          {cells.map((d, i) => {
            if (!d) return <span key={`b${i}`} className="mg-cell blank" />
            const k = key(cursor.y, cursor.m, d)
            const st = statusOf(k, (first.getDay() + d - 1) % 7)
            const isToday = k === todayKey
            const label = `${new Date(cursor.y, cursor.m, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${st.kind === 'booked' ? `: ${st.calls.map(c => c.title).join(', ')}` : st.kind === 'open' ? ': call day, nothing booked yet' : st.kind === 'none' ? ': no call' : ''}`
            return (
              <button
                key={k}
                type="button"
                className={`mg-cell ${st.kind}${isToday ? ' today' : ''}${k === selected ? ' sel' : ''}${k < todayKey ? ' past' : ''}`}
                aria-label={label}
                aria-pressed={k === selected}
                onClick={() => setSelected(k)}
              >
                <b>{d}</b>
                <span className="mg-dots" aria-hidden="true">
                  {st.kind === 'booked' && st.calls.slice(0, 3).map(c => <i key={c.id} className={`mg-dot ${dotColor(c.type)}`} />)}
                  {st.kind === 'open' && <i className="mg-dot open" />}
                  {st.kind === 'none' && <i className="mg-dash" />}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mg-legend">
          <span><i className="mg-dot cyan" /> Call booked</span>
          <span><i className="mg-dot open" /> Call day, nothing booked yet</span>
          <span><i className="mg-dash" /> No call</span>
        </div>
      </div>

      <div className="mg-day" aria-live="polite">
        <div className="mg-day-date">{selLabel}{selected === todayKey ? ' · Today' : ''}</div>
        {sel.kind === 'booked' || sel.kind === 'none' ? sel.list.map(ev => {
          const span = eventSpan(ev)
          const notice = isNotice(ev)
          const upcoming = !!span && span.endMs > now
          const rec = recordingByDate.get(ev.event_date)
          return (
            <div key={ev.id} className={`mg-ev${notice ? ' notice' : ''}`}>
              <div className="mg-ev-top">
                <h3>{ev.title}</h3>
                {ev.type && !notice && <span className={`tag ${TAG[dotColor(ev.type)]}`}>{ev.type}</span>}
              </div>
              {ev.description && <p>{ev.description}</p>}
              {!notice && (
                <div className="mg-ev-meta">
                  {ev.time && <span>{ev.time}</span>}
                  {ev.duration && <span>{ev.duration}</span>}
                  {ev.platform && <span>{ev.platform}</span>}
                </div>
              )}
              {span?.hasZone && upcoming && !notice && <div className="mg-ev-local">Your time: {formatInViewerZone(span.startMs)}</div>}
              {!notice && upcoming && (
                <div className="mg-ev-actions">
                  {ev.zoom_url && <a className="btn-join" href={ev.zoom_url} target="_blank" rel="noopener noreferrer">Join on Zoom</a>}
                  <AddToCalendar ev={ev} />
                </div>
              )}
              {!notice && !upcoming && (
                rec ? <Link className="past-watch" href={{ pathname: '/recordings', query: { v: rec.id } }}>▶ Watch recording</Link>
                  : <span className="past-none">No recording</span>
              )}
            </div>
          )
        }) : sel.kind === 'open' ? (
          <div className="mg-empty">
            <b>Call day — nothing booked yet.</b>
            <p>Calls are usually posted one to two weeks out. Want to lead this one?</p>
            <a className="btn-join" href={bookUrl} target="_blank" rel="noopener noreferrer">Book this slot →</a>
          </div>
        ) : (
          <div className="mg-empty"><p>No call on this day.</p></div>
        )}
      </div>
    </section>
  )
}
