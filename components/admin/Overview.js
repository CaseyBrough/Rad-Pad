import { useAdmin } from './AdminContext'
import { Icon, PageHeader } from './ui'

const STATS = [
  { key: 'recordings', label: 'Recordings', view: 'recordings' },
  { key: 'resources', label: 'Resources', view: 'resources' },
  { key: 'events', label: 'Events', view: 'events' },
  { key: 'links', label: 'Links', view: 'links' },
  { key: 'members', label: 'Members', view: 'members' },
  { key: 'pins', label: 'Map pins', view: 'pins' },
  { key: 'access', label: 'Login emails', view: 'access' },
]

export default function Overview({ go }) {
  const { counts } = useAdmin()
  const pending = counts?.pending ?? 0

  const parts = counts ? [
    counts.membersPending > 0 && `${counts.membersPending} Directory profile${counts.membersPending === 1 ? '' : 's'}`,
    counts.pinsPending > 0 && `${counts.pinsPending} map pin${counts.pinsPending === 1 ? '' : 's'}`,
    counts.linksPending > 0 && `${counts.linksPending} suggested link${counts.linksPending === 1 ? '' : 's'}`,
  ].filter(Boolean) : []

  return (
    <>
      <PageHeader title="Overview" sub="What needs you, and a quick way into everything else." />

      <div className="adm-section">
        {!counts ? (
          <div className="adm-card"><p>Checking for new submissions…</p></div>
        ) : pending > 0 ? (
          <div className="adm-card alert">
            <h2>{pending} waiting for approval</h2>
            <p>{parts.join(', ')}.</p>
            <div className="adm-queue">
              <button className="adm-btn primary" onClick={() => go('approvals')}>Review now</button>
            </div>
          </div>
        ) : (
          <div className="adm-card ok"><h2>All caught up</h2><p>Nothing is waiting for approval.</p></div>
        )}
      </div>

      <div className="adm-section">
        <div className="adm-label">Quick actions</div>
        <div className="adm-actions">
          <button className="adm-btn" onClick={() => go('announcements')}><Icon name="announce" size={14} /> Post announcement</button>
          <button className="adm-btn" onClick={() => go('events', 'new')}><Icon name="event" size={14} /> New event</button>
          <button className="adm-btn" onClick={() => go('recordings', 'new')}><Icon name="recording" size={14} /> New recording</button>
          <button className="adm-btn" onClick={() => go('resources', 'new')}><Icon name="resource" size={14} /> New resource</button>
          <button className="adm-btn" onClick={() => go('links', 'new')}><Icon name="link" size={14} /> New link</button>
        </div>
      </div>

      <div className="adm-section">
        <div className="adm-label">On the site right now</div>
        <div className="adm-stats">
          {STATS.map(s => (
            <button key={s.key} className="adm-stat" onClick={() => go(s.view)}>
              <b>{counts ? counts[s.key] : '–'}</b>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
