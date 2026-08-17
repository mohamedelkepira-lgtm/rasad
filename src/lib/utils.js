// أدوات مساعدة عامة

// مفتاح الشهر بصيغة YYYY-MM (بالوقت المحلي)
export function monthKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function monthLabel(key) {
  if (!key) return ''
  const [y, m] = key.split('-')
  const names = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  const mi = parseInt(m, 10)
  if (mi < 1 || mi > 12) return key
  return `${names[mi - 1]} ${y}`
}

// بداية اليوم ونهايته (بالوقت المحلي) بصيغة ISO
export function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${String(h).padStart(2, '0')}:${m}`
}

export function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso) {
  if (!iso) return ''
  return `${formatDate(iso)} • ${formatTime(iso)}`
}

export function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'الآن'
  if (min < 60) return `منذ ${min} د`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `منذ ${hrs} س`
  return formatDate(iso)
}

// تصدير CSV متوافق مع Excel (يدعم العربية)
export function downloadCSV(filename, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---------- فترات زمنية للتقارير ----------
// اليوم: من بداية اليوم إلى الآن
export function todayStartISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// بداية الأسبوع (منذ 6 أيام + اليوم) بأسلوب iOS/المناهج العربية (الأحد)
export function weekStartISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay()) // الأحد الماضي
  return d.toISOString()
}

// بداية الشهر
export function monthStartISO(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(1)
  return d.toISOString()
}

export function toLocalISOStringEnd(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString()
}

// تسمية الفترة للعرض
export function periodLabel(period, custom = {}) {
  if (period === 'today') return 'تقرير اليوم'
  if (period === 'week') return 'تقرير الأسبوع'
  if (period === 'month') return 'التقرير الشهري'
  if (period === 'custom' && custom.from && custom.to) {
    const f = new Date(custom.from).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
    const t = new Date(custom.to).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
    return `تقرير من ${f} إلى ${t}`
  }
  return 'التقرير'
}

export function fileStamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
}
