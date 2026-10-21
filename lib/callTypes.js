// The kinds of call, in one place: the admin's type dropdown, the Recordings
// filter, and the colour each type wears across the hub. Types are stored as
// plain text on recordings.call_type and events.type, so adding one needs no
// database change.

export const CALL_TYPES = ['Community Call', 'Skills Call', 'Theme Call', 'Guest Speaker']

// Shown as a Recordings filter only once at least one recording uses it.
export const OPTIONAL_CALL_TYPES = new Set(['Guest Speaker'])

// Types that take a sub-topic in the admin (e.g. "DaVinci Resolve", or the speaker's name).
export const SUB_TOPIC_PLACEHOLDER = {
  'Skills Call': 'e.g. DaVinci Resolve',
  'Theme Call': 'e.g. Pricing',
  'Guest Speaker': 'e.g. Jane Smith, Acme Studio',
}

const TAG = { 'Community Call': 'tag-cyan', 'Skills Call': 'tag-amber', 'Theme Call': 'tag-purple', 'Guest Speaker': 'tag-pink' }
const DOT = { 'Community Call': 'cyan', 'Skills Call': 'amber', 'Theme Call': 'purple', 'Guest Speaker': 'pink' }

export const callTypeTag = (type, fallback = 'tag-cyan') => TAG[type] || fallback
export const callTypeDot = type => DOT[type] || null
