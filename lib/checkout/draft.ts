'use client';

/**
 * Order drafts: the order wizards save their choices here after every change,
 * so leaving for Google sign-in or refreshing the page brings the customer
 * back to the same step with everything filled in. Tab-scoped
 * (sessionStorage), expires after 2 hours, cleared once the order is created.
 */
const TTL_MS = 2 * 60 * 60 * 1000;
const key = (name: string) => `brotin:draft:${name}`;

export function saveDraft<T>(name: string, data: T) {
  try {
    sessionStorage.setItem(key(name), JSON.stringify({ t: Date.now(), data }));
  } catch {
    /* storage blocked or full: drafts are a convenience only */
  }
}

export function loadDraft<T>(name: string): T | null {
  try {
    const raw = sessionStorage.getItem(key(name));
    if (!raw) return null;
    const { t, data } = JSON.parse(raw);
    if (typeof t !== 'number' || Date.now() - t > TTL_MS) {
      sessionStorage.removeItem(key(name));
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

export function clearDraft(name: string) {
  try {
    sessionStorage.removeItem(key(name));
  } catch {
    /* ignore */
  }
}
