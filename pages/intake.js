// Standalone, locked intake page — intentionally does NOT use <Layout />.
// It has no sidebar, no nav links, and no way to browse into the rest of
// the members hub. This is the only thing a prospective member reaches
// from a referral link.

export default function Intake() {
  return (
    <div
      style={{
        background: 'var(--bg)',
        minHeight: '100vh',
        padding: '56px 24px 100px',
        fontFamily: 'var(--font-body)',
        color: 'var(--text)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 760 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 56,
              color: 'var(--pink)',
              lineHeight: 1,
              marginBottom: 10,
              textShadow: '0 0 30px rgba(255,45,120,0.4), 0 0 60px rgba(255,45,120,0.15)',
            }}
          >
            The Rad Pad
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--cyan)',
              marginBottom: 18,
            }}
          >
            New Member Intake
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, maxWidth: 460, margin: '0 auto' }}>
            Welcome in — fill out the form below to get set up. This link doesn't give
            access to the community hub; once you're approved, you'll get a separate
            invite.
          </p>
        </div>

        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 4,
            overflow: 'hidden',
          }}
        >
          <iframe
            src="https://form.jotform.com/262156045622048"
            title="The Rad Pad — New Member Intake"
            style={{
              width: '100%',
              height: '1400px',
              border: 'none',
              borderRadius: 10,
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  )
}
