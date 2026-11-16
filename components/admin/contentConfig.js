// Describes the four "content" tabs (Recordings, Resources, Events, Links) as
// data: table, form fields, default values, and how a row is summarised.
// ContentSection renders all four from this - adding a field is one line here.

import { CALL_TYPES, SUB_TOPIC_PLACEHOLDER, callTypeDot } from '../../lib/callTypes'
import { ytId, ytThumb } from '../../lib/youtube'
import { hasDate, isNotice } from '../../lib/calendar'
import { fmtDay, todayKey } from './dates'
import { LinkLogo } from './Grid'
import { Icon } from './ui'

const RES_CATS = ['Templates', 'Guides', 'Scripts', 'Finance']
const FILE_TYPES = ['PDF', 'Notion', 'Google Sheets', 'Google Doc', 'Link']
const LINK_CATS = ['Software', 'Gear', 'Finance', 'Education']

const dot = (...parts) => parts.filter(Boolean).join(' · ')

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

const blank = v => !String(v || '').trim()

// "View on site" link at the top of an edit panel (only for saved rows).
function SiteLink({ href, label = 'View on site' }) {
  return (
    <a className="adm-site-link" href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a>
  )
}

function RecordingTop(form, id) {
  const yid = ytId(form.video_url)
  return (
    <div className="adm-panel-top">
      {yid ? (
        <a className="adm-panel-thumb" href={`https://www.youtube.com/watch?v=${yid}`} target="_blank" rel="noopener noreferrer" title="Open on YouTube">
          <img src={ytThumb(yid)} alt="" />
        </a>
      ) : (
        <div className="adm-panel-thumb ph">{form.video_url ? 'Not a YouTube link' : 'Paste a YouTube link below to see the thumbnail'}</div>
      )}
      {id && <SiteLink href={`/recordings?v=${id}`} />}
    </div>
  )
}

const byAdded = { id: 'added', label: 'Recently added' }
const byAZ = { id: 'az', label: 'A–Z' }

