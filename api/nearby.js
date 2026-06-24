// GET /api/nearby?lat=&lng=&radius=
//
// Pharmacies near a point, via OpenStreetMap Overpass (free, no API key). Used by
// the call assistant to build a prioritized to-call list — includes phone numbers
// (for tap-to-call) and opening hours when OSM has them. Proxied so the browser
// avoids CORS and we can cache.

const CACHE_MS = 10 * 60 * 1000
const cache = new Map()

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function distanceMiles(aLat, aLng, bLat, bLng) {
  const R = 3958.8
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function toPharmacy(el, lat, lng) {
  const t = el.tags || {}
  const elat = el.lat ?? el.center?.lat
  const elng = el.lon ?? el.center?.lon
  if (elat == null || elng == null || !t.name) return null
  const address = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')
  return {
    name: t.name,
    address,
    city: t['addr:city'] || '',
    state: (t['addr:state'] || '').toUpperCase().slice(0, 2),
    zip: t['addr:postcode'] || '',
    phone: t.phone || t['contact:phone'] || null,
    hours: t.opening_hours || null,
    lat: elat,
    lng: elng,
    distance: distanceMiles(lat, lng, elat, elng),
  }
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const lat = parseFloat(req.query.lat)
  const lng = parseFloat(req.query.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng are required' })
  }
  const radius = Math.min(Math.max(parseInt(req.query.radius, 10) || 4000, 500), 20000)
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${radius}`

  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return res.status(200).json({ pharmacies: hit.pharmacies, cached: true })
  }

  try {
    const q =
      `[out:json][timeout:25];(` +
      `node["amenity"="pharmacy"](around:${radius},${lat},${lng});` +
      `way["amenity"="pharmacy"](around:${radius},${lat},${lng});` +
      `);out center 60;`

    // The public Overpass instances 504/429 intermittently — try mirrors in turn.
    const ENDPOINTS = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.private.coffee/api/interpreter',
    ]
    let data = null
    let lastStatus = 0
    for (const url of ENDPOINTS) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'FillFinder/0.1 (pharmacy availability app)',
          },
          body: 'data=' + encodeURIComponent(q),
        })
        if (r.ok) {
          data = await r.json()
          break
        }
        lastStatus = r.status
      } catch {
        lastStatus = 0
      }
    }
    if (!data) {
      return res.status(502).json({ error: `Overpass unavailable (${lastStatus})`, pharmacies: [] })
    }
    const seen = new Set()
    const pharmacies = (data.elements || [])
      .map((el) => toPharmacy(el, lat, lng))
      .filter(Boolean)
      .filter((p) => {
        const k = `${p.name}|${p.lat.toFixed(4)}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 24)

    cache.set(key, { at: Date.now(), pharmacies })
    return res.status(200).json({ pharmacies })
  } catch (err) {
    console.error('[nearby] error', err)
    return res.status(502).json({ error: 'Could not reach Overpass', pharmacies: [] })
  }
}
