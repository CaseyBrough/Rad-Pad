import { useId } from 'react'

const PATHS = {
  overview: <><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></>,
  approvals: <><path d="M3 8.5l3 3 7-7" /></>,
  announce: <><path d="M2 6.5v3l9 4V2.5l-9 4zM11 6a2 2 0 010 4M4 10v3.5" /></>,
  recording: <><circle cx="8" cy="8" r="6" /><path d="M6.5 5.5l4 2.5-4 2.5V5.5z" /></>,
  resource: <><rect x="2.5" y="2" width="11" height="12" rx="1.5" /><path d="M5 6h6M5 9h6M5 12h3" /></>,
  event: <><rect x="2" y="3" width="12" height="11" rx="1.5" /><path d="M5 2v2M11 2v2M2 7h12" /></>,
  link: <><path d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5L7 4M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5L9 12" /></>,
  member: <><circle cx="8" cy="6" r="3" /><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" /></>,
  pin: <><path d="M8 14s5-4.5 5-8.5A5 5 0 003 5.5C3 9.5 8 14 8 14z" /><circle cx="8" cy="5.5" r="1.6" /></>,
  key: <><circle cx="5.5" cy="10.5" r="3" /><path d="M8 8.5L14 2.5M11.5 5l2 2" /></>,
  search: <><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></>,
  close: <><path d="M3 3l10 10M13 3L3 13" /></>,
  menu: <><path d="M2 4h12M2 8h12M2 12h12" /></>,
  plus: <><path d="M8 3v10M3 8h10" /></>,
}

export function Icon({ name, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}

export function PageHeader({ title, sub, children }) {
  return (
    <div className="adm-head">
      <div>
        <h1 className="adm-title">{title}</h1>
        {sub && <p className="adm-sub">{sub}</p>}
      </div>
      {children && <div className="adm-head-actions">{children}</div>}
    </div>
  )
}

export function EmptyState({ title, children }) {
  return (
    <div className="adm-empty">
      <strong>{title}</strong>
      {children && <span>{children}</span>}
    </div>
  )
}

export function Loading() {
  return <div className="adm-loading">Loading…</div>
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="adm-search">
      <Icon name="search" size={15} />
      <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  )
}

// Case-insensitive match across whichever fields matter for that list.
export function matches(query, ...fields) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return fields.filter(Boolean).join(' ').toLowerCase().includes(q)
}

// One form field, driven by a small spec so every tab's form is described as
// data instead of hand-written markup.
export function Field({ spec, form, onChange }) {
  const id = useId()
  const { key, label, type = 'text', options, blankOption, optional, required, full } = spec
  const placeholder = typeof spec.placeholder === 'function' ? spec.placeholder(form) : spec.placeholder
  const value = form[key] ?? ''
  const set = e => onChange(key, e.target.value)

  let control
  if (type === 'textarea') {
    control = <textarea id={id} className="form-textarea" value={value} onChange={set} placeholder={placeholder} />
  } else if (type === 'select') {
    control = (
      <select id={id} className="form-select" value={value} onChange={set}>
        {blankOption && <option value="">{blankOption}</option>}
        {options.map(o => (typeof o === 'string' ? <option key={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    )
  } else {
    control = <input id={id} className="form-input" type={type} value={value} onChange={set} placeholder={placeholder} />
  }

  return (
    <div className={`form-group${full ? ' full' : ''}`}>
      <label className="form-label" htmlFor={id}>
        {label}{required && ' *'}{optional && <span className="adm-opt"> (optional)</span>}
      </label>
      {control}
    </div>
  )
}

// The slide-over panel is shared with the member pages.
export { default as SidePanel } from '../SidePanel'
