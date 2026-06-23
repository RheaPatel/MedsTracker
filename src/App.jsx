import { useEffect, useState } from 'react'
import FindView from './views/FindView.jsx'
import ReportView from './views/ReportView.jsx'
import MyMedsView from './views/MyMedsView.jsx'
import CallLogView from './views/CallLogView.jsx'
import { getMeds } from './db/localStore.js'
import { DEFAULT_MED } from './lib/meds.js'
import { addDays, daysUntil } from './lib/format.js'

const TABS = [
  { key: 'find', label: 'Find', icon: '🔎' },
  { key: 'report', label: 'Report', icon: '📍' },
  { key: 'meds', label: 'My meds', icon: '💊' },
  { key: 'log', label: 'Call log', icon: '📞' },
]

function anyRunningLow(meds) {
  return meds.some((m) => {
    if (!m.lastFillDate || !m.daysSupply) return false
    const left = daysUntil(addDays(m.lastFillDate, Number(m.daysSupply)))
    return left <= (Number(m.alertLeadDays) || 10)
  })
}

export default function App() {
  const [view, setView] = useState('find')
  const [prefill, setPrefill] = useState(null)
  const [meds, setMeds] = useState(() => getMeds())
  const [toast, setToast] = useState(null)

  const reloadMeds = () => setMeds(getMeds())
  const primaryGeneric = meds[0]?.genericName || DEFAULT_MED.generic
  const lowAlert = anyRunningLow(meds)

  function go(next, pre = null) {
    setPrefill(pre)
    setView(next)
    window.scrollTo({ top: 0 })
  }

  function showToast(msg) {
    setToast(msg)
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className="app">
      <header className="header">
        <div className="header-row">
          <div className="logo">
            Fill<span>Finder</span>
          </div>
        </div>
        <div className="header-sub">
          Find your meds during the shortage — together. Reports are crowd-sourced; always call to
          confirm before you drive over.
        </div>
      </header>

      <main className="main">
        {view === 'find' && <FindView defaultGeneric={primaryGeneric} onReport={() => go('report')} />}
        {view === 'report' && (
          <ReportView prefill={prefill} onDone={() => go('find')} onToast={showToast} />
        )}
        {view === 'meds' && <MyMedsView onMedsChange={reloadMeds} />}
        {view === 'log' && (
          <CallLogView onShare={(pre) => go('report', pre)} onToast={showToast} />
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}

      <nav className="tabbar">
        <div className="tabbar-inner">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab ${view === t.key ? 'active' : ''}`}
              onClick={() => go(t.key)}
            >
              <span className="tab-icon">{t.icon}</span>
              {t.key === 'meds' && lowAlert && <span className="tab-dot" />}
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
