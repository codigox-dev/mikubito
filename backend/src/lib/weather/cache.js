/**
 * Caché en memoria con TTL y opción de servir datos caducados si la fuente
 * externa falla. Suficiente para dos usuarios y evita golpear las APIs.
 */
function createTtlCache(ttlMs, { max = 250, staleMs = 0 } = {}) {
  const store = new Map();

  function get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() < entry.expiresAt) return entry.value;
    return null;
  }

  function getStale(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() < entry.staleUntil) return entry.value;
    return null;
  }

  function set(key, value) {
    if (store.size >= max && !store.has(key)) {
      const oldest = store.keys().next();
      if (!oldest.done) store.delete(oldest.value);
    }

    store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      staleUntil: Date.now() + ttlMs + staleMs,
    });
  }

  function clear() {
    store.clear();
  }

  return { get, getStale, set, clear };
}

module.exports = { createTtlCache };
