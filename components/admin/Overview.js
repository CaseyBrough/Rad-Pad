import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminContext'
import { Icon, PageHeader } from './ui'
import { hasDate, isNotice, eventSpan, calendarDaysUntil, CALL_WEEKDAYS } from '../../lib/calendar'
import { callTypeDot } from '../../lib/callTypes'
import { ytId } from '../../lib/youtube'
import { fmtDay, todayKey, dateKey } from './dates'

const STATS = [
  { key: 'recordings', label: 'Recordings', view: 'recordings' },
  { key: 'resources', label: 'Resources', view: 'resources' },
  { key: 'events', label: 'Events', view: 'events' },
  { key: 'links', label: 'Links', view: 'links' },
  { key: 'members', label: 'Members', view: 'members' },
  { key: 'pins', label: 'Map pins', view: 'pins' },
  { key: 'access', label: 'Login emails', view: 'access' },
]

const KIND = {
  recordings: { noun: 'Recording', icon: 'recording', view: 'recordings', label: r => r.title },
  events: { noun: 'Event', icon: 'event', view: 'events', label: r => r.title },
  resources: { noun: 'Resource', icon: 'resource', view: 'resources', label: r => r.title },
  links: { noun: 'Link', icon: 'link', view: 'links', label: r => r.name },
  members: { noun: 'Member', icon: 'member', view: 'members', label: r => r.name },
  announcements: { noun: 'Announcement', icon: 'announce', view: 'announcements', label: r => r.message },
}

