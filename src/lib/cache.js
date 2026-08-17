// طبقة تخزين مؤقت خفيفة للبيانات شبه الثابتة
// تمنع إعادة طلب نفس البيانات من Supabase عند كل زيارة
const store = new Map()

export function withCache(key, ttlMs, fetcher) {
  const hit = store.get(key)
  if (hit && Date.now() - hit.at < ttlMs) {
    return Promise.resolve(hit.data)
  }
  return fetcher().then((data) => {
    store.set(key, { at: Date.now(), data })
    return data
  })
}

export function invalidateCache(keys) {
  if (!keys || keys.length === 0) return
  keys.forEach((k) => store.delete(k))
}

export function clearCache() {
  store.clear()
}
