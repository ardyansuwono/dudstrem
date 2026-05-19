/**
 * Simple in-memory session store.
 * Stores per-user state for multi-step flows (e.g. manual format selection).
 * Auto-expires sessions after 5 minutes of inactivity.
 */

const TTL_MS = 5 * 60 * 1000; // 5 minutes

class SessionStore {
  constructor() {
    /** @type {Map<number, {data: any, timer: NodeJS.Timeout}>} */
    this._store = new Map();
  }

  get(userId) {
    const entry = this._store.get(userId);
    if (!entry) return undefined;
    // Refresh TTL on access
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => this._store.delete(userId), TTL_MS);
    return entry.data;
  }

  set(userId, data) {
    const existing = this._store.get(userId);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => this._store.delete(userId), TTL_MS);
    this._store.set(userId, { data, timer });
  }

  delete(userId) {
    const entry = this._store.get(userId);
    if (entry) clearTimeout(entry.timer);
    this._store.delete(userId);
  }

  has(userId) {
    return this._store.has(userId);
  }
}

export const sessions = new SessionStore();
