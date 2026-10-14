import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import Thumb from '../components/Thumb'
import Countdown, { useNow } from '../components/Countdown'
import AddToCalendar from '../components/AddToCalendar'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toaster'
import { useSeenSnapshot, isNewSince } from '../lib/newSince'
import { eventSpan, formatInViewerZone, isNotice } from '../lib/calendar'

const CHANNELS = [
  {
    group: 'Core',
    items: [
      {
        name: 'general',
        emoji: '📡',
        description: 'Everything happening across The Rad Pad in one place. Big conversations, cross-channel moments, and things worth the whole community seeing.',
        url: 'https://theradpad.slack.com/archives/C0A394HH11D',
      },
      {
        name: 'introductions',
        emoji: '👋',
        description: "New here? Drop a quick intro so we know who you are and what you're building.",
        url: 'https://theradpad.slack.com/archives/C0A3JCQCDAP',
        introFormat: true,
      },
      {
        name: 'wins',
        emoji: '🏆',
        description: "Big wins, small wins, progress wins. Share what's working, what you shipped, or something you're proud of.",
        url: 'https://theradpad.slack.com/archives/C0A3QQ4DLCA',
      },
      {
        name: 'random',
        emoji: '🎲',
        description: "Off-topic, fun, and human. Memes, music, side conversations, and anything that doesn't fit elsewhere.",
        url: 'https://theradpad.slack.com/archives/C0A412M04MV',
      },
      {
        name: 'mindset',
        emoji: '🧠',
        description: 'The mental side of running a business. Mindset, motivation, and the stuff nobody talks about enough.',
        url: 'https://theradpad.slack.com/archives/C0AJMULEY0P',
      },
    ],
  },
  {
    group: 'Rad Women',
    items: [
      {
        name: 'rad-women',
        emoji: '🩵',
        description: "A space for the women running video businesses in The Rad Pad — same community, just a corner that's ours. Talk through what hits differently as a woman in this industry, celebrate wins big and small, and get real about the stuff we don't always say out loud.",
        url: 'https://theradpad.slack.com/archives/C0BSVE12N3C',
        note: 'Private — ask in #general or reach out to Casey or Rebecca Hormozi to be added.',
      },
    ],
  },
  {
    group: 'Work & Craft',
    items: [
      {
        name: 'pre-pro-post-questions',
        emoji: '🎬',
        description: 'Questions about production workflows. Pre-pro, on-set, post, delivery, process, or troubleshooting.',
        url: 'https://theradpad.slack.com/archives/C0A43N4PUGH',
      },
      {
        name: 'workflow-ai-etc',
        emoji: '⚙️',
        description: 'Systems, workflows, automations, AI tools, templates, and process tweaks. Share what saves time, what broke, and what actually works.',
        url: 'https://theradpad.slack.com/archives/C0A5AR1FHR6',
      },
      {
        name: 'tech-gear',
        emoji: '📷',
        description: 'Cameras, lenses, audio, lighting, computers, apps, and "should I buy this?" questions.',
        url: 'https://theradpad.slack.com/archives/C0A3UBCDNG4',
      },
      {
        name: 'your-work',
        emoji: '🎞️',
        description: 'Share your work. Films, edits, BTS, passion projects — put it out there.',
        url: 'https://theradpad.slack.com/archives/C0AE46DG4AC',
      },
    ],
  },
  {
    group: 'Business',
    items: [
      {
        name: 'job-opportunities',
        emoji: '💼',
        description: 'Post project needs and collaboration here. Hiring an editor, looking for a colorist, staffing a shoot, white-labeling overflow, or bringing someone in for specialized support.',
        url: 'https://theradpad.slack.com/archives/C0AEBPQ6LDB',
        note: "Demand-driven only — you're posting an opportunity, not pitching yourself.",
      },
      {
        name: 'selling-services',
        emoji: '🛎️',
        description: 'Done-for-you and implementation-based services only.',
        url: 'https://theradpad.slack.com/archives/C0AEG24PSQK',
        sellingServices: true,
      },
      {
        name: 'referrals',
        emoji: '🤝',
        description: "We've opened the community up for referrals. We want people like you — who show up and provide just as much value as they're able to take home.",
        url: 'https://theradpad.slack.com/archives/C0BKFB8NJSD',
      },
    ],
  },
  {
    group: 'Calls',
    items: [
      {
        name: 'community-calls',
        emoji: '📹',
        description: 'Call recordings, links, and updates. If you missed a call live, this is where you catch up.',
        url: 'https://theradpad.slack.com/archives/C0A78EGFV0C',
        link: { label: 'Call log', href: 'https://docs.google.com/spreadsheets/d/15sytr2FPCEHvXFLrEKxlMEgTrH6cBEAjcASq0kzZWb4/edit?usp=sharing' },
      },
    ],
  },
  {
    group: 'Regional',
    items: [
      {
        name: 'regional-meetups',
        emoji: '📍',
        description: 'In-person hangs and local connections. Share meetups, city-specific get-togethers, or casual hangs.',
        url: 'https://theradpad.slack.com/archives/C0A3JCTLDL3',
        regionalList: true,
      },
    ],
  },
]

