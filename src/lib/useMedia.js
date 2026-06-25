import { useEffect, useState } from 'react'

// Reactive media query — re-renders when the viewport crosses the breakpoint.
export function useMediaQuery(query) {
  const [match, setMatch] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false
  )
  useEffect(() => {
    const m = window.matchMedia(query)
    const onChange = () => setMatch(m.matches)
    onChange()
    m.addEventListener('change', onChange)
    return () => m.removeEventListener('change', onChange)
  }, [query])
  return match
}

// Desktop = wide enough for the split list+map layout.
export const useIsDesktop = () => useMediaQuery('(min-width: 1000px)')
