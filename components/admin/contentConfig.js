// Describes the four "content" tabs (Recordings, Resources, Events, Links) as
// data: table, form fields, default values, and how a row is summarised.
// ContentSection renders all four from this - adding a field is one line here.

import { CALL_TYPES, SUB_TOPIC_PLACEHOLDER } from '../../lib/callTypes'

const RES_CATS = ['Templates', 'Guides', 'Scripts', 'Finance']
const FILE_TYPES = ['PDF', 'Notion', 'Google Sheets', 'Google Doc', 'Link']
const LINK_CATS = ['Software', 'Gear', 'Finance', 'Education']

const dot = (...parts) => parts.filter(Boolean).join(' · ')

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

// YYYY-MM-DD in local time, comparable as a string with the events.event_date column.
function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
    row: i => ({
      title: i.title || '(untitled)',
      meta: dot(i.date, i.duration, i.call_type && (i.sub_topic ? `${i.call_type} · ${i.sub_topic}` : i.call_type), i.host && `Host: ${i.host}`),
    }),
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
    sorts: [{ id: 'date', label: 'By date', key: 'event_date', dir: -1 }, byAdded, byAZ],
    searchText: i => [i.title, i.type, i.platform],
    row: i => ({
      title: i.title || '(untitled)',
      meta: dot(i.event_date, i.time, i.type),
      chip: i.event_date ? (i.event_date >= today() ? { text: 'Upcoming', tone: 'cyan' } : { text: 'Past' }) : null,
    }),
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
    blank: { name: '', description: '', url: '', category: 'Software', emoji: '' },
    required: ['name', 'url'],
    // Links added here go live immediately - the approval step only applies to
    // member-submitted suggestions from /links.
    createExtras: { approved: true },
    listFilter: i => i.approved,
    sorts: [byAdded, byAZ],
    labelKey: 'name',
    searchText: i => [i.name, i.category, i.url, i.description],
    row: i => ({ icon: i.emoji || '🔗', title: i.name || '(untitled)', meta: dot(i.category, hostOf(i.url)) }),
    fields: [
      { key: 'name', label: 'Name', required: true, placeholder: 'HoneyBook' },
      { key: 'emoji', label: 'Emoji', placeholder: '📋' },
      { key: 'url', label: 'URL', required: true, placeholder: 'https://…', full: true },
      { key: 'category', label: 'Category', type: 'select', options: LINK_CATS, full: true },
      { key: 'description', label: 'Description', type: 'textarea', full: true },
    ],
  },
}
