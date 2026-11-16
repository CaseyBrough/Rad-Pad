import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminContext'
import { Icon, PageHeader } from './ui'
import { hasDate, isNotice, eventSpan, calendarDaysUntil, CALL_WEEKDAYS } from '../../lib/calendar'
import { callTypeDot } from '../../lib/callTypes'
import { ytId, ytThumb, durationMinutes, formatHours } from '../../lib/youtube'
import { fmtDay, todayKey, dateKey } from './dates'

const KIND = {
  recordings: { noun: 'Recording', icon: 'recording', view: 'recordings', label: r => r.title },
  events: { noun: 'Event', icon: 'event', view: 'events', label: r => r.title },
  resources: { noun: 'Resource', icon: 'resource', view: 'resources', label: r => r.title },
  links: { noun: 'Link', icon: 'link', view: 'links', label: r => r.name },
  members: { noun: 'Member', icon: 'member', view: 'members', label: r => r.name },
  announcements: { noun: 'Announcement', icon: 'announce', view: 'announcements', label: r => r.message },
}

// What each problem means for members, and the button that fixes it.
const FIX = {
  time: { flag: 'No time set', why: 'Shows as all-day on the calendar and in members’ calendar feeds, with no countdown.', cta: 'Add time' },
  zoom: { flag: 'No Zoom link', why: 'Members get no Join button for this call.', cta: 'Add Zoom link' },
  date: { flag: 'No date', why: 'Sits under “Date to be announced” on the calendar.', cta: 'Set date' },
  open: { flag: 'Nothing booked', why: 'A Tuesday call day with nothing on the calendar yet. Members can still ask to host it.', cta: 'Add event' },
  video: { flag: 'No video link', why: 'Members can’t watch this recording.', cta: 'Add video' },
  notyt: { flag: 'Not a YouTube link', why: 'No thumbnail and no in-hub player. It opens in a new tab instead.', cta: 'Fix link' },
}

const DAY = 86400000

function ago(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY)
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

function untilKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return untilLabel(new Date(y, m - 1, d).getTime())
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

const blank = v => !String(v || '').trim()
const sinceIso = days => new Date(Date.now() - days * DAY).toISOString()

