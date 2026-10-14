import { useState } from 'react'
import { useAdmin } from './AdminContext'
import { Icon } from './ui'

// Sidebar structure. `badge` names a key in the live counts object.
export const NAV = [
  { items: [{ id: 'overview', label: 'Overview', icon: 'overview' }] },
  { items: [{ id: 'approvals', label: 'Approvals', icon: 'approvals', badge: 'pending' }] },
  {
    label: 'Content',
    items: [
      { id: 'announcements', label: 'Announcements', icon: 'announce' },
      { id: 'recordings', label: 'Recordings', icon: 'recording' },
      { id: 'resources', label: 'Resources', icon: 'resource' },
      { id: 'events', label: 'Events', icon: 'event' },
      { id: 'links', label: 'Links', icon: 'link' },
    ],
  },
  {
    label: 'People',
    items: [
      { id: 'members', label: 'Members', icon: 'member' },
      { id: 'pins', label: 'Map Pins', icon: 'pin' },
      { id: 'access', label: 'Login Access', icon: 'key', quiet: 'access' },
    ],
  },
]

export default function AdminShell({ view, go, children }) {
  const { counts } = useAdmin()
  const [open, setOpen] = useState(false)
  const pick = id => { setOpen(false); go(id) }

  return (
    <div className="adm">
      <div className="adm-top">
        <button className="adm-top-btn" onClick={() => setOpen(o => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          <Icon name={open ? 'close' : 'menu'} size={18} />
        </button>
        <span className="adm-top-title">The Rad Pad</span>
        {counts?.pending > 0 && <span className="adm-badge" style={{ marginLeft: 'auto' }}>{counts.pending}</span>}
      </div>

      {open && <div className="adm-backdrop" onClick={() => setOpen(false)} />}

      <aside className={`adm-side${open ? ' open' : ''}`}>
        <div className="adm-brand">The Rad Pad<small>Admin</small></div>

        <nav aria-label="Admin sections">
          {NAV.map((group, gi) => (
            <div className="adm-nav-group" key={gi}>
              {group.label && <div className="adm-nav-label">{group.label}</div>}
              {group.items.map(item => {
                const n = item.badge ? counts?.[item.badge] : null
                const q = item.quiet ? counts?.[item.quiet] : null
                return (
                  <button key={item.id} className={`adm-nav-item${view === item.id ? ' active' : ''}`} onClick={() => pick(item.id)} aria-current={view === item.id ? 'page' : undefined}>
                    <Icon name={item.icon} />
                    {item.label}
                    {n > 0 && <span className="adm-badge">{n}</span>}
                    {q > 0 && <span className="adm-badge quiet">{q}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="adm-side-foot">
          <a href="/" target="_blank" rel="noopener noreferrer">View the site ↗</a>
          <div>Keep this URL private.</div>
        </div>
      </aside>

      <main className="adm-main">
        <div className="adm-inner">{children}</div>
      </main>
    </div>
  )
}
