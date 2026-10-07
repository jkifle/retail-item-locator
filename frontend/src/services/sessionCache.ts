// Module memory lasts until a full page reload. Pending requests are shared too.
const entries = new Map<string, Promise<unknown>>();

export function clearSessionCache(): void {
  entries.clear();
}

export function invalidateSessionCache(path: string): void {
  for (const key of entries.keys()) {
    if (key.split("?")[0] === path) entries.delete(key);
  }
}

export function cachedRequest<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = entries.get(key);
  if (existing) return existing as Promise<T>;
  const pending = load().catch((error: unknown) => {
    // An older failed request must not remove a newer cache entry.
    if (entries.get(key) === pending) entries.delete(key);
    throw error;
  });
  entries.set(key, pending);
  return pending;
}
