// Small date/time helpers. (Browser code — Date.now()/new Date() are fine here.)

export function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// Whole days from today until the given ISO date (negative = in the past).
export function daysUntil(isoDate) {
  if (!isoDate) return null
  const target = new Date(isoDate + 'T00:00:00')
  const now = new Date(todayISODate() + 'T00:00:00')
  return Math.round((target - now) / 86400000)
}

export function formatDate(iso) {
  if (!iso) return ''
  const d = iso.length === 10 ? new Date(iso + 'T00:00:00') : new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function relativeTime(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatDate(iso)
}

// openFDA gives MM/DD/YYYY — make it readable.
export function formatFdaDate(s) {
  if (!s) return ''
  const [m, d, y] = s.split('/')
  if (!y) return s
  return new Date(`${y}-${m}-${d}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
