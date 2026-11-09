import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SidePanel, Field } from './admin/ui'
import { CALL_TYPES } from '../lib/callTypes'
import { toast } from './Toaster'

// "Host this call" slide-over on the Calendar page. The member picks an open
// Tuesday or Thursday, says what the call is about, and sends it. It is saved as a request
// (pages/api/book-call.js) that Casey confirms in the admin; confirming puts it
// on the Calendar with the standing Zoom link.
//
// Props: dates = [{ key: '2026-11-10', label: 'Tuesday, November 10' }], initialDate,
//        callTime = '3:00pm EST · 90 min' (shown as the time), onClose, onBooked(dateKey)

export default function BookCallPanel({ dates, initialDate, callTime, onClose, onBooked }) {
  const [form, setForm] = useState({ date: initialDate || dates[0]?.key || '', name: '', title: '', type: 'Community Call', description: '', note: '' })
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // The signed-in member's email (shown, and sent as proof by their sign-in token).
  useEffect(() => {
    let live = true
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return
      const user = data?.session?.user
      setEmail(user?.email || '')
      const guess = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
      if (guess) setForm(f => (f.name ? f : { ...f, name: guess }))
    })
    return () => { live = false }
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const canSave = !!(form.date && form.name.trim() && form.title.trim())

  async function submit() {
    setError('')
    setSaving(true)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      const r = await fetch('/api/book-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ ...form }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setError(j.message || 'Something went wrong. Please try again.'); setSaving(false); return }
      toast('Request sent. Check your email for the details.')
      onBooked(form.date)
    } catch {
      setError('We couldn’t reach the server. Check your connection and try again.')
      setSaving(false)
    }
  }

  return (
    <SidePanel title="Host a call" onClose={onClose} onSubmit={submit} saving={saving} canSave={canSave} submitLabel="Send request">
      <p className="panel-note">Lead a session on a Tuesday or Thursday call. Pick a date and tell us what it’s about. We’ll confirm by email, then it goes on the Calendar for everyone.</p>
      {error && <div className="book-error" role="alert">{error}</div>}
      <div className="book-form">
        <Field spec={{ key: 'date', label: 'Date', type: 'select', options: dates.map(d => ({ value: d.key, label: d.label })), required: true }} form={form} onChange={set} />
        {callTime && <p className="book-time">{callTime}. Shown in your own time on the Calendar once it’s confirmed.</p>}
        <Field spec={{ key: 'name', label: 'Your name', placeholder: 'How you’d like to be introduced', required: true }} form={form} onChange={set} />
        <Field spec={{ key: 'title', label: 'What’s the call about?', placeholder: 'e.g. How I price video projects', required: true }} form={form} onChange={set} />
        <Field spec={{ key: 'type', label: 'Type of call', type: 'select', options: CALL_TYPES }} form={form} onChange={set} />
        <Field spec={{ key: 'description', label: 'Description', type: 'textarea', optional: true, placeholder: 'What will you cover? Members see this on the Calendar.' }} form={form} onChange={set} />
        <Field spec={{ key: 'note', label: 'Anything we should know?', type: 'textarea', optional: true, placeholder: 'A different time, a guest, special setup… only the team sees this.' }} form={form} onChange={set} />
        {email && <p className="book-time">Booking as {email}. Confirmation goes to this address.</p>}
      </div>
    </SidePanel>
  )
}
