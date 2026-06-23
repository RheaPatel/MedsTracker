// Personal data lives on-device (localStorage) — private by default, works offline,
// and never touches the shared pool unless you explicitly "share to community".

import { v4 as uuid } from 'uuid'

const MEDS_KEY = 'ff_meds'
const CALLS_KEY = 'ff_calllog'

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || []
  } catch {
    return []
  }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
  return value
}

/* ---- Meds you're tracking / hunting ---- */

export function getMeds() {
  return read(MEDS_KEY)
}

export function upsertMed(med) {
  const all = getMeds()
  if (med.id) {
    const i = all.findIndex((m) => m.id === med.id)
    if (i >= 0) all[i] = { ...all[i], ...med }
    else all.push(med)
  } else {
    all.push({ ...med, id: uuid() })
  }
  return write(MEDS_KEY, all)
}

export function deleteMed(id) {
  return write(MEDS_KEY, getMeds().filter((m) => m.id !== id))
}

/* ---- Personal pharmacy call log ---- */

export function getCalls() {
  return read(CALLS_KEY)
}

export function addCall(entry) {
  const all = getCalls()
  all.unshift({ ...entry, id: uuid() })
  return write(CALLS_KEY, all)
}

export function updateCall(id, patch) {
  const all = getCalls().map((c) => (c.id === id ? { ...c, ...patch } : c))
  return write(CALLS_KEY, all)
}

export function deleteCall(id) {
  return write(CALLS_KEY, getCalls().filter((c) => c.id !== id))
}
