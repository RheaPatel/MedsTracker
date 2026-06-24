// Thin wrapper over the community API (served at /api, proxied to the dev server).

async function json(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export async function fetchReports(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== '')
  ).toString()
  const res = await fetch(`/api/reports${qs ? `?${qs}` : ''}`)
  const { reports } = await json(res)
  return reports || []
}

export async function submitReport(report) {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  })
  const { report: created } = await json(res)
  return created
}

export async function fetchShortage(generic) {
  const res = await fetch(`/api/shortage?generic=${encodeURIComponent(generic)}`)
  return json(res)
}

export async function fetchPlaces({ q, lat, lng, kind = 'pharmacy' }) {
  if (!q || q.trim().length < 2) return []
  const params = new URLSearchParams({ q: q.trim(), kind })
  if (lat != null && lng != null) {
    params.set('lat', lat)
    params.set('lng', lng)
  }
  const res = await fetch(`/api/places?${params.toString()}`)
  const { places } = await json(res)
  return places || []
}

export async function fetchNearby({ lat, lng, radius }) {
  if (lat == null || lng == null) return []
  const params = new URLSearchParams({ lat, lng })
  if (radius) params.set('radius', radius)
  const res = await fetch(`/api/nearby?${params.toString()}`)
  const { pharmacies } = await json(res)
  return pharmacies || []
}
