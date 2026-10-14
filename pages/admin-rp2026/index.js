import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { AdminProvider } from '../../components/admin/AdminContext'
import AdminShell, { NAV } from '../../components/admin/AdminShell'
import Overview from '../../components/admin/Overview'
import ApprovalsSection from '../../components/admin/ApprovalsSection'
import AnnouncementsSection from '../../components/admin/AnnouncementsSection'
import ContentSection from '../../components/admin/ContentSection'
import { MembersSection, PinsSection, AccessSection } from '../../components/admin/PeopleSections'

const VIEWS = NAV.flatMap(g => g.items).map(i => i.id)
const CONTENT_KINDS = { recordings: 'recording', resources: 'resource', events: 'event', links: 'link' }

function AdminApp() {
  const [view, setView] = useState('overview')
  const [intent, setIntent] = useState(null)

  // The current tab lives in the URL hash: a refresh lands where you were, and
  // Back/Forward step between tabs.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1)
      setIntent(null)
      setView(VIEWS.includes(h) ? h : 'overview')
    }
    fromHash()
    window.addEventListener('popstate', fromHash)
    return () => window.removeEventListener('popstate', fromHash)
  }, [])

  const go = useCallback((next, nextIntent = null) => {
    setIntent(nextIntent)
    setView(next)
    if (window.location.hash !== `#${next}`) window.history.pushState(null, '', `#${next}`)
    window.scrollTo({ top: 0 })
  }, [])

  const clearIntent = useCallback(() => setIntent(null), [])

  let body
  if (view === 'overview') body = <Overview go={go} />
  else if (view === 'approvals') body = <ApprovalsSection />
  else if (view === 'announcements') body = <AnnouncementsSection />
  else if (view === 'members') body = <MembersSection />
  else if (view === 'pins') body = <PinsSection />
  else if (view === 'access') body = <AccessSection />
  else if (CONTENT_KINDS[view]) body = <ContentSection kind={CONTENT_KINDS[view]} intent={intent} clearIntent={clearIntent} go={go} />

  return (
    <AdminShell view={view} go={go}>
      <Head>
        <title>Admin · The Rad Pad</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      {/* key remounts the section on tab change so each tab loads fresh data
          and starts with a clean search/sort/panel state. */}
      <div key={view}>{body}</div>
    </AdminShell>
  )
}

export default function Admin() {
  return (
    <AdminProvider>
      <AdminApp />
    </AdminProvider>
  )
}
