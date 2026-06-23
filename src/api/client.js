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
