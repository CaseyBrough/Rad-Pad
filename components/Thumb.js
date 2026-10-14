import { ytId, ytThumb } from '../lib/youtube'

// A video thumbnail with a play button and duration; falls back to a branded
// gradient if the image can't load. `children` render on top (e.g. a New chip).
export default function Thumb({ rec, size = 'mq', children }) {
  const id = ytId(rec.video_url)
  return (
    <div className="thumb">
      {id && <img src={ytThumb(id, size)} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none' }} />}
      <span className="thumb-play" aria-hidden="true"><span className="play-triangle" /></span>
      {rec.duration && <span className="thumb-dur">{rec.duration}</span>}
      {children}
    </div>
  )
}