const REFERRAL_URL = 'https://form.jotform.com/262156045622048'
const CALENDAR_URL = 'https://calendar.google.com/calendar/embed?src=radpad2026%40gmail.com&ctz=America%2FEdmonton'
const ICAL_URL = 'https://calendar.google.com/calendar/ical/radpad2026%40gmail.com/public/basic.ics'

const REGIONAL_CHANNELS = [
  { name: 'region-canada', emoji: '🍁' },
  { name: 'region-south-east', emoji: '🌴' },
  { name: 'region-texas', emoji: '⭐' },
  { name: 'region-new-england', emoji: '🦞' },
  { name: 'region-west-coast', emoji: '🌊' },
  { name: 'region-midwest', emoji: '🌾' },
  { name: 'region-mountain-west', emoji: '🏔️' },
  { name: 'region-world', emoji: '🌍' },
]

const SELLING_ALLOWED = [
  'Ad management (done-for-you)',
  'Website builds',
  'CRM setup & automation',
  'Bookkeeping',
  'Coaching & how-to trainings',
  'Software built for video businesses',
]

const INTRO_ROWS = [
  { label: 'Name', example: 'Casey' },
  { label: 'Location', example: 'Charleston, SC' },
  { label: 'Links', example: 'bodastudios.com · LinkedIn · IG' },
  { label: 'Fun fact', example: "I edit in DaVinci and play men's league hockey" },
]

const TOTAL_CHANNELS = CHANNELS.reduce((n, g) => n + g.items.length, 0)

// First line of an announcement is its headline; the rest is the body.
function splitMessage(message) {
  const lines = String(message || '').replace(/\r/g, '').split('\n')
  const first = lines.findIndex(l => l.trim())
  if (first === -1) return { title: '', body: '' }
  return {
    title: lines[first].trim().replace(/^📌\s*/, ''),
    body: lines.slice(first + 1).join('\n').trim(),
  }
}

function shortDate(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function copyText(text, okMessage) {
  const done = () => toast(okMessage)
  const fail = () => toast('Could not copy — long-press the link instead.', { type: 'error' })
  try {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, fail)
    else fail()
  } catch { fail() }
}

// Announcements are typed with blank lines between every item; show them as
// tight paragraphs so the text reads as one block instead of a staircase.
function Paragraphs({ text, className }) {
  const paras = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  return <div className={className}>{paras.map((p, i) => <p key={i}>{p}</p>)}</div>
}

function Bulletin({ item, isNew }) {
  const { title, body } = splitMessage(item.message)
  return (
    <div className="pad-bulletin">
      <div className="pad-eyebrow">
        <span>📌 Bulletin board</span>
        {isNew && <span className="new-chip">New</span>}
        <span className="date">{shortDate(item.created_at)}</span>
      </div>
      <h3>{title}</h3>
      {body && <Paragraphs className="pad-body" text={body} />}
    </div>
  )
}

