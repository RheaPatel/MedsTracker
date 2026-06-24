import { statusMeta } from '../lib/meds.js'

// Editorial style: status is an italic serif word in the status color, not a chip.
const CLS = {
  in_stock: 's-in',
  limited: 's-expect',
  expecting: 's-expect',
  out: 's-out',
  wouldnt_say: 's-muted',
}

export default function StatusPill({ status }) {
  const m = statusMeta(status)
  return <span className={`status ${CLS[status] || 's-muted'}`}>{m.label}</span>
}
