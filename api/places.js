// GET /api/places?q=<text>&lat=&lng=&kind=pharmacy|address
//
// Autocomplete for pharmacies (and addresses) backed by OpenStreetMap via the
// public Photon geocoder. Free, no API key. We proxy it so the browser never
// hits CORS, and so we can bias by the user's location and normalize the shape.

const CACHE_MS = 5 * 60 * 1000
const cache = new Map()

// Photon returns 2-letter state for US results, but fall back just in case.
const STATE_ABBR = {
  alabama:'AL',alaska:'AK',arizona:'AZ',arkansas:'AR',california:'CA',colorado:'CO',
  connecticut:'CT',delaware:'DE','district of columbia':'DC',florida:'FL',georgia:'GA',
  hawaii:'HI',idaho:'ID',illinois:'IL',indiana:'IN',iowa:'IA',kansas:'KS',kentucky:'KY',
  louisiana:'LA',maine:'ME',maryland:'MD',massachusetts:'MA',michigan:'MI',minnesota:'MN',
  mississippi:'MS',missouri:'MO',montana:'MT',nebraska:'NE',nevada:'NV','new hampshire':'NH',
  'new jersey':'NJ','new mexico':'NM','new york':'NY','north carolina':'NC','north dakota':'ND',
  ohio:'OH',oklahoma:'OK',oregon:'OR',pennsylvania:'PA','rhode island':'RI','south carolina':'SC',
  'south dakota':'SD',tennessee:'TN',texas:'TX',utah:'UT',vermont:'VT',virginia:'VA',
  washington:'WA','west virginia':'WV',wisconsin:'WI',wyoming:'WY',
}

function abbr(state) {
  if (!state) return ''
  if (state.length === 2) return state.toUpperCase()
  return STATE_ABBR[state.toLowerCase()] || ''
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function toPlace(f) {
  const p = f.properties || {}
  const c = (f.geometry && f.geometry.coordinates) || []
  const address = [p.housenumber, p.street].filter(Boolean).join(' ')
  const city = p.city || p.district || p.locality || p.county || ''
  const state = abbr(p.state)
  return {
    name: p.name || p.street || 'Unknown',
    address,
    city,
    state,
    zip: p.postcode || '',
    lat: c[1] ?? null,
    lng: c[0] ?? null,
    label: [p.name || address, [city, state].filter(Boolean).join(', ')]
      .filter(Boolean)
      .join(' · '),
  }
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const q = String((req.query && req.query.q) || '').trim()
  if (q.length < 2) return res.status(200).json({ places: [] })

  const lat = parseFloat(req.query.lat)
  const lng = parseFloat(req.query.lng)
  const kind = req.query.kind === 'address' ? 'address' : 'pharmacy'
  const key = `${kind}|${q.toLowerCase()}|${Number.isFinite(lat) ? lat.toFixed(2) : ''}|${Number.isFinite(lng) ? lng.toFixed(2) : ''}`

  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return res.status(200).json({ places: hit.places, cached: true })

  try {
    const params = new URLSearchParams({ q, limit: '6', lang: 'en' })
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      params.set('lat', String(lat))
      params.set('lon', String(lng))
    }
    if (kind === 'pharmacy') params.set('osm_tag', 'amenity:pharmacy')

    const r = await fetch(`https://photon.komoot.io/api?${params.toString()}`, {
      headers: { 'User-Agent': 'FillFinder/0.1 (pharmacy availability app)' },
    })
    if (!r.ok) return res.status(502).json({ error: `geocoder returned ${r.status}`, places: [] })

    const data = await r.json()
    const places = (data.features || [])
      .map(toPlace)
      .filter((p) => p.lat != null && p.lng != null)
      // US-focused app; drop anything we couldn't resolve to a US state
      .filter((p) => p.state)

    cache.set(key, { at: Date.now(), places })
    return res.status(200).json({ places })
  } catch (err) {
    console.error('[places] error', err)
    return res.status(502).json({ error: 'Could not reach geocoder', places: [] })
  }
}
