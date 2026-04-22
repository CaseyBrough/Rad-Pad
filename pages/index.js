import Layout from '../components/Layout'
import Link from 'next/link'

const QUICK = [
  {
    href: '/recordings', label: 'Call Recordings',
    desc: 'Every coaching call and hot seat, tagged and searchable.',
    color: 'cyan',
    icon: <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#00F5E4" strokeWidth="1.3"/><path d="M6.5 5.5l4 2.5-4 2.5V5.5z" fill="#00F5E4"/></svg>
  },
  {
    href: '/resources', label: 'Resources',
    desc: 'Templates, guides, and files filtered by category.',
    color: 'pink',
    icon: <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="14" rx="1.5" stroke="#FF2D78" strokeWidth="1.3"/><path d="M5 6h6M5 9h6M5 12h4" stroke="#FF2D78" strokeWidth="1.3" strokeLinecap="round"/></svg>
  },
  {
    href: '/calendar', label: 'Calendar',
    desc: 'Upcoming calls, community events, and office hours.',
    color: 'cyan',
    icon: <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="#00F5E4" strokeWidth="1.3"/><path d="M5 2v2M11 2v2M2 7h12" stroke="#00F5E4" strokeWidth="1.3" strokeLinecap="round"/></svg>
  },
  {
    href: '/links', label: 'Links',
    desc: 'Curated tools, affiliate picks, and recommended services.',
    color: 'pink',
    icon: <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5L7 4" stroke="#FF2D78" strokeWidth="1.3" strokeLinecap="round"/><path d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5L9 12" stroke="#FF2D78" strokeWidth="1.3" strokeLinecap="round"/></svg>
  },
]

export default function Home() {
  return (
    <Layout>
      <div style={{ paddingTop: 16 }}>
        {/* Hero */}
        <div style={{ paddingBottom: 48, borderBottom: '1px solid var(--border)', marginBottom: 48 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 80,
            color: 'var(--pink)',
            lineHeight: 1,
            marginBottom: 10,
            textShadow: '0 0 40px rgba(255,45,120,0.4), 0 0 80px rgba(255,45,120,0.15)'
          }}>
            The Rad Pad
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--cyan)',
            marginBottom: 18
          }}>
            Referral-Only · Video Business Owners
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 440, lineHeight: 1.7 }}>
            Your private hub for coaching calls, resources, community events, and everything we're building together.
          </p>
        </div>

        {/* Quick links */}
        <div className="section-label">Quick Access</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16, marginTop: 16 }}>
          {QUICK.map(({ href, label, desc, color, icon }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 9,
                  background: color === 'cyan' ? 'rgba(0,245,228,0.1)' : 'rgba(255,45,120,0.1)',
                  border: `1px solid ${color === 'cyan' ? 'rgba(0,245,228,0.22)' : 'rgba(255,45,120,0.22)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {icon}
                </div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, letterSpacing: '0.04em' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}