export const CONTENT = {
  recording: {
    label: 'Recording', plural: 'Recordings', table: 'recordings', orderCol: 'created_at',
    sub: 'Call recordings members can watch on the Recordings page.',
    blank: { title: '', description: '', date: '', duration: '', host: '', video_url: '', call_type: '', sub_topic: '' },
    required: ['title'],
    sorts: [byAdded, { id: 'date', label: 'By date', key: 'date', dir: -1 }, byAZ],
    searchText: i => [i.title, i.host, i.call_type, i.sub_topic],
    row: i => {
      const yid = ytId(i.video_url)
      return {
        thumb: yid ? ytThumb(yid) : null,
        title: i.title || '(untitled)',
        meta: dot(fmtDay(i.date), i.duration, i.call_type && (i.sub_topic ? `${i.call_type} · ${i.sub_topic}` : i.call_type), i.host && `Host: ${i.host}`),
        chip: !yid ? { text: i.video_url ? 'Not YouTube' : 'No video', tone: 'pink' } : null,
      }
    },
    panelTop: RecordingTop,
    fields: [
      { key: 'title', label: 'Title', required: true, placeholder: 'Q2 Sales Sprint…', full: true },
      { key: 'host', label: 'Host', placeholder: 'Casey' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'duration', label: 'Duration', placeholder: '58m' },
      { key: 'call_type', label: 'Call type', type: 'select', options: CALL_TYPES, blankOption: 'Select type…' },
      { key: 'sub_topic', label: 'Sub-topic', optional: true, full: true, showIf: f => !!SUB_TOPIC_PLACEHOLDER[f.call_type], placeholder: f => SUB_TOPIC_PLACEHOLDER[f.call_type] },
      { key: 'video_url', label: 'Video URL', placeholder: 'https://…', full: true },
      { key: 'description', label: 'Description', type: 'textarea', full: true },
    ],
  },

  resource: {
    label: 'Resource', plural: 'Resources', table: 'resources', orderCol: 'created_at',
    sub: 'Templates, guides and files in the Resources library.',
    blank: { title: '', description: '', category: 'Templates', file_url: '', file_type: 'PDF' },
    required: ['title'],
    sorts: [byAdded, byAZ],
    searchText: i => [i.title, i.category, i.file_type],
    row: i => ({ title: i.title || '(untitled)', meta: dot(i.category, i.file_type) }),
    layout: 'grid',
    filterKey: 'category',
    tile: i => ({
      media: <span className="adm-doc"><Icon name="resource" size={18} /><small>{i.file_type || 'File'}</small></span>,
      title: i.title || '(untitled)',
      meta: i.category,
      desc: i.description,
      chips: [!String(i.file_url || '').trim() && { text: 'No file link', tone: 'pink' }],
    }),
    panelTop: (form, id) => id ? <div className="adm-panel-top slim"><SiteLink href="/resources" /></div> : null,
    fields: [
      { key: 'title', label: 'Title', required: true, placeholder: 'Discovery Call Script', full: true },
      { key: 'category', label: 'Category', type: 'select', options: RES_CATS },
      { key: 'file_type', label: 'File type', type: 'select', options: FILE_TYPES },
      { key: 'file_url', label: 'File / link URL', placeholder: 'https://…', full: true },
      { key: 'description', label: 'Description', type: 'textarea', full: true },
    ],
  },

  event: {
    label: 'Event', plural: 'Events', table: 'events', orderCol: 'event_date',
    sub: 'Upcoming and past calls on the Calendar page. Members click the Zoom link to join.',
    blank: { title: '', description: '', event_date: '', time: '', duration: '', type: 'Community Call', platform: 'Zoom', zoom_url: '' },
    required: ['title'],
    sorts: [{ id: 'date', label: 'By date', key: 'event_date', dir: -1, grouped: true }, byAdded, byAZ],
    // Grouped view: soonest upcoming first, then undated drafts, then past (folded away).
    groupOf: i => (!hasDate(i) ? 'tba' : i.event_date >= todayKey() ? 'upcoming' : 'past'),
    groups: [
      { id: 'upcoming', label: 'Coming up', order: (a, b) => a.event_date.localeCompare(b.event_date) },
      { id: 'tba', label: 'Date to be announced', hot: true },
      { id: 'past', label: 'Past', collapsed: true },
    ],
    searchText: i => [i.title, i.type, i.platform],
    row: i => {
      const notice = isNotice(i)
      const upcoming = hasDate(i) && i.event_date >= todayKey()
      const needsTime = upcoming && !notice && blank(i.time)
      const needsZoom = upcoming && !notice && blank(i.zoom_url)
      return {
        dot: notice ? 'none' : (callTypeDot(i.type) || 'cyan'),
        dim: notice,
        title: i.title || '(untitled)',
        meta: (
          <>
            {hasDate(i) ? fmtDay(i.event_date) : 'No date'}
            {' · '}
            {needsTime ? <span className="adm-warn-text">No time set</span> : (i.time || 'All day')}
            {!notice && i.type ? ` · ${i.type}` : ''}
          </>
        ),
        chip: notice ? { text: 'No call' } : needsZoom ? { text: 'No Zoom link', tone: 'pink' } : null,
      }
    },
    panelTop: (form, id) => id ? <div className="adm-panel-top slim"><SiteLink href="/calendar" label="View on calendar" /></div> : null,
    fields: [
      { key: 'title', label: 'Title', required: true, placeholder: 'Weekly Group Call', full: true },
      { key: 'type', label: 'Type', type: 'select', options: CALL_TYPES },
      { key: 'platform', label: 'Platform', placeholder: 'Zoom' },
      { key: 'event_date', label: 'Date', type: 'date' },
      { key: 'time', label: 'Time', placeholder: '12:00 PM EST' },
      { key: 'duration', label: 'Duration', placeholder: '90 min' },
      { key: 'zoom_url', label: 'Zoom link (members click to join)', placeholder: 'https://zoom.us/j/…', full: true },
      { key: 'description', label: 'Description', type: 'textarea', full: true },
    ],
  },

  link: {
    label: 'Link', plural: 'Links', table: 'links', orderCol: 'created_at',
    sub: 'Tools and resources on the Links page. Member suggestions wait in Approvals first.',
    blank: { name: '', description: '', url: '', category: 'Software', emoji: '', perk_code: '', perk_note: '' },
    required: ['name', 'url'],
    // Links added here go live immediately - the approval step only applies to
    // member-submitted suggestions from /links.
    createExtras: { approved: true },
    listFilter: i => i.approved,
    sorts: [byAdded, byAZ],
    labelKey: 'name',
    searchText: i => [i.name, i.category, i.url, i.description],
    row: i => ({ icon: i.emoji || '🔗', title: i.name || '(untitled)', meta: dot(i.category, hostOf(i.url), i.perk_code && `🎟 ${i.perk_code}`) }),
    layout: 'grid',
    filterKey: 'category',
    tile: i => ({
      media: <LinkLogo url={i.url} emoji={i.emoji} />,
      title: i.name || '(untitled)',
      meta: hostOf(i.url),
      desc: i.description,
      chips: [i.category && { text: i.category }, i.perk_code && { text: `🎟 ${i.perk_code}`, tone: 'amber' }],
    }),
    panelTop: (form, id) => id ? <div className="adm-panel-top slim"><SiteLink href="/links" />{form.url && <SiteLink href={form.url} label="Open link" />}</div> : null,
    fields: [
      { key: 'name', label: 'Name', required: true, placeholder: 'HoneyBook' },
      { key: 'emoji', label: 'Emoji', placeholder: '📋' },
      { key: 'url', label: 'URL', required: true, placeholder: 'https://…', full: true },
      { key: 'category', label: 'Category', type: 'select', options: LINK_CATS, full: true },
      { key: 'description', label: 'Description', type: 'textarea', full: true },
      { key: 'perk_code', label: 'Discount code', optional: true, placeholder: 'e.g. RADPAD50' },
      { key: 'perk_note', label: 'What the discount gets you', optional: true, placeholder: 'e.g. 50% off a Pro account' },
    ],
  },
}
