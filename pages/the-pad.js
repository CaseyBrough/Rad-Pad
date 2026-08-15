import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const CHANNELS = [
  {
    group: 'Core',
    items: [
      {
        name: 'general',
        emoji: '📡',
        description: 'Everything happening across The Rad Pad in one place. Big conversations, cross-channel moments, and things worth the whole community seeing.',
        url: 'https://theradpad.slack.com/archives/C0A394HH11D',
        link: { label: 'Open Member Hub', href: 'https://rad-pad.vercel.app' },
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
        description: "The mental side of running a business. Mindset, motivation, and the stuff nobody talks about enough.",
        url: 'https://theradpad.slack.com/archives/C0AJMULEY0P',
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
        link: { label: 'View call log', href: 'https://docs.google.com/spreadsheets/d/15sytr2FPCEHvXFLrEKxlMEgTrH6cBEAjcASq0kzZWb4/edit?usp=sharing' },
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

function AnnouncementCard({ item, isArchive }) {
  const formatted = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <div style={{
      background: isArchive ? 'rgba(255,255,255,0.02)' : 'rgba(255,45,120,0.04)',
      border: '1px solid ' + (isArchive ? 'var(--border)' : 'rgba(255,45,120,0.25)'),
      borderRadius: 12,
      padding: '18px 22px',
      opacity: isArchive ? 0.6 : 1,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: isArchive ? 'var(--muted)' : 'var(--pink)', marginBottom: 8 }}>{formatted}</div>
      <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.message}</div>
    </div>
  )
}

function ReferralCard() {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(REFERRAL_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 6 }}>
        Know someone who'd be a great fit? Send them this link.
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.04em', marginBottom: 14 }}>
        This form is for the person joining to fill out — not you.
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <span
          onClick={copyLink}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10,
            color: copied ? 'var(--cyan)' : 'var(--muted)',
            background: copied ? 'rgba(0,245,228,0.07)' : 'rgba(255,255,255,0.04)',
            border: '1px solid ' + (copied ? 'rgba(0,245,228,0.2)' : 'var(--border)'),
            borderRadius: 8, padding: '8px 14px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copied' : '📋 Copy Link'}
        </span>
        <span
          onClick={() => window.open(REFERRAL_URL, '_blank')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--pink)', background: 'rgba(255,45,120,0.07)', border: '1px solid rgba(255,45,120,0.2)', borderRadius: 8, padding: '8px 14px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          ↗ Refer a New Member
        </span>
      </div>
    </div>
  )
}

function ChannelCard({ channel }) {
  return (
    <a href={channel.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <div className="card" style={{ gap: 0, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>{channel.emoji}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.05em' }}>#{channel.name}</span>
        </div>

        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>{channel.description}</div>

        {channel.introFormat && (
          <div style={{ marginTop: 12, background: 'rgba(0,245,228,0.05)', border: '1px solid rgba(0,245,228,0.15)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Intro format</div>
            {INTRO_ROWS.map(row => (
              <div key={row.label} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--pink)', minWidth: 56 }}>{row.label}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{row.example}</span>
              </div>
            ))}
          </div>
        )}

        {channel.sellingServices && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {SELLING_ALLOWED.map(s => (
                <span key={s} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)', background: 'rgba(0,245,228,0.07)', border: '1px solid rgba(0,245,228,0.15)', borderRadius: 4, padding: '3px 8px' }}>{s}</span>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--pink)', background: 'rgba(255,45,120,0.06)', border: '1px solid rgba(255,45,120,0.15)', borderRadius: 6, padding: '6px 10px', lineHeight: 1.6 }}>
              1 post per quarter · No cold DMs · No leveraging the Pad to build your own paid program
            </div>
          </div>
        )}

        {channel.regionalList && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {REGIONAL_CHANNELS.map(r => (
              <span key={r.name} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)', background: 'rgba(0,245,228,0.07)', border: '1px solid rgba(0,245,228,0.15)', borderRadius: 4, padding: '3px 8px' }}>
                {r.emoji} #{r.name}
              </span>
            ))}
          </div>
        )}

        {channel.note && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--pink)', background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.15)', borderRadius: 6, padding: '5px 10px', marginTop: 10, lineHeight: 1.5 }}>
            {channel.note}
          </div>
        )}

        {channel.link && (
          <span
            onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(channel.link.href, '_blank') }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(0,245,228,0.07)', border: '1px solid rgba(0,245,228,0.2)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}
          >
            ↗ {channel.link.label}
          </span>
        )}
      </div>
    </a>
  )
}

export default function ThePad() {
  const [announcements, setAnnouncements] = useState([])
  const [archived, setArchived] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
      setAnnouncements((data || []).filter(a => !a.archived))
      setArchived((data || []).filter(a => a.archived))
      setLoading(false)
    }
    load()
  }, [])

  const oldest = [...announcements.slice(1), ...archived]

  return (
    <Layout>
      <div className="section-label">Community</div>
      <div className="section-title">The Pad</div>
      <p className="section-desc">Everything you need to know about how this community works — channels, rules, and what's happening.</p>

      {!loading && announcements.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 36, letterSpacing: '0.04em', color: 'var(--pink)', marginBottom: 16, textShadow: '0 0 40px rgba(255,45,120,0.4), 0 0 80px rgba(255,45,120,0.15)' }}>📌 Bulletin Board</div>
          <AnnouncementCard item={announcements[0]} isArchive={false} />
        </div>
      )}

      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 36, letterSpacing: '0.04em', color: 'var(--cyan)', textShadow: '0 0 40px rgba(0,245,228,0.4), 0 0 80px rgba(0,245,228,0.15)', marginBottom: 16 }}>Refer Someone</div>
        <ReferralCard />
      </div>

      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 36, letterSpacing: '0.04em', color: 'var(--text)', marginBottom: 6 }}>Channel Guide</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.6 }}>
          Slack messages disappear after 90 days on our plan — this is the permanent record of how each channel works. Click any channel to open it in Slack.
        </div>
        {CHANNELS.map(group => (
          <div key={group.group} style={{ marginBottom: 36 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
              {group.group}
            </div>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {group.items.map(ch => <ChannelCard key={ch.name} channel={ch} />)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
          Regional Map
        </div>
        <img
          src="/regional-map.png"
          alt="The Rad Pad North America Regional Channel Map"
          style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }}
        />
      </div>

      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
          Community Calendar
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span
            onClick={() => window.open('https://calendar.google.com/calendar/embed?src=radpad2026%40gmail.com&ctz=America%2FEdmonton', '_blank')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cyan)', background: 'rgba(0,245,228,0.07)', border: '1px solid rgba(0,245,228,0.2)', borderRadius: 8, padding: '8px 14px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            📅 View Google Calendar
          </span>
          <span
            onClick={() => window.open('https://calendar.google.com/calendar/ical/radpad2026%40gmail.com/public/basic.ics', '_blank')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            📆 Add iCal Feed
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginTop: 8, letterSpacing: '0.06em' }}>
          Add the iCal feed to sync community calls directly to your own calendar.
        </div>
      </div>

      {oldest.length > 0 && (
        <div>
          <button
            onClick={() => setShowMore(v => !v)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}
          >
            {showMore ? 'Hide' : 'Show'} Previous Announcements ({oldest.length})
          </button>
          {showMore && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {oldest.map(a => <AnnouncementCard key={a.id} item={a} isArchive={true} />)}
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
