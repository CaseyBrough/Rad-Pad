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
      },
      {
        name: 'start-here',
        emoji: '📌',
        description: 'New? Start here. Check the pins tab for important information and links including the Member Hub.',
        url: 'https://theradpad.slack.com/archives/C0A394HH11D',
      },
      {
        name: 'introductions',
        emoji: '👋',
        description: 'New here? Drop a quick intro so we know who you are and what you\'re building.',
        url: 'https://theradpad.slack.com/archives/C0A3JCQCDAP',
        note: 'Use this format: Name · Location · Links · Fun or random fact',
      },
      {
        name: 'wins',
        emoji: '🏆',
        description: 'Big wins, small wins, progress wins. Share what\'s working, what you shipped, or something you\'re proud of. Celebrate each other.',
        url: 'https://theradpad.slack.com/archives/C0A3QQ4DLCA',
      },
      {
        name: 'random',
        emoji: '🎲',
        description: 'Off-topic, fun, and human. Memes, music, side conversations, and anything that doesn\'t belong elsewhere. Keep it respectful.',
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
    group: 'Work & Craft',
    items: [
      {
        name: 'pre-pro-post-questions',
        emoji: '🎬',
        description: 'Questions about production workflows. Pre-pro, on-set, post, delivery, process, or troubleshooting. Ask specifics, get specific answers.',
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
        description: 'Post project needs and collaboration opportunities here. Hiring an editor, looking for a colorist, staffing a shoot, white-labeling overflow work.',
        url: 'https://theradpad.slack.com/archives/C0AEBPQ6LDB',
        note: 'Demand-driven only. You\'re posting an opportunity, not pitching yourself.',
      },
      {
        name: 'selling-services',
        emoji: '🛎️',
        description: 'Done-for-you and implementation-based services only. Ad management, website builds, bookkeeping, automation systems, coaching, how-to trainings.',
        url: 'https://theradpad.slack.com/archives/C0AEG24PSQK',
        note: 'One post per service per quarter. No cold DMs after posting.',
      },
      {
        name: 'hosting',
        emoji: '🎙️',
        description: 'Interested in hosting a community call? This is where that happens. Sign up and get on the schedule.',
        url: 'https://theradpad.slack.com/archives/C0A9Z5N8VMH',
      },
    ],
  },
  {
    group: 'Calls',
    items: [
      {
        name: 'community-calls',
        emoji: '📹',
        description: 'Call recordings, links, and updates. If you missed a call live, this is where you catch up. All recordings also live in the Member Hub.',
        url: 'https://theradpad.slack.com/archives/C0A78EGFV0C',
      },
    ],
  },
  {
    group: 'Regional',
    items: [
      {
        name: 'regional-meetups',
        emoji: '📍',
        description: 'In-person hangs and local connections. Share meetups, city-specific get-togethers, conferences, or casual hangs.',
        url: 'https://theradpad.slack.com/archives/C0A3JCTLDL3',
      },
      {
        name: 'region-canada',
        emoji: '🍁',
        description: 'Canadian members connecting locally.',
        url: 'https://theradpad.slack.com/archives/region-canada',
      },
      {
        name: 'region-south-east',
        emoji: '🌴',
        description: 'Southeast US members.',
        url: 'https://theradpad.slack.com/archives/region-south-east',
      },
      {
        name: 'region-texas',
        emoji: '⭐',
        description: 'Texas members.',
        url: 'https://theradpad.slack.com/archives/region-texas',
      },
      {
        name: 'region-new-england',
        emoji: '🦞',
        description: 'New England members.',
        url: 'https://theradpad.slack.com/archives/region-new-england',
      },
      {
        name: 'region-west-coast',
        emoji: '🌊',
        description: 'West Coast members.',
        url: 'https://theradpad.slack.com/archives/region-west-coast',
      },
      {
        name: 'region-midwest',
        emoji: '🌾',
        description: 'Midwest members.',
        url: 'https://theradpad.slack.com/archives/region-midwest',
      },
      {
        name: 'region-mountian',
        emoji: '🏔️',
        description: 'Mountain region members.',
        url: 'https://theradpad.slack.com/archives/region-mountian',
      },
      {
        name: 'region-world',
        emoji: '🌍',
        description: 'International members outside North America.',
        url: 'https://theradpad.slack.com/archives/region-world',
      },
    ],
  },
]

function AnnouncementCard({ item, isArchive }) {
  const date = new Date(item.created_at)
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <div style={{
      background: isArchive ? 'rgba(255,255,255,0.02)' : 'rgba(255,45,120,0.04)',
      border: `1px solid ${isArchive ? 'var(--border)' : 'rgba(255,45,120,0.25)'}`,
      borderRadius: 12,
      padding: '18px 22px',
      opacity: isArchive ? 0.6 : 1,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: isArchive ? 'var(--muted)' : 'var(--pink)', marginBottom: 8 }}>{formatted}</div>
      <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.message}</div>
    </div>
  )
}

function ChannelCard({ channel }) {
  return (
    <a
      href={channel.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none' }}
    >
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(0,245,228,0.35)'
          e.currentTarget.style.background = 'rgba(0,245,228,0.03)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.background = 'var(--card)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 16 }}>{channel.emoji}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.05em' }}>#{channel.name}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, marginBottom: channel.note ? 10 : 0 }}>{channel.description}</div>
        {channel.note && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--pink)',
            background: 'rgba(255,45,120,0.08)',
            border: '1px solid rgba(255,45,120,0.15)',
            borderRadius: 6,
            padding: '5px 10px',
            marginTop: 8,
            lineHeight: 1.5,
          }}>
            {channel.note}
          </div>
        )}
      </div>
    </a>
  )
}

export default function ThePad() {
  const [announcements, setAnnouncements] = useState([])
  const [archived, setArchived] = useState([])
  const [loading, setLoading] = useState(true)
  const [showArchive, setShowArchive] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
      const active = (data || []).filter(a => !a.archived)
      const arch = (data || []).filter(a => a.archived)
      setAnnouncements(active)
      setArchived(arch)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <Layout>
      <div className="section-label">Community</div>
      <div className="section-title">The Pad</div>
      <p className="section-desc">Everything you need to know about how this community works — channels, rules, and what's happening.</p>

      {/* BULLETIN BOARD */}
      {!loading && announcements.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--pink)' }}>📌 Bulletin Board</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {announcements.map(a => <AnnouncementCard key={a.id} item={a} isArchive={false} />)}
          </div>
        </div>
      )}

      {/* CHANNEL GUIDE */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Channel Guide</div>
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

      {/* ARCHIVE */}
      {archived.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchive(v => !v)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}
          >
            {showArchive ? 'Hide' : 'Show'} Announcement Archive ({archived.length})
          </button>
          {showArchive && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {archived.map(a => <AnnouncementCard key={a.id} item={a} isArchive={true} />)}
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
