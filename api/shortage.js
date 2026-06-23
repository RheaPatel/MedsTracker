// GET /api/shortage?generic=lisdexamfetamine
//
// Proxies the openFDA drug-shortages dataset (the one genuinely public, programmable
// source) and collapses it into a compact per-presentation summary plus an overall
// verdict. Cached in-memory for an hour so we are gentle on the public API.

const CACHE_MS = 60 * 60 * 1000
const cache = new Map() // generic -> { at, payload }

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const generic = String((req.query && req.query.generic) || '').trim()
  if (!generic) return res.status(400).json({ error: 'generic is required' })

  const key = generic.toLowerCase()
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return res.status(200).json({ ...hit.payload, cached: true })
  }

  try {
    const url =
      `https://api.fda.gov/drug/shortages.json?search=generic_name:"${encodeURIComponent(generic)}"&limit=100`
    const r = await fetch(url)

    // openFDA returns 404 when the search matches nothing — that's "no shortage on file".
    if (r.status === 404) {
      const payload = { generic, overall: 'none', items: [], updatedAt: null }
      cache.set(key, { at: Date.now(), payload })
      return res.status(200).json(payload)
    }
    if (!r.ok) return res.status(502).json({ error: `openFDA returned ${r.status}` })

    const data = await r.json()
    const results = Array.isArray(data.results) ? data.results : []

    const items = results.map((x) => ({
      company: x.company_name || (x.openfda?.manufacturer_name || [])[0] || null,
      genericName: x.generic_name || null,
      dosageForm: x.dosage_form || null,
      presentation: x.presentation || null,
      status: x.status || null, // "Current" (in shortage) | "Resolved"
      availability: x.availability || null,
      updateDate: x.update_date || null,
    }))

    const anyCurrent = items.some((i) => (i.status || '').toLowerCase() === 'current')
    const overall = items.length === 0 ? 'none' : anyCurrent ? 'shortage' : 'resolved'
    const updatedAt =
      items.map((i) => i.updateDate).filter(Boolean).sort().slice(-1)[0] || null

    const payload = { generic, overall, items, updatedAt }
    cache.set(key, { at: Date.now(), payload })
    return res.status(200).json(payload)
  } catch (err) {
    console.error('[shortage] error', err)
    return res.status(502).json({ error: 'Could not reach openFDA' })
  }
}
