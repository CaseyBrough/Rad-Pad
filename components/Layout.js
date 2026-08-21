import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const NAV = [
  {
    href: '/', label: 'Home',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 6.5L8 2l6 4.5V14H10v-4H6v4H2V6.5z" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
  },
  {
    href: '/the-pad', label: 'The Pad',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 3h12M2 6h8M2 9h10M2 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
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
    href: '/directory', label: 'Directory',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
  },
  {
    href: '/map', label: 'Map',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 14s5-4.5 5-8.5A5 5 0 003 5.5C3 9.5 8 14 8 14z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><circle cx="8" cy="5.5" r="1.6" stroke="currentColor" strokeWidth="1.3"/></svg>
  },
  {
    href: '/links', label: 'Links',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5L7 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5L9 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
  },
]

export default function Layout({ children }) {
  const { pathname } = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Below the 768px breakpoint the sidebar becomes a slide-in drawer -
  // close it automatically on every navigation so it doesn't stay open
  // over the new page.
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="layout">
      {/* Mobile-only top bar - hidden on desktop via CSS, this is the
          member's only way to open the nav once the sidebar collapses
          below 768px. */}
      <div className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(v => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          )}
        </button>
        <Link href="/" className="mobile-topbar-logo">The Rad Pad</Link>
      </div>

      {mobileOpen && <div className="mobile-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
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
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 10 }}>
            Referral-Only Community
          </div>
          <button
            onClick={logout}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            Log Out
          </button>
        </div>
      </aside>
      <main className="main">
        {children}
      </main>
    </div>
  )
}
