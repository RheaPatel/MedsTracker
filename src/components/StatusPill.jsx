import { statusMeta } from '../lib/meds.js'

const ICON = {
  in_stock: '✓',
  limited: '◐',
  expecting: '🚚',
  out: '✕',
  wouldnt_say: '?',
}

export default function StatusPill({ status }) {
  const m = statusMeta(status)
  return (
    <span className={`pill tone-${m.tone}`}>
      <span aria-hidden>{ICON[status] || '•'}</span>
      {m.label}
    </span>
  )
}
