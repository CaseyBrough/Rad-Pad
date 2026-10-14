// YouTube helpers. Every recording in the hub is a YouTube link, which gets us
// real thumbnails and in-hub playback without any API key.

const ID_RE = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/

export function ytId(url) {
  if (!url) return null
  const m = String(url).match(ID_RE)
  return m ? m[1] : null
}

// mq = 320x180 (16:9, light - for grids), max = 1280x720 (for hero/poster).
export function ytThumb(id, size = 'mq') {
  return `https://i.ytimg.com/vi/${id}/${size === 'max' ? 'maxresdefault' : 'mqdefault'}.jpg`
}

// youtube-nocookie: no tracking cookies until the member presses play.
export function ytEmbed(id) {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
}

export function ytWatch(id) {
  return `https://www.youtube.com/watch?v=${id}`
}

// "2h 7m" / "1H 10M" / "49m" -> minutes, or null when it can't be read.
export function durationMinutes(str) {
  if (!str) return null
  const s = String(str).toLowerCase()
  const h = s.match(/(\d+(?:\.\d+)?)\s*h/)
  const m = s.match(/(\d+)\s*m/)
  if (!h && !m) return null
  return Math.round((h ? +h[1] * 60 : 0) + (m ? +m[1] : 0))
}

export function formatHours(totalMinutes) {
  const hours = totalMinutes / 60
  return hours >= 10 ? `${Math.round(hours)}` : hours.toFixed(1)
}
