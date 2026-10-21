import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import Thumb from '../components/Thumb'
import Countdown, { useNow } from '../components/Countdown'
import CountUp from '../components/CountUp'
import AddToCalendar from '../components/AddToCalendar'
import { supabase } from '../lib/supabase'
import { useNewCounts, summarizeNew } from '../lib/newSince'
import { eventSpan, formatInViewerZone, calendarDaysUntil, isNotice } from '../lib/calendar'
import { durationMinutes } from '../lib/youtube'
import { callTypeTag } from '../lib/callTypes'

const typeClass = t => callTypeTag(t)

function relativeDay(ms, now) {
  const days = calendarDaysUntil(ms, now)
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

export default function Home() {
  const now = useNow(30000)
  const whatsNew = summarizeNew(useNewCounts(null))
  const [recordings, setRecordings] = useState([])
  const [events, setEvents] = useState([])
  const [announcement, setAnnouncement] = useState(null)
  const [members, setMembers] = useState([])
  const [counts, setCounts] = useState({ pins: 0, resources: 0, links: 0 })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      // Yesterday onward: a call that's happening right now (or just ended in a
      // timezone behind UTC) still counts as "current".
      const y = new Date(Date.now() - 86400000)
      const since = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
      const head = (table, apply) => {
        let q = supabase.from(table).select('*', { count: 'exact', head: true })
        if (apply) q = apply(q)
        return q.then(r => r.count || 0)
      }
      const [rec, ev, ann, mem, pins, resources, links] = await Promise.all([
        supabase.from('recordings').select('id,title,description,date,duration,host,video_url,call_type,sub_topic,created_at').order('date', { ascending: false }),
        supabase.from('events').select('*').gte('event_date', since).order('event_date', { ascending: true }).limit(8),
        supabase.from('announcements').select('*').eq('archived', false).order('created_at', { ascending: false }).limit(1),
        supabase.from('members').select('id,name,photo_url').eq('approved', true).order('created_at', { ascending: false }),
        head('map_pins', q => q.eq('approved', true)),
        head('resources'),
        head('links', q => q.eq('approved', true)),
      ])
      setRecordings(rec.data || [])
      setEvents(ev.data || [])
      setAnnouncement(ann.data?.[0] || null)
      setMembers(mem.data || [])
      setCounts({ pins, resources, links })
      setLoaded(true)
    }
    load()
  }, [])

  // The call that is happening now, or the next one to start.
  const next = useMemo(() => {
    if (!now) return null
    const withSpan = events
      .filter(ev => !isNotice(ev))
      .map(ev => ({ ev, span: eventSpan(ev) }))
      .filter(x => x.span && x.span.endMs > now)
    return withSpan.sort((a, b) => a.span.startMs - b.span.startMs)[0] || null
  }, [events, now])

  const totalMinutes = useMemo(() => recordings.reduce((sum, r) => sum + (durationMinutes(r.duration) || 0), 0), [recordings])
  const latest = recordings[0]
  const recent = recordings.slice(1, 5)
  const faces = members.filter(m => m.photo_url).slice(0, 8)

  const subline = !loaded || !now
    ? ' '
    : next
      ? (next.span.startMs <= now ? (next.span.allDay ? 'There is a call today.' : 'A call is happening right now.') : `Your next call is ${relativeDay(next.span.startMs, now)}.`)
      : 'No calls on the calendar yet — new ones usually appear 1–2 weeks out.'

  return (
    <Layout>
      <div className="home-hero">
        <div className="section-label">Members Hub</div>
        <h1 className="home-greeting">Welcome back.</h1>
        <p className="home-sub">{subline}</p>
        <button type="button" className="home-search" onClick={() => window.dispatchEvent(new Event('radpad:open-search'))}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
          <span>Search calls, people, resources…</span>
          <kbd>⌘K</kbd>
        </button>
      </div>

      {whatsNew.length > 0 && (
        <div className="whatsnew" role="status">
          <span className="whatsnew-label">Since your last visit</span>
          <span className="whatsnew-items">
            {whatsNew.map(item => (
              <Link key={item.href} href={item.href}>{item.count} new {item.label}</Link>
            ))}
          </span>
        </div>
      )}

      <div className="home-grid">
        {/* UP NEXT */}
        <section className="next-card" aria-label="Next call">
          {!loaded ? (
            <>
              <div className="shimmer" style={{ height: 12, width: 110, borderRadius: 4, marginBottom: 18 }} />
              <div className="shimmer" style={{ height: 30, width: '70%', borderRadius: 6, marginBottom: 14 }} />
              <div className="shimmer" style={{ height: 14, width: '90%', borderRadius: 4, marginBottom: 8 }} />
              <div className="shimmer" style={{ height: 64, width: '60%', borderRadius: 8, marginTop: 22 }} />
            </>
          ) : next ? (
            <>
              <div className="next-top">
                <span className="lib-eyebrow cyan"><span className="dot" />{next.span.startMs <= now && !next.span.allDay ? 'Live now' : 'Up next'}</span>
                {next.ev.type && <span className={`tag ${typeClass(next.ev.type)}`}>{next.ev.type}</span>}
              </div>
              <h2 className="next-title">{next.ev.title}</h2>
              {next.ev.description && <p className="next-desc">{next.ev.description}</p>}
              <div className="next-when">
                <span><b>{[next.ev.event_date, next.ev.time].filter(Boolean).join(' · ')}</b>{next.ev.duration ? ` · ${next.ev.duration}` : ''}</span>
                {next.span.hasZone && <span className="next-local">Your time: {formatInViewerZone(next.span.startMs)}</span>}
              </div>
              <Countdown startMs={next.span.startMs} endMs={next.span.endMs} allDay={next.span.allDay} />
              <div className="next-actions">
                {next.ev.zoom_url && <a className="btn-join" href={next.ev.zoom_url} target="_blank" rel="noopener noreferrer">Join on Zoom</a>}
                {next.ev.event_date && <AddToCalendar ev={next.ev} />}
                <Link className="next-link" href="/calendar">Full calendar →</Link>
              </div>
            </>
          ) : (
            <>
              <div className="next-top"><span className="lib-eyebrow cyan"><span className="dot" />Up next</span></div>
              <h2 className="next-title">Next call to be announced</h2>
              <p className="next-desc">Calls are usually posted one to two weeks out. Catch up on a recent one while you wait.</p>
              <div className="next-actions"><Link className="next-link" href="/calendar">Open the calendar →</Link></div>
            </>
          )}
        </section>

        {/* LATEST CALL */}
        {latest ? (
          <Link href={{ pathname: '/recordings', query: { v: latest.id } }} className="latest-card" aria-label={`Play ${latest.title}`}>
            <Thumb rec={latest} size="max" />
            <div className="latest-body">
              <span className="lib-eyebrow"><span className="dot" />Latest call</span>
              <div className="latest-title">{latest.title}</div>
              <div className="rc-meta">{[latest.date, latest.duration, latest.host && latest.host.replace(/\.\s*$/, '')].filter(Boolean).join('  ·  ')}</div>
            </div>
          </Link>
        ) : (
          <div className="latest-card skel"><div className="thumb shimmer" /></div>
        )}
      </div>

      {/* CATCH UP RAIL */}
      {recent.length > 0 && (
        <section className="home-section">
          <div className="home-section-head">
            <h2>Catch up</h2>
            <Link href="/recordings">All {recordings.length} calls →</Link>
          </div>
          <div className="rail">
            {recent.map(rec => (
              <Link key={rec.id} href={{ pathname: '/recordings', query: { v: rec.id } }} className="rec-card" aria-label={`Play ${rec.title}`}>
                <Thumb rec={rec} />
                <div className="rc-body">
                  {rec.call_type && <span className={`tag ${typeClass(rec.call_type)}`}>{rec.call_type}{rec.sub_topic ? ` · ${rec.sub_topic}` : ''}</span>}
                  <div className="rc-title">{rec.title}</div>
                  <div className="rc-meta">{[rec.date, rec.host && rec.host.replace(/\.\s*$/, '')].filter(Boolean).join('  ·  ')}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="home-split">
        {/* BULLETIN */}
        <section className="panel-card" aria-label="Bulletin board">
          <div className="home-section-head">
            <h2>📌 Bulletin board</h2>
            <Link href="/the-pad">View all →</Link>
          </div>
          {announcement ? (
            <>
              <div className="rc-meta" style={{ marginBottom: 10 }}>{new Date(announcement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div className="bulletin-text">{announcement.message}</div>
            </>
          ) : (
            <div className="rc-desc">{loaded ? 'Nothing posted right now.' : ' '}</div>
          )}
        </section>

        {/* COMMUNITY PULSE */}
        <section className="panel-card pulse" aria-label="The community">
          <div className="home-section-head">
            <h2>The community</h2>
            <Link href="/map">See the map →</Link>
          </div>
          <div className="stat-row">
            <div className="stat"><b><CountUp to={counts.pins} /></b><span>on the map</span></div>
            <div className="stat"><b><CountUp to={recordings.length} /></b><span>calls recorded</span></div>
            <div className="stat"><b><CountUp to={Math.round(totalMinutes / 60)} /></b><span>hours of talk</span></div>
          </div>
          {faces.length > 0 && (
            <Link href="/directory" className="faces" aria-label="Open the member directory">
              {faces.map(m => <img key={m.id} src={m.photo_url} alt="" title={m.name} loading="lazy" />)}
              {members.length > faces.length && <span className="faces-more">+{members.length - faces.length}</span>}
            </Link>
          )}
          <Link href="/the-pad" className="refer-line">Know someone who&apos;d be a great fit? <b>Refer them →</b></Link>
        </section>
      </div>

      {/* EXPLORE TILES */}
      <section className="home-section">
        <div className="home-section-head"><h2>Explore</h2></div>
        <div className="tiles">
          <Link href="/resources" className="tile"><b>Resources</b><span>{counts.resources} guides &amp; templates</span></Link>
          <Link href="/links" className="tile"><b>Links</b><span>{counts.links} vetted tools &amp; services</span></Link>
          <Link href="/directory" className="tile"><b>Directory</b><span>{members.length} member profiles</span></Link>
          <Link href="/map" className="tile"><b>Map</b><span>find members near you</span></Link>
        </div>
      </section>
    </Layout>
  )
}
