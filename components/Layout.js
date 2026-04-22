import Link from 'next/link'
import { useRouter } from 'next/router'

const NAV = [
  {
    href: '/', label: 'Home',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 6.5L8 2l6 4.5V14H10v-4H6v4H2V6.5z" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
  },
  {
    href: '/resources', label: 'Resources',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 6h6M5 9h6M5 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
  },
  {
    href: '/recordings', label: 'Recordings',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M6.5 5.5l4 2.5-4 2.5V5.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
  },
  {
    href: '/calendar', label: 'Calendar',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
  },
  {
    href: '/links', label: 'Links',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5L7 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5L9 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
  },
]

export default function Layout({ children }) {
  const { pathname } = useRouter()

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo-wrap">
          <Link href="/" className="logo">The Rad Pad</Link>
          <span className="logo-sub">Members Hub</span>
        </div>
        <nav>
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item${pathname === href ? ' active' : ''}`}
            >
              {icon}
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            Referral-Only Community
          </div>
        </div>
      </aside>
      <main className="main">
        {children}
      </main>
    </div>
  )
}
