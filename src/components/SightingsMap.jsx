import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { statusMeta } from '../lib/meds.js'

// Status colors matched to the editorial map dots.
const DOT = {
  in_stock: '#4a9d5f',
  limited: '#d29a3b',
  expecting: '#d29a3b',
  out: '#c0563d',
  wouldnt_say: '#b3aa98',
}

// Real OpenStreetMap (Leaflet) map with a pin per sighting at its actual coords.
export default function SightingsMap({ sightings, center }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    if (mapRef.current || !elRef.current) return
    const map = L.map(elRef.current, { zoomControl: true }).setView(
      center ? [center.lat, center.lng] : [39.5, -98.35],
      center ? 11 : 4
    )
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const group = layerRef.current
    if (!map || !group) return
    group.clearLayers()

    const pts = []
    sightings
      .filter((s) => s.lat != null && s.lng != null)
      .forEach((s) => {
        const m = L.circleMarker([s.lat, s.lng], {
          radius: 9,
          color: '#fff',
          weight: 2,
          fillColor: DOT[s.status] || '#b3aa98',
          fillOpacity: 1,
        })
        m.bindPopup(
          `<b>${s.pharmacyName}</b><br>${statusMeta(s.status).label}${s.dose ? ' · ' + s.dose : ''}`
        )
        m.addTo(group)
        pts.push([s.lat, s.lng])
      })

    if (center) {
      L.circleMarker([center.lat, center.lng], {
        radius: 7,
        color: '#2e3d33',
        weight: 3,
        fillColor: '#4a6b8a',
        fillOpacity: 1,
      })
        .bindPopup('You are here')
        .addTo(group)
      pts.push([center.lat, center.lng])
    }

    if (pts.length === 1) map.setView(pts[0], 13)
    else if (pts.length > 1) map.fitBounds(pts, { padding: [36, 36], maxZoom: 14 })

    // container size can change as content above it loads
    const t = setTimeout(() => map.invalidateSize(), 60)
    return () => clearTimeout(t)
  }, [sightings, center])

  return <div className="leaflet-map" ref={elRef} />
}