const typeClass = t => (t === 'Skills Call' ? 'tag-amber' : t === 'Theme Call' ? 'tag-purple' : 'tag-cyan')

function NextCall({ loaded, next, now }) {
  return (
    <section className="next-card pad-next" aria-label="Next call">
      {!loaded || !now ? (
        <>
          <div className="shimmer" style={{ height: 12, width: 110, borderRadius: 4, marginBottom: 18 }} />
          <div className="shimmer" style={{ height: 28, width: '70%', borderRadius: 6, marginBottom: 14 }} />
          <div className="shimmer" style={{ height: 64, width: '80%', borderRadius: 8, marginTop: 22 }} />
        </>
      ) : next ? (
        <>
          <div className="next-top">
            <span className="lib-eyebrow cyan"><span className="dot" />{next.span.startMs <= now && !next.span.allDay ? 'Live now' : 'Next call'}</span>
            {next.ev.type && <span className={`tag ${typeClass(next.ev.type)}`}>{next.ev.type}</span>}
          </div>
          <h2 className="next-title">{next.ev.title}</h2>
          <div className="next-when">
            <span><b>{[new Date(`${next.ev.event_date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), next.ev.time].filter(Boolean).join(' · ')}</b></span>
            {next.span.hasZone && <span className="next-local">Your time: {formatInViewerZone(next.span.startMs)}</span>}
          </div>
          <Countdown startMs={next.span.startMs} endMs={next.span.endMs} allDay={next.span.allDay} />
          <div className="next-actions">
            {next.ev.zoom_url && <a className="btn-join" href={next.ev.zoom_url} target="_blank" rel="noopener noreferrer">Join on Zoom</a>}
            <AddToCalendar ev={next.ev} />
          </div>
        </>
      ) : (
        <>
          <div className="next-top"><span className="lib-eyebrow cyan"><span className="dot" />Next call</span></div>
          <h2 className="next-title">To be announced</h2>
          <p className="next-desc">Calls are usually posted one to two weeks out.</p>
          <div className="next-actions"><Link className="next-link" href="/calendar" style={{ marginLeft: 0 }}>Open the calendar →</Link></div>
        </>
      )}
    </section>
  )
}

function StartHere({ guidelinesUrl }) {
  const intro = CHANNELS[0].items.find(c => c.name === 'introductions')
  const tiles = [
    { n: 1, title: 'Say hello', text: 'Drop a quick intro so people know who you are and what you’re building.', cta: 'Open #introductions', href: intro.url, external: true },
    { n: 2, title: 'Read the guidelines', text: 'How we show up for each other, in one short read.', cta: guidelinesUrl ? 'Read them' : 'Open resources', href: guidelinesUrl || '/resources', external: !!guidelinesUrl },
    { n: 3, title: 'Join a call', text: 'Weekly community calls, shown in your own time zone.', cta: 'See the schedule', href: '/calendar' },
    { n: 4, title: 'Refer someone', text: 'Know a great fit? Send them our form. It’s for them to fill out, not you.', cta: 'Copy the link', action: () => copyText(REFERRAL_URL, 'Referral link copied') },
  ]
  return (
    <section className="sec">
      <div className="sec-head"><h2>Start here</h2></div>
      <div className="start-grid">
        {tiles.map(t => {
          const inner = (
            <>
              <span className="start-n">{t.n}</span>
              <b>{t.title}</b>
              <span className="start-text">{t.text}</span>
              <span className="start-cta">{t.cta} {t.external ? '↗' : '→'}</span>
            </>
          )
          if (t.action) return <button key={t.n} type="button" className="start-tile" onClick={t.action}>{inner}</button>
          return t.external
            ? <a key={t.n} className="start-tile" href={t.href} target="_blank" rel="noopener noreferrer">{inner}</a>
            : <Link key={t.n} className="start-tile" href={t.href}>{inner}</Link>
        })}
      </div>
    </section>
  )
}

function ChannelCard({ channel }) {
  const hasMore = channel.introFormat || channel.sellingServices || channel.regionalList
  const moreLabel = channel.introFormat ? 'Intro format' : channel.sellingServices ? 'What’s allowed' : 'Regional channels'
  return (
    <div className="ch">
      <div className="ch-head">
        <span className="ch-emoji" aria-hidden="true">{channel.emoji}</span>
        <span className="ch-name">#{channel.name}</span>
        <span className="ch-group-tag">{channel.group}</span>
      </div>
      <p className="ch-desc">{channel.description}</p>
      {channel.note && <div className="ch-note">{channel.note}</div>}

      {hasMore && (
        <details className="ch-more">
          <summary>{moreLabel}</summary>
          <div className="ch-detail">
            {channel.introFormat && INTRO_ROWS.map(row => (
              <div key={row.label} className="intro-row">
                <span>{row.label}</span>
                <span>{row.example}</span>
              </div>
            ))}
            {channel.sellingServices && (
              <>
                <div className="chip-row">
                  {SELLING_ALLOWED.map(s => <span key={s} className="chip">{s}</span>)}
                </div>
                <div className="ch-rule">1 post per quarter · No cold DMs · No leveraging the Pad to build your own paid program</div>
              </>
            )}
            {channel.regionalList && (
              <div className="chip-row">
                {REGIONAL_CHANNELS.map(r => <span key={r.name} className="chip">{r.emoji} #{r.name}</span>)}
              </div>
            )}
          </div>
        </details>
      )}

      <div className="ch-foot">
        <a className="btn sm cyan" href={channel.url} target="_blank" rel="noopener noreferrer">Open in Slack ↗</a>
        {channel.link && <a className="btn sm" href={channel.link.href} target="_blank" rel="noopener noreferrer">{channel.link.label} ↗</a>}
      </div>
    </div>
  )
}

function PreviousAnnouncement({ item }) {
  const { title, body } = splitMessage(item.message)
  return (
    <details className="prev">
      <summary>
        <span className="prev-title">{title || 'Announcement'}</span>
        <span className="prev-date">{shortDate(item.created_at)}</span>
      </summary>
      {body && <Paragraphs className="pad-body prev-body" text={body} />}
    </details>
  )
}

export default function ThePad() {
  const now = useNow(30000)
  const [announcements, setAnnouncements] = useState([])
  const [archived, setArchived] = useState([])
  const [events, setEvents] = useState([])
  const [recordings, setRecordings] = useState([])
  const [guidelinesUrl, setGuidelinesUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('All')
  const [mapOpen, setMapOpen] = useState(false)
  const seenSnapshot = useSeenSnapshot('announcements')

  useEffect(() => {
    async function load() {
      const y = new Date(Date.now() - 86400000)
      const since = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
      const [ann, ev, rec, guide] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('events').select('*').gte('event_date', since).order('event_date', { ascending: true }).limit(8),
        supabase.from('recordings').select('id,title,date,duration,host,video_url,call_type,sub_topic').order('date', { ascending: false }).limit(4),
        supabase.from('resources').select('file_url').ilike('title', '%guidelines%').limit(1),
      ])
      const data = ann.data || []
      setAnnouncements(data.filter(a => !a.archived))
      setArchived(data.filter(a => a.archived))
      setEvents(ev.data || [])
      setRecordings(rec.data || [])
      setGuidelinesUrl(guide.data?.[0]?.file_url || '')
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!mapOpen) return
    const onKey = e => { if (e.key === 'Escape') setMapOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mapOpen])

  const next = useMemo(() => {
    if (!now) return null
    return events
      .filter(ev => !isNotice(ev))
      .map(ev => ({ ev, span: eventSpan(ev) }))
      .filter(x => x.span && x.span.endMs > now)
      .sort((a, b) => a.span.startMs - b.span.startMs)[0] || null
  }, [events, now])

  const q = search.trim().toLowerCase()
  const channels = useMemo(() => CHANNELS
    .filter(g => group === 'All' || g.group === group)
    .flatMap(g => g.items.map(ch => ({ ...ch, group: g.group })))
    .filter(ch => !q || `${ch.name} ${ch.description} ${ch.group}`.toLowerCase().includes(q)), [q, group])

  const current = announcements[0]
  const previous = [...announcements.slice(1), ...archived]

  return (
    <Layout>
      <div className="section-label">Community</div>
      <div className="section-title">The Pad</div>
      <p className="section-desc">How this community works: what’s new, where to talk, and how to get the most out of it.</p>

      <div className={`pad-top${current ? '' : ' solo'}`}>
        {!loading && current ? <Bulletin item={current} isNew={isNewSince(current.created_at, seenSnapshot)} /> : null}
        <NextCall loaded={!loading} next={next} now={now} />
      </div>

      <StartHere guidelinesUrl={guidelinesUrl} />

      <div className="sec-head pad-find-head"><h2>Channels</h2><span className="count">{TOTAL_CHANNELS}</span></div>
      <div className="pad-tools">
        <input
          className="search-input"
          type="search"
          placeholder={`Find a channel (${TOTAL_CHANNELS})…`}
          aria-label="Find a channel"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-tags">
          {['All', ...CHANNELS.map(g => g.group)].map(g => (
            <button key={g} className={`filter-tag${group === g ? ' active' : ''}`} onClick={() => setGroup(g)}>{g}</button>
          ))}
        </div>
      </div>

      <div className="sec">
        {channels.length === 0 ? (
          <div className="empty">No channels match “{search}”.</div>
        ) : (
          <div className="ch-grid">
            {channels.map(ch => <ChannelCard key={ch.name} channel={ch} />)}
          </div>
        )}
        <p className="pad-fine">
          Slack messages disappear after 90 days on our plan, so this is the permanent record of how each channel works.
          {q || group !== 'All' ? ` Showing ${channels.length} of ${TOTAL_CHANNELS} channels.` : ''}
        </p>
      </div>

      {recordings.length > 0 && (
        <section className="sec">
          <div className="sec-head"><h2>Catch up on a call</h2><Link className="sec-link" href="/recordings">All calls →</Link></div>
          <div className="rail">
            {recordings.map(rec => (
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

      <div className="pad-pair">
        <div className="pad-tile">
          <div className="sec-head"><h2>Regional map</h2></div>
          <button type="button" className="pad-map-btn" onClick={() => setMapOpen(true)} aria-label="Enlarge the regional channel map">
            <img src="/regional-map.png" alt="The Rad Pad North America Regional Channel Map" loading="lazy" />
            <span className="pad-map-hint">Tap to enlarge</span>
          </button>
        </div>
        <div className="pad-tile">
          <div className="sec-head"><h2>Community calendar</h2></div>
          <p className="pad-tile-text">Add the iCal feed to sync every community call to your own calendar, or browse them in Google Calendar.</p>
          <div className="pad-actions">
            <a className="btn cyan" href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">📅 Google Calendar ↗</a>
            <a className="btn" href={ICAL_URL} target="_blank" rel="noopener noreferrer">📆 iCal feed ↗</a>
          </div>
        </div>
      </div>

      {previous.length > 0 && (
        <div className="sec">
          <div className="sec-head"><h2>Previous announcements</h2><span className="count">{previous.length}</span></div>
          <div className="prev-list">
            {previous.map(a => <PreviousAnnouncement key={a.id} item={a} />)}
          </div>
        </div>
      )}

      {mapOpen && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Regional channel map" onClick={() => setMapOpen(false)}>
          <button type="button" className="lightbox-close" onClick={() => setMapOpen(false)} aria-label="Close">✕</button>
          <img src="/regional-map.png" alt="The Rad Pad North America Regional Channel Map" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </Layout>
  )
}
