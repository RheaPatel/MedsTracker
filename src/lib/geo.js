// Geolocation + distance helpers.

// Ask the browser for the user's location. Resolves {lat, lng} or rejects with
// a friendly message. The browser shows its own permission prompt.
export function getMyLocation() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location isn’t available in this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied.'
            : 'Couldn’t get your location.'
        reject(new Error(msg))
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    )
  })
}

// Great-circle distance in miles between two {lat,lng} points.
export function distanceMiles(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null
  const R = 3958.8
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatDistance(mi) {
  if (mi == null) return ''
  if (mi < 0.1) return 'here'
  if (mi < 10) return `${mi.toFixed(1)} mi`
  return `${Math.round(mi)} mi`
}

// Cache the last known location so the map/distances are instant on reload while
// we refresh in the background.
const COORDS_KEY = 'ff_coords'

export function getCachedCoords() {
  try {
    const c = JSON.parse(localStorage.getItem(COORDS_KEY))
    if (c && typeof c.lat === 'number' && typeof c.lng === 'number') return c
  } catch {
    /* ignore */
  }
  return null
}

export function setCachedCoords(c) {
  try {
    localStorage.setItem(COORDS_KEY, JSON.stringify({ lat: c.lat, lng: c.lng }))
  } catch {
    /* ignore */
  }
}
