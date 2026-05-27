import type { ExchangePersistedState } from '../types'

const STORAGE_KEY  = 'wellcoin-state'
const SESSION_KEY  = 'wellcoin-session'
const LEGACY_STORAGE_KEY = 'exchange-mvp-v2-state'
const LEGACY_SESSION_KEY = 'exchange-mvp-session'

export function loadPersistedState(): ExchangePersistedState | null {
  const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ExchangePersistedState
    if (!localStorage.getItem(STORAGE_KEY) && localStorage.getItem(LEGACY_STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, raw)
    }
    return parsed
  } catch {
    return null
  }
}

export function savePersistedState(state: ExchangePersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function loadSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY) ?? localStorage.getItem(LEGACY_SESSION_KEY)
}

export function saveSessionUserId(userId: string | null): void {
  if (userId) localStorage.setItem(SESSION_KEY, userId)
  else        localStorage.removeItem(SESSION_KEY)
}
