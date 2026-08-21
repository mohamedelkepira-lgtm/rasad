// ============================================================
// مولد جدول مناوبة الليدرز — توزيع Deterministic متوازن
// كل يوم يستقبل حتى 3 قادة، والمجموع الشهري يوزَّع بالتساوي:
// الفرق بين أكثر قائد مناوبات وأقلهم لا يتجاوز مناوبة واحدة.
// الترتيب مستقر (حسب ترتيب القادة المُمرر) ولا يعتمد على Random.
// ============================================================

// تاريخ محلي بصيغة YYYY-MM-DD (بدون تحويلات timezone)
export function toISODate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// كل تواريخ شهر معين YYYY-MM-DD
export function monthDates(year, month) {
  const days = new Date(year, month, 0).getDate()
  return Array.from({ length: days }, (_, i) => toISODate(new Date(year, month - 1, i + 1)))
}

// توليد كامل: توزيع round-robin عادل على أيام الشهر
export function buildFullSchedule(leaderIds, daysCount) {
  const N = leaderIds.length
  const days = Array.from({ length: daysCount }, () => [])
  if (!N || !daysCount) return days
  const total = daysCount * 3
  const base = Math.floor(total / N)
  const rem = total % N
  const seq = []
  const maxRounds = base + (rem > 0 ? 1 : 0)
  for (let r = 0; r < maxRounds; r++) {
    for (let i = 0; i < N; i++) {
      const quota = i < rem ? base + 1 : base
      if (r < quota) seq.push(leaderIds[i])
    }
  }
  for (let d = 0; d < daysCount; d++) {
    days[d] = seq.slice(d * 3, d * 3 + 3)
  }
  return days
}

// استكمال أيام ناقصة فقط: يختار لكل يوم أقل القادة مناوبات (مع مراعاة الموجود مسبقًا)
export function buildFillSchedule(leaderIds, daysCount, initialCounts = {}) {
  const counts = new Map(leaderIds.map((id) => [id, initialCounts[id] || 0]))
  const out = []
  for (let d = 0; d < daysCount; d++) {
    const sorted = [...leaderIds].sort((a, b) => counts.get(a) - counts.get(b))
    const picked = sorted.slice(0, Math.min(3, leaderIds.length))
    picked.forEach((id) => counts.set(id, counts.get(id) + 1))
    out.push(picked)
  }
  return out
}
