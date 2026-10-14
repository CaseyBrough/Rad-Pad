import { useState, useEffect } from 'react'

// A number that counts up from 0 when it first appears. Respects reduced-motion.
export default function CountUp({ to, duration = 900 }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!to) { setValue(0); return }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setValue(to); return }
    let raf
    const start = performance.now()
    const tick = t => {
      const p = Math.min(1, (t - start) / duration)
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])
  return <>{value}</>
}