function ago(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} wk ago`
  return fmtDay(dateKey(new Date(iso)))
}

function untilLabel(ms) {
  const d = calendarDaysUntil(ms)
  if (d <= 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  return `In ${d} days`
}

// The next four standing call days (Tuesdays) as YYYY-MM-DD keys, today included.
function nextCallDays(n = 4) {
  const out = []
  const d = new Date(); d.setHours(0, 0, 0, 0)
  while (out.length < n) {
    if (CALL_WEEKDAYS.includes(d.getDay())) out.push(dateKey(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

export default function Overview({ go }) {
  const { counts } = useAdmin()
  const [data, setData] = useState(null)
  const [showAllFixes, setShowAllFixes] = useState(false)

  useEffect(() => {
    let alive = true
    const recent = (table, cols, apply) => {
      let q = supabase.from(table).select(cols).order('created_at', { ascending: false }).limit(6)
      if (apply) q = apply(q)
      return q.then(r => r.data || [])
    }
    Promise.all([
      supabase.from('events').select('*').then(r => r.data || []),
      supabase.from('recordings').select('id,title,video_url,created_at').then(r => r.data || []),
      recent('resources', 'id,title,created_at'),
      recent('links', 'id,name,created_at', q => q.eq('approved', true)),
      recent('members', 'id,name,created_at', q => q.eq('approved', true)),
      recent('announcements', 'id,message,created_at'),
    ]).then(([events, recordings, resources, links, members, announcements]) => {
      if (alive) setData({ events, recordings, resources, links, members, announcements })
    }).catch(() => alive && setData({ events: [], recordings: [], resources: [], links: [], members: [], announcements: [] }))
    return () => { alive = false }
  }, [])

  const derived = useMemo(() => {
    if (!data) return null
    const today = todayKey()
    const now = Date.now()
    const upcoming = data.events.filter(e => hasDate(e) && e.event_date >= today)
    const calls = upcoming.filter(e => !isNotice(e))

    const next = calls
      .map(e => ({ e, span: eventSpan(e) }))
      .filter(x => x.span && x.span.endMs > now)
      .sort((a, b) => a.span.startMs - b.span.startMs)[0] || null

    const edit = (view, id) => () => go(view, { editId: id })
    const fixes = []
    for (const e of [...calls].sort((a, b) => a.event_date.localeCompare(b.event_date))) {
      if (!String(e.time || '').trim()) fixes.push({ key: `t${e.id}`, what: 'No time set', title: e.title, when: fmtDay(e.event_date), act: edit('events', e.id) })
      if (!String(e.zoom_url || '').trim()) fixes.push({ key: `z${e.id}`, what: 'No Zoom link', title: e.title, when: fmtDay(e.event_date), act: edit('events', e.id) })
    }
    for (const e of data.events.filter(e => !hasDate(e))) {
      fixes.push({ key: `d${e.id}`, what: 'No date', title: e.title, act: edit('events', e.id) })
    }
    const booked = new Set(data.events.map(e => e.event_date))
    for (const day of nextCallDays()) {
      if (!booked.has(day)) fixes.push({ key: `o${day}`, what: 'Nothing booked', title: 'Open call day', when: fmtDay(day), act: () => go('events', { prefill: { event_date: day } }) })
    }
    for (const r of data.recordings.filter(r => !ytId(r.video_url))) {
      fixes.push({ key: `r${r.id}`, what: r.video_url ? 'Not a YouTube link' : 'No video link', title: r.title, act: edit('recordings', r.id) })
    }

    const activity = Object.entries(KIND)
      .flatMap(([table, k]) => (table === 'events' || table === 'recordings'
        ? [...data[table]].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 6)
        : data[table]
      ).map(row => ({ table, k, row })))
      .filter(x => x.row.created_at)
      .sort((a, b) => String(b.row.created_at).localeCompare(String(a.row.created_at)))
      .slice(0, 7)

    return { next, fixes, activity }
  }, [data, go])

  const pending = counts?.pending ?? 0
  const bookings = counts?.bookingsPending ?? 0
  const parts = counts ? [
    counts.membersPending > 0 && `${counts.membersPending} Directory profile${counts.membersPending === 1 ? '' : 's'}`,
    counts.pinsPending > 0 && `${counts.pinsPending} map pin${counts.pinsPending === 1 ? '' : 's'}`,
    counts.linksPending > 0 && `${counts.linksPending} suggested link${counts.linksPending === 1 ? '' : 's'}`,
  ].filter(Boolean) : []

  const next = derived?.next
  const fixes = derived?.fixes || []
  const shownFixes = showAllFixes ? fixes : fixes.slice(0, 6)

  return (
    <>
      <PageHeader title="Overview" sub="What needs you this week." />

      {/* Inbox: only loud when something is waiting. */}
      {counts && (pending > 0 || bookings > 0) && (
        <div className="adm-section adm-inbox-row">
          {pending > 0 && (
            <button className="adm-card alert adm-inbox-card" onClick={() => go('approvals')}>
              <h2>{pending} waiting for approval</h2>
              <p>{parts.join(', ')}.</p>
              <span className="adm-inbox-go">Review →</span>
            </button>
          )}
          {bookings > 0 && (
            <button className="adm-card alert adm-inbox-card" onClick={() => go('bookings')}>
              <h2>{bookings} call booking{bookings === 1 ? '' : 's'} waiting</h2>
              <p>{bookings === 1 ? 'A member has' : 'Members have'} asked to host a call.</p>
              <span className="adm-inbox-go">Review →</span>
            </button>
          )}
        </div>
      )}

      <div className="adm-section">
        <div className="adm-label">Next call</div>
        {!derived ? (
          <div className="adm-card adm-next"><p>Loading…</p></div>
        ) : next ? (
          <div className="adm-card adm-next">
            <div className="adm-next-when">
              <span className="adm-next-until">{untilLabel(next.span.startMs)}</span>
              <b>{fmtDay(next.e.event_date, { long: true })}</b>
              <span className={String(next.e.time || '').trim() ? '' : 'adm-warn-text'}>{String(next.e.time || '').trim() || 'No time set'}</span>
            </div>
            <div className="adm-next-body">
              <h2>{next.e.title}</h2>
              <div className="adm-next-meta">
                {next.e.type && <span className="adm-type"><i className={`adm-dot ${callTypeDot(next.e.type) || 'cyan'}`} />{next.e.type}</span>}
                {next.e.zoom_url
                  ? <span className="adm-chip cyan">Zoom link set</span>
                  : <span className="adm-chip pink">No Zoom link</span>}
                {counts && pending === 0 && bookings === 0 && <span className="adm-inbox-ok">Inbox clear</span>}
              </div>
              <div className="adm-queue">
                <button className="adm-btn primary" onClick={() => go('events', { editId: next.e.id })}>Edit call</button>
                {next.e.zoom_url && <a className="adm-btn" href={next.e.zoom_url} target="_blank" rel="noopener noreferrer"><Icon name="external" size={13} /> Open Zoom</a>}
              </div>
            </div>
          </div>
        ) : (
          <div className="adm-card adm-next">
            <div className="adm-next-body">
              <h2>No upcoming calls</h2>
              <p>Nothing is on the calendar yet.</p>
              <div className="adm-queue"><button className="adm-btn primary" onClick={() => go('events', 'new')}>New event</button></div>
            </div>
          </div>
        )}
      </div>

      <div className="adm-section adm-split">
        <div>
          <div className="adm-label">Needs fixing{fixes.length ? ` (${fixes.length})` : ''}</div>
          {!derived ? <div className="adm-card"><p>Checking…</p></div> : fixes.length === 0 ? (
            <div className="adm-card ok"><h2>All clean</h2><p>Every upcoming call has a time and a Zoom link, and every recording has a video.</p></div>
          ) : (
            <div className="adm-card adm-mini-list">
              {shownFixes.map(f => (
                <button key={f.key} className="adm-mini" onClick={f.act}>
                  <span className="adm-mini-flag"><Icon name="warn" size={13} />{f.what}</span>
                  <span className="adm-mini-title">{f.title}</span>
                  {f.when && <span className="adm-mini-when">{f.when}</span>}
                </button>
              ))}
              {fixes.length > 6 && (
                <button className="adm-mini-more" onClick={() => setShowAllFixes(s => !s)}>{showAllFixes ? 'Show fewer' : `Show all ${fixes.length}`}</button>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="adm-label">Recently added</div>
          {!derived ? <div className="adm-card"><p>Loading…</p></div> : (
            <div className="adm-card adm-mini-list">
              {derived.activity.map(({ table, k, row }) => (
                <button key={`${table}${row.id}`} className="adm-mini" onClick={() => go(k.view, table === 'announcements' ? null : { editId: row.id })}>
                  <span className="adm-mini-flag quiet"><Icon name={k.icon} size={13} />{k.noun}</span>
                  <span className="adm-mini-title">{k.label(row)}</span>
                  <span className="adm-mini-when">{ago(row.created_at)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="adm-section">
        <div className="adm-label">Quick actions</div>
        <div className="adm-actions">
          <button className="adm-btn" onClick={() => go('announcements')}><Icon name="announce" size={14} /> Post announcement</button>
          <button className="adm-btn" onClick={() => go('events', 'new')}><Icon name="event" size={14} /> New event</button>
          <button className="adm-btn" onClick={() => go('recordings', 'new')}><Icon name="recording" size={14} /> New recording</button>
          <button className="adm-btn" onClick={() => go('resources', 'new')}><Icon name="resource" size={14} /> New resource</button>
          <button className="adm-btn" onClick={() => go('links', 'new')}><Icon name="link" size={14} /> New link</button>
        </div>
      </div>

      <div className="adm-section">
        <div className="adm-label">On the site</div>
        <div className="adm-totals">
          {STATS.map(s => (
            <button key={s.key} className="adm-total" onClick={() => go(s.view)}>
              <b>{counts ? counts[s.key] : '–'}</b> {s.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