export default function Overview({ go }) {
  const { counts } = useAdmin()
  const [data, setData] = useState(null)
  const [showAllFixes, setShowAllFixes] = useState(false)

  useEffect(() => {
    let alive = true
    const recent = (table, cols, apply) => {
      let q = supabase.from(table).select(cols).order('created_at', { ascending: false }).limit(8)
      if (apply) q = apply(q)
      return q.then(r => r.data || [])
    }
    const countSince = (table, days) => supabase.from(table).select('*', { count: 'exact', head: true }).gte('created_at', sinceIso(days)).then(r => r.count ?? 0)
    Promise.all([
      supabase.from('events').select('*').then(r => r.data || []),
      supabase.from('recordings').select('id,title,video_url,created_at,date,duration,host,call_type,sub_topic').then(r => r.data || []),
      recent('resources', 'id,title,created_at'),
      recent('links', 'id,name,created_at', q => q.eq('approved', true)),
      recent('members', 'id,name,created_at', q => q.eq('approved', true)),
      recent('announcements', 'id,message,created_at'),
      countSince('authorized_emails', 30),
    ]).then(([events, recordings, resources, links, members, announcements, accessNew]) => {
      if (alive) setData({ events, recordings, resources, links, members, announcements, accessNew })
    }).catch(() => alive && setData({ events: [], recordings: [], resources: [], links: [], members: [], announcements: [], accessNew: 0 }))
    return () => { alive = false }
  }, [])

  const d = useMemo(() => {
    if (!data) return null
    const today = todayKey()
    const now = Date.now()
    const calls = data.events.filter(e => hasDate(e) && e.event_date >= today && !isNotice(e))

    const timed = calls
      .map(e => ({ e, span: eventSpan(e) }))
      .filter(x => x.span && x.span.endMs > now)
      .sort((a, b) => a.span.startMs - b.span.startMs)
    const next = timed[0] || null
    const after = timed.slice(1, 4)
    const in30 = timed.filter(x => x.span.startMs < now + 30 * DAY).length

    const dated = data.recordings.filter(r => r.date).sort((a, b) => String(b.date).localeCompare(String(a.date)))
    const lastRec = dated[0] || null
    const minutes = data.recordings.reduce((n, r) => n + (durationMinutes(r.duration) || 0), 0)
    const monthStart = today.slice(0, 8) + '01'
    const recThisMonth = data.recordings.filter(r => r.date && r.date >= monthStart).length

    const edit = (view, id) => () => go(view, { editId: id })
    const fixes = []
    for (const e of [...calls].sort((a, b) => a.event_date.localeCompare(b.event_date))) {
      const sub = [fmtDay(e.event_date), untilKey(e.event_date), e.type].filter(Boolean).join(' · ')
      if (blank(e.time)) fixes.push({ key: `t${e.id}`, kind: 'time', title: e.title, sub, act: edit('events', e.id) })
      if (blank(e.zoom_url)) fixes.push({ key: `z${e.id}`, kind: 'zoom', title: e.title, sub, act: edit('events', e.id) })
    }
    for (const e of data.events.filter(e => !hasDate(e))) {
      fixes.push({ key: `d${e.id}`, kind: 'date', title: e.title, sub: e.type, act: edit('events', e.id) })
    }
    const booked = new Set(data.events.map(e => e.event_date))
    for (const day of nextCallDays()) {
      if (!booked.has(day)) fixes.push({ key: `o${day}`, kind: 'open', title: `Open call day · ${fmtDay(day)}`, sub: untilKey(day), act: () => go('events', { prefill: { event_date: day } }) })
    }
    for (const r of data.recordings.filter(r => !ytId(r.video_url))) {
      fixes.push({ key: `r${r.id}`, kind: r.video_url ? 'notyt' : 'video', title: r.title, sub: [fmtDay(r.date), r.host].filter(Boolean).join(' · '), act: edit('recordings', r.id) })
    }

    const activity = Object.entries(KIND)
      .flatMap(([table, k]) => (table === 'events' || table === 'recordings'
        ? [...data[table]].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8)
        : data[table]
      ).map(row => ({ table, k, row })))
      .filter(x => x.row.created_at)
      .sort((a, b) => String(b.row.created_at).localeCompare(String(a.row.created_at)))
      .slice(0, 8)

    return { next, after, in30, lastRec, minutes, recThisMonth, fixes, activity }
  }, [data, go])

  const pending = counts?.pending ?? 0
  const bookings = counts?.bookingsPending ?? 0
  const parts = counts ? [
    counts.membersPending > 0 && `${counts.membersPending} Directory profile${counts.membersPending === 1 ? '' : 's'}`,
    counts.pinsPending > 0 && `${counts.pinsPending} map pin${counts.pinsPending === 1 ? '' : 's'}`,
    counts.linksPending > 0 && `${counts.linksPending} suggested link${counts.linksPending === 1 ? '' : 's'}`,
  ].filter(Boolean) : []

  const next = d?.next
  const rec = d?.lastRec
  const recYt = rec ? ytId(rec.video_url) : null
  const fixes = d?.fixes || []
  const shownFixes = showAllFixes ? fixes : fixes.slice(0, 5)

  const stats = [
    { view: 'events', label: 'Calls in the next 30 days', value: d ? d.in30 : '–', sub: next ? `Next: ${fmtDay(next.e.event_date)}` : 'Nothing booked' },
    { view: 'recordings', label: 'Recordings', value: counts?.recordings ?? '–', sub: d ? `${formatHours(d.minutes)} hrs of calls · ${d.recThisMonth} this month` : '' },
    { view: 'members', label: 'Directory profiles', value: counts?.members ?? '–', sub: counts ? `${counts.pins} on the map · ${counts.links} links` : '' },
    { view: 'access', label: 'Can log in', value: counts?.access ?? '–', sub: d ? `+${data.accessNew} in the last 30 days` : '' },
  ]

  return (
    <>
      <PageHeader title="Overview" sub={`${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · what needs you this week.`}>
        <button className="adm-btn sm" onClick={() => go('announcements')}><Icon name="announce" size={13} /> Announce</button>
        <button className="adm-btn sm" onClick={() => go('events', 'new')}><Icon name="event" size={13} /> Event</button>
        <button className="adm-btn sm" onClick={() => go('recordings', 'new')}><Icon name="recording" size={13} /> Recording</button>
      </PageHeader>

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

      {/* Row 1: the next call and the last recording, side by side. */}
      <div className="adm-section adm-ov-top">
        <div>
          <div className="adm-label">Next call</div>
          {!d ? <div className="adm-card adm-next"><p>Loading…</p></div> : next ? (
            <div className="adm-card adm-next-wrap">
              <div className="adm-next">
                <div className="adm-next-when">
                  <span className="adm-next-until">{untilLabel(next.span.startMs)}</span>
                  <b>{fmtDay(next.e.event_date, { long: true })}</b>
                  <span className={blank(next.e.time) ? 'adm-warn-text' : ''}>{blank(next.e.time) ? 'No time set' : next.e.time}{next.e.duration ? ` · ${next.e.duration}` : ''}</span>
                </div>
                <div className="adm-next-body">
                  <h2>{next.e.title}</h2>
                  <div className="adm-next-meta">
                    {next.e.type && <span className="adm-type"><i className={`adm-dot ${callTypeDot(next.e.type) || 'cyan'}`} />{next.e.type}</span>}
                    {next.e.zoom_url ? <span className="adm-chip cyan">Zoom link set</span> : <span className="adm-chip pink">No Zoom link</span>}
                    {counts && pending === 0 && bookings === 0 && <span className="adm-inbox-ok">Inbox clear</span>}
                  </div>
                  {next.e.description && <p className="adm-next-desc">{next.e.description}</p>}
                  <div className="adm-queue">
                    <button className="adm-btn primary" onClick={() => go('events', { editId: next.e.id })}>Edit call</button>
                    {next.e.zoom_url && <a className="adm-btn" href={next.e.zoom_url} target="_blank" rel="noopener noreferrer"><Icon name="external" size={13} /> Open Zoom</a>}
                  </div>
                </div>
              </div>
              {d.after.length > 0 && (
                <div className="adm-after">
                  <span className="adm-after-label">After that</span>
                  {d.after.map(({ e }) => (
                    <button key={e.id} className="adm-after-item" onClick={() => go('events', { editId: e.id })}>
                      <i className={`adm-dot ${callTypeDot(e.type) || 'cyan'}`} />
                      <b>{fmtDay(e.event_date)}</b>
                      <span>{e.title}</span>
                      {(blank(e.time) || blank(e.zoom_url)) && <Icon name="warn" size={12} />}
                    </button>
                  ))}
                </div>
              )}
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

        <div>
          <div className="adm-label">Last recording</div>
          {!d ? <div className="adm-card"><p>Loading…</p></div> : rec ? (
            <div className="adm-card adm-rec">
              {recYt
                ? <a className="adm-rec-thumb" href={`/recordings?v=${rec.id}`} target="_blank" rel="noopener noreferrer" title="Watch on the site"><img src={ytThumb(recYt, 'max')} alt="" onError={e => { e.currentTarget.src = ytThumb(recYt) }} /><span className="adm-rec-play" aria-hidden="true">▶</span></a>
                : <div className="adm-rec-thumb ph">No video link</div>}
              <div className="adm-rec-body">
                <h2>{rec.title}</h2>
                <div className="adm-rec-meta">
                  {[fmtDay(rec.date), rec.duration, rec.host && `Host: ${rec.host}`].filter(Boolean).join(' · ')}
                </div>
                {rec.call_type && <div className="adm-type" style={{ marginTop: 6 }}><i className={`adm-dot ${callTypeDot(rec.call_type) || 'cyan'}`} />{rec.call_type}{rec.sub_topic ? ` · ${rec.sub_topic}` : ''}</div>}
                <div className="adm-queue">
                  <button className="adm-btn cyan sm" onClick={() => go('recordings', { editId: rec.id })}>Edit</button>
                  <a className="adm-btn sm" href={`/recordings?v=${rec.id}`} target="_blank" rel="noopener noreferrer"><Icon name="external" size={12} /> View on site</a>
                </div>
              </div>
            </div>
          ) : (
            <div className="adm-card"><p>No recordings yet.</p></div>
          )}
        </div>
      </div>

      {/* Row 2: numbers with context. */}
      <div className="adm-section adm-kpis">
        {stats.map(s => (
          <button key={s.view} className="adm-kpi" onClick={() => go(s.view)}>
            <span className="adm-kpi-label">{s.label}</span>
            <b>{s.value}</b>
            <span className="adm-kpi-sub">{s.sub}</span>
          </button>
        ))}
      </div>

      {/* Row 3: what to fix, and what's new. */}
      <div className="adm-section adm-ov-bottom">
        <div>
          <div className="adm-label">Needs fixing{fixes.length ? ` (${fixes.length})` : ''}</div>
          {!d ? <div className="adm-card"><p>Checking…</p></div> : fixes.length === 0 ? (
            <div className="adm-card ok"><h2>All clean</h2><p>Every upcoming call has a time and a Zoom link, every Tuesday is booked, and every recording has a video.</p></div>
          ) : (
            <div className="adm-card adm-fix-list">
              {shownFixes.map(f => {
                const fx = FIX[f.kind]
                return (
                  <div key={f.key} className="adm-fix">
                    <span className="adm-fix-icon"><Icon name="warn" size={14} /></span>
                    <div className="adm-fix-body">
                      <div className="adm-fix-top"><span className="adm-fix-flag">{fx.flag}</span><span className="adm-fix-title">{f.title}</span></div>
                      {f.sub && <div className="adm-fix-sub">{f.sub}</div>}
                      <div className="adm-fix-why">{fx.why}</div>
                    </div>
                    <button className="adm-btn cyan sm" onClick={f.act}>{fx.cta}</button>
                  </div>
                )
              })}
              {fixes.length > 5 && (
                <button className="adm-mini-more" onClick={() => setShowAllFixes(s => !s)}>{showAllFixes ? 'Show fewer' : `Show all ${fixes.length}`}</button>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="adm-label">Recently added</div>
          {!d ? <div className="adm-card"><p>Loading…</p></div> : (
            <div className="adm-card adm-mini-list">
              {d.activity.map(({ table, k, row }) => (
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
    </>
  )
}
