import { useState } from 'react'
import Head from 'next/head'

// Public page (not behind the member sign-in): the form a referred person fills
// out to apply. Not linked from anywhere in the hub; members share the URL.
// Answers go to /api/new-member-intake and are reviewed in the admin panel.

const YEARS = ['Under 1', '1-2', '2-5', '5+']
const REVENUE = ['Under $50K', '$50-100K', '$100-250K', '$250K+', 'Prefer not to say']

const EMPTY = {
  first_name: '', last_name: '', email: '', business_name: '', website: '', location: '', referred_by: '',
  years_in_business: '', annual_revenue: '', best_project_link: '',
  about_business: '', going_well_challenge: '', hoping_to_get: '', strengths: '', anything_else: '',
  company_url: '',
}

export default function NewMemberIntake() {
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState('idle') // idle | sending | done
  const [error, setError] = useState('')
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))
  const pick = (key, value) => setForm(f => ({ ...f, [key]: value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.years_in_business || !form.annual_revenue) {
      setError('Please choose your years in business and annual revenue.')
      return
    }
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/new-member-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('idle')
        setError(res.status === 429 ? 'That’s a lot of submissions from one place. Please try again in a bit.' : data.message || 'Something went wrong. Please try again.')
        return
      }
      setStatus('done')
      window.scrollTo({ top: 0 })
    } catch {
      setStatus('idle')
      setError('We couldn’t reach the server. Check your connection and try again.')
    }
  }

  const text = (key, label, opts = {}) => (
    <div className="f-group">
      <label className="form-label" htmlFor={key}>{label}{opts.optional ? <span className="opt"> (optional)</span> : ' *'}</label>
      <input id={key} className="form-input" type={opts.type || 'text'} value={form[key]} onChange={set(key)}
        required={!opts.optional} autoComplete={opts.autoComplete} placeholder={opts.placeholder} maxLength={opts.max || 200} />
    </div>
  )

  const area = (key, label, optional) => (
    <div className="f-group">
      <label className="form-label" htmlFor={key}>{label}{optional ? <span className="opt"> (optional)</span> : ' *'}</label>
      <textarea id={key} className="form-textarea" rows={5} value={form[key]} onChange={set(key)} required={!optional} maxLength={5000} />
    </div>
  )

  const choices = (key, label, options) => (
    <fieldset className="f-group">
      <legend className="form-label">{label} *</legend>
      <div className="chips">
        {options.map((o, i) => (
          <label key={o} className={`chip${form[key] === o ? ' on' : ''}`}>
            <input type="radio" name={key} value={o} checked={form[key] === o} onChange={() => pick(key, o)} required={i === 0} />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  )

  return (
    <div className="wrap">
      <Head>
        <title>New Member Intake · The Rad Pad</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="brand">
        <div className="logo">The Rad Pad</div>
        <div className="tag">New Member Intake</div>
      </div>

      <div className="card">
        {status === 'done' ? (
          <div className="done">
            <div className="check">✓</div>
            <h1>Thanks, you’re in the queue</h1>
            <p>We’ve got your application and will review it soon. If it’s a fit, you’ll hear from us at <b>{form.email}</b>.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate={false}>
            <h1>Join The Rad Pad</h1>
            <p className="lede">Share your details and what you’re building so we can learn where you fit in.</p>

            <div className="row2">
              {text('first_name', 'First name', { autoComplete: 'given-name', max: 100 })}
              {text('last_name', 'Last name', { autoComplete: 'family-name', max: 100 })}
            </div>
            {text('email', 'Email address', { type: 'email', autoComplete: 'email', placeholder: 'you@email.com' })}
            {text('business_name', 'Business name', { autoComplete: 'organization' })}
            {text('website', 'Website / portfolio link', { max: 500, autoComplete: 'url' })}
            {text('location', 'Location (city, country)', { autoComplete: 'address-level2' })}
            {text('referred_by', 'Referred by (Rad Pad member name)')}
            {choices('years_in_business', 'Years in business', YEARS)}
            {choices('annual_revenue', 'Annual revenue', REVENUE)}
            {text('best_project_link', 'Link to best or largest recent project', { optional: true, max: 500 })}
            {area('about_business', 'Tell us about your business: what you do, who you serve, how you got here')}
            {area('going_well_challenge', 'What’s going well right now, and what’s a challenge you’re working through')}
            {area('hoping_to_get', 'What are you hoping to get out of the community')}
            {area('strengths', 'What are you especially strong at that you’d bring to the group')}
            {area('anything_else', 'Anything else we should know', true)}

            {/* Trap for bots: invisible to people. */}
            <div className="trap" aria-hidden="true">
              <label>Leave this empty<input type="text" tabIndex={-1} autoComplete="off" value={form.company_url} onChange={set('company_url')} /></label>
            </div>

            {error && <div className="err" role="alert">{error}</div>}
            <button className="submit-btn" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Submit'}</button>
          </form>
        )}
      </div>

      <style jsx global>{`
        .wrap { min-height: 100vh; background: var(--bg); padding: 40px 16px 64px; }
        .wrap .brand { text-align: center; margin-bottom: 28px; }
        .wrap .logo { font-family: var(--font-display); font-size: 48px; color: var(--pink); text-shadow: 0 0 44px rgba(255,45,120,0.8); margin-bottom: 6px; }
        .wrap .tag { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); }
        .wrap .card { max-width: 640px; margin: 0 auto; background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 34px 30px; }
        .wrap h1 { font-family: var(--font-head); font-weight: 400; font-size: 34px; letter-spacing: 0.04em; margin: 0 0 8px; }
        .wrap .lede { color: var(--muted); font-size: 14px; line-height: 1.6; margin: 0 0 26px; }
        .wrap .f-group { display: flex; flex-direction: column; gap: 6px; margin: 0 0 20px; border: 0; padding: 0; min-width: 0; }
        .wrap .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .wrap .opt { text-transform: none; letter-spacing: 0; opacity: 0.7; }
        .wrap .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .wrap .chip { position: relative; display: inline-flex; align-items: center; padding: 10px 16px; border-radius: 999px; border: 1px solid rgba(240,235,248,0.18); font-size: 14px; color: var(--muted); cursor: pointer; transition: border-color .15s, color .15s, background .15s; }
        .wrap .chip:hover { border-color: var(--border-hover-cyan); color: var(--text); }
        .wrap .chip.on { border-color: var(--cyan); color: var(--cyan); background: rgba(0,245,228,0.08); }
        .wrap .chip input { position: absolute; opacity: 0; width: 1px; height: 1px; }
        .wrap .chip:focus-within { outline: 2px solid var(--cyan); outline-offset: 2px; }
        .wrap .trap { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
        .wrap .err { margin: 0 0 14px; padding: 10px 12px; border-radius: 8px; background: rgba(255,45,120,0.08); border: 1px solid rgba(255,45,120,0.3); font-size: 13px; color: var(--text); }
        .wrap .done { text-align: center; padding: 20px 0; }
        .wrap .done p { color: var(--muted); font-size: 15px; line-height: 1.65; max-width: 440px; margin: 0 auto; }
        .wrap .done b { color: var(--text); font-weight: 500; word-break: break-all; }
        .wrap .check { width: 56px; height: 56px; margin: 0 auto 16px; border-radius: 50%; border: 1px solid var(--cyan); color: var(--cyan); display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 0 30px rgba(0,245,228,0.3); }
        @media (max-width: 560px) {
          .wrap .card { padding: 26px 18px; }
          .wrap .row2 { grid-template-columns: 1fr; gap: 0; }
          .wrap .logo { font-size: 40px; }
        }
      `}</style>
    </div>
  )
}
