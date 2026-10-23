import { toast } from '../components/Toaster'

// The form a referred person fills out (it's for them, not for the member).
export const REFERRAL_URL = 'https://form.jotform.com/262156045622048'
export const OPEN_REFER_EVENT = 'radpad:open-refer'

// A ready-to-send note so a member can paste it into a text or DM.
export const INVITE_MESSAGE = `Hey! I'm part of The Rad Pad, a referral-only community for people running video businesses, and I think you'd be a great fit. Here's the form to apply: ${REFERRAL_URL}`

// Older / stricter browsers (some Safari setups) refuse the modern clipboard
// call; fall back to selecting a hidden field and copying that.
function legacyCopy(text) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  document.body.appendChild(ta)
  ta.select()
  ta.setSelectionRange(0, text.length)
  let ok = false
  try { ok = document.execCommand('copy') } catch { ok = false }
  ta.remove()
  return ok
}

export function copyText(text, okMessage) {
  const done = () => toast(okMessage)
  const fail = () => toast('Could not copy. Long-press the link instead.', { type: 'error' })
  const fallback = () => (legacyCopy(text) ? done() : fail())
  try {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, fallback)
    else fallback()
  } catch { fallback() }
}

export const openReferPanel = () => window.dispatchEvent(new Event(OPEN_REFER_EVENT))
