import { useEffect, useRef, useState } from 'react'
import { fetchPlaces } from '../api/client.js'

// Debounced pharmacy/address autocomplete. Type a few letters → real nearby
// places to pick from. Picking one calls onPick(place) with full address + coords;
// the field still accepts free text if nothing fits.
export default function PlaceAutocomplete({
  value,
  onChange,
  onPick,
  coords,
  onUseLocation,
  locating,
  placeholder,
  kind = 'pharmacy',
}) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)
  const justPicked = useRef(false)

  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false
      return
    }
    const q = (value || '').trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const places = await fetchPlaces({ q, lat: coords?.lat, lng: coords?.lng, kind })
        setSuggestions(places)
        setOpen(true)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 280)
    return () => clearTimeout(t)
  }, [value, coords?.lat, coords?.lng, kind])

  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function pick(p) {
    justPicked.current = true
    // When onPick is provided it owns the full update (name + address + coords).
    // Calling onChange here too would run the parent's "typing" handler and clobber
    // the coords pick just set, so only fall back to onChange when there's no onPick.
    if (onPick) onPick(p)
    else onChange?.(p.name)
    setOpen(false)
    setSuggestions([])
  }

  return (
    <div className="ac" ref={boxRef}>
      <input
        className="input"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => suggestions.length && setOpen(true)}
      />
      {onUseLocation && (
        <button
          type="button"
          className={`ac-loc ${coords ? 'on' : ''}`}
          onClick={onUseLocation}
          disabled={locating}
        >
          {locating ? 'Locating…' : coords ? '📍 Near you' : '📍 Use my location'}
        </button>
      )}
      {open && (loading || suggestions.length > 0) && (
        <div className="ac-menu">
          {loading && suggestions.length === 0 && <div className="ac-note">Searching…</div>}
          {suggestions.map((p, i) => (
            <button type="button" key={`${p.lat},${p.lng},${i}`} className="ac-item" onClick={() => pick(p)}>
              <div className="ac-name">{p.name}</div>
              <div className="ac-sub">
                {[p.address, [p.city, p.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
