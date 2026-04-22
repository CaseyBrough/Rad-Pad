import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

const QUICK = [
  {
    href: '/recordings', label: 'Call Recordings',
    desc: 'Every coaching call and hot seat, tagged and searchable.',
    color: 'cyan',
  },
  {
    href: '/resources', label: 'Resources',
    desc: 'Templates, guides, and files filtered by category.',
    color: 'pink',
  },
  {
    href: '/calendar', label: 'Calendar',
    desc: 'Upcoming calls, community events, and office hours.',
    color: 'cyan',
  },
  {
    href: '/links', label: 'Links',
    desc: 'Curated tools, affiliate picks, and recommended services.',
    color: 'pink',
  },
]

export default function Home() {
  const [latestRec, setLatestRec] = useState(null)
  const [nextEvent, setNextEvent] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: rec } = await supabase
        .from('recordings')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single()
      if (rec) setLatestRec(rec)

      const today = new Date().toISOString().split('T')[0]
      const { data: ev } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(1)
        .single()
      if (ev) setNextEvent(ev)
    }
    load()
  }, [])

  return (
    <Layout>
      <div style={{ paddingTop: 16 }}>
        <div style={{ paddingBottom: 48, borderBottom: '1px solid var(--border)', marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 80, color: 'var(--pink)', lineHeight: 1, marginBottom: 10, textShadow: '0 0 40px rgba(255,45,120,0.4), 0 0 80px rgba(255,45,120,0.15)' }}>
            The Rad Pad
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 18 }}>
            Referral-Only · Video Business Owners
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 440, lineHeight: 1.7 }}>
            Your private hub for coaching calls, resources, community events, and everything we're building together.
          </p>
        </div>

        {(latestRec || nextEvent) && (
          <div style={{ display: 'grid', gridTemplateColumns: latestRec && nextEvent ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 40 }}>
            {latestRec && (
              <Link href="/recordings" style={{ textDecoration: 'none' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(255,45,120,0.12), rgba(255,45,120,0.04))', border: '1px solid rgba(255,45,120,0.3)', borderRadius: 14, padding: '22px 24px', cursor: 'pointer', transition: 'all 0.22s', height: '100%' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--pink)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pink)', display: 'inline-block', boxShadow: '0 0 6px var(--pink)' }} />
                    Latest Recording
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 }}>{latestRec.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>{latestRec.description}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', display: 'flex', gap: 14 }}>
                    <span>{latestRec.date}</span>
                    {latestRec.duration && <span style={{ color: 'var(--cyan)' }}>{latestRec.duration}</span>}
                    {latestRec.host && <span>Host: {latestRec.host}</span>}
                  </div>
                </div>
              </Link>
            )}
            {nextEvent && (
              <Link href="/calendar" style={{ textDecoration: 'none' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(0,245,228,0.08), rgba(0,245,228,0.02))', border: '1px solid rgba(0,245,228,0.25)', borderRadius: 14, padding: '22px 24px', cursor: 'pointer', transition: 'all 0.22s', height: '100%' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block', boxShadow: '0 0 6px var(--cyan)' }} />
                    Up Next
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 }}>{nextEvent.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>{nextEvent.description}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', display: 'flex', gap: 14 }}>
                    <span>{nextEvent.event_date}</span>
                    {nextEvent.time && <span>{nextEvent.time}</span>}
                    {nextEvent.type && <span style={{ color: 'var(--cyan)' }}>{nextEvent.type}</span>}
                  </div>
                </div>
              </Link>
            )}
          </div>
        )}

        <div className="section-label">Quick Access</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16, marginTop: 16 }}>
          {QUICK.map(({ href, label, desc, color }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ gap: 12 }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, letterSpacing: '0.04em', color: color === 'cyan' ? 'var(--cyan)' : 'var(--pink)' }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}
