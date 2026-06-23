// Lightweight, privacy-first identity.
//
// Everyone gets an anonymous device id (a random UUID kept in this browser only).
// It lets you see/manage your own reports without ever creating an account.
// An optional display "handle" can be attached to reports so a community member
// can build a little reputation if they want — purely opt-in.
//
// Real email/magic-link accounts (to sync across devices) are a planned follow-up;
// the data model already carries reporterId so that upgrade won't require a migration.

import { v4 as uuid } from 'uuid'

const DEVICE_KEY = 'ff_device_id'
const HANDLE_KEY = 'ff_handle'

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = uuid()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export function getHandle() {
  return localStorage.getItem(HANDLE_KEY) || ''
}

export function setHandle(name) {
  const clean = (name || '').trim().slice(0, 40)
  if (clean) localStorage.setItem(HANDLE_KEY, clean)
  else localStorage.removeItem(HANDLE_KEY)
  return clean
}
