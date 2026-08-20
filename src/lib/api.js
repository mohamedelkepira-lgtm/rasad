import { supabase } from './supabase'
import { monthKey, todayRange } from './utils'
import { withCache, invalidateCache } from './cache'

// ---------- Cache keys & TTL ----------
const TTL = {
  categories: 30 * 60 * 1000, // التصنيفات لا تتغير تقريبًا
  students: 10 * 60 * 1000, // الطلاب شبه ثابتين
  months: 10 * 60 * 1000, // قائمة الأشهر
  search: 60 * 1000, // نتائج البحث
  dashboard: 30 * 1000 // إحصائيات قصيرة العمر
}

// ---------- Dashboard ----------
// دمج الاستعلامات لتقليل عدد الطلبات من 8 إلى 5:
//  - todayCount + todayStudents + todayLeaders كانت 3 طلبات → أصبحت 1 (select student_id, created_by لنفس الفترة)
//  - monthCount + topStudents كانتا طلبتين → أصبحتا 1 (نفس الفلتر month_key، وtopStudents تُستنتج منه العدد)
//  - categories تُقرأ من cache
// يُخزَّن مؤقتًا 30 ثانية لتفادي إعادة الجلب عند التنقل السريع بين الصفحات
export async function getDashboardStats() {
  return withCache('dashboard', TTL.dashboard, async () => {
    const { start, end } = todayRange()
    const month = monthKey()
    const { data: user } = await supabase.auth.getUser()

    const [todayRows, monthRows, recent, myMonth, cats] = await Promise.all([
      supabase.from('violations')
        .select('student_id, created_by')
        .gte('created_at', start).lt('created_at', end),
      supabase.from('violations')
        .select('student_id, student:students(name, class_name)')
        .eq('month_key', month),
      supabase.from('violations')
        .select('*, student:students(id, name, class_name), category:violation_categories(name), type:violation_types(name), leader:profiles(name)')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.from('violations').select('id', { count: 'exact', head: true })
        .eq('month_key', month).eq('created_by', user?.user?.id),
      fetchCategoriesCached()
    ])

    const t = todayRows.data || []
    const todayStudents = new Set(t.map((r) => r.student_id)).size
    const todayLeaders = new Set(t.map((r) => r.created_by)).size

    const agg = {}
    ;(monthRows.data || []).forEach((r) => {
      const id = r.student_id
      if (!agg[id]) agg[id] = { id, name: r.student?.name || '', class_name: r.student?.class_name || '', count: 0 }
      agg[id].count += 1
    })
    const topList = Object.values(agg).sort((a, b) => b.count - a.count).slice(0, 5)

    return {
      todayCount: t.length,
      todayStudents,
      monthCount: (monthRows.data || []).length,
      todayLeaders,
      myMonth: myMonth.count || 0,
      recent: recent.data || [],
      topStudents: topList,
      categories: cats
    }
  })
}

// ---------- Violations ----------
export async function fetchViolations({ page = 0, pageSize = 50 } = {}) {
  const from = page * pageSize
  const to = from + pageSize - 1
  const { data, error } = await supabase
    .from('violations')
    .select('*, student:students(id, name, class_name), category:violation_categories(name), type:violation_types(name), leader:profiles(name)')
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error
  return data || []
}

export async function fetchViolation(id) {
  const { data, error } = await supabase
    .from('violations')
    .select('*, student:students(id, name, class_name), category:violation_categories(id, name), type:violation_types(id, name), leader:profiles(name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createViolation({ student_id, category_id, violation_type_id, note }) {
  const { data: user } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('violations').insert({
    student_id,
    category_id,
    violation_type_id,
    note: note || null,
    created_by: user.user.id
  }).select().single()
  if (error) throw error
  // إبطال بيانات الداشبورد والبحث حتى لا تظهر بيانات قديمة
  invalidateCache(['dashboard'])
  return data
}

export async function updateViolation(id, fields) {
  const { data, error } = await supabase.from('violations').update(fields).eq('id', id).select().single()
  if (error) throw error
  invalidateCache(['dashboard'])
  return data
}

export async function deleteViolation(id) {
  const { error } = await supabase.from('violations').delete().eq('id', id)
  if (error) throw error
  invalidateCache(['dashboard'])
}

// ---------- Students ----------
export async function searchStudents(q, activeOnly = true) {
  const key = `search:${activeOnly}:${(q || '').toLowerCase()}`
  return withCache(key, TTL.search, async () => {
    let query = supabase.from('students').select('id, student_code, official_student_id, name, class_name, active')
    if (q) query = query.ilike('name', `%${q}%`)
    if (activeOnly) query = query.eq('active', true)
    query = query.order('name').limit(30)
    const { data, error } = await query
    if (error) throw error
    return data || []
  })
}

export async function fetchStudents() {
  return withCache('students', TTL.students, async () => {
    const { data, error } = await supabase
      .from('students')
      .select('id, student_code, official_student_id, name, class_name, active')
      .order('name')
    if (error) throw error
    return data || []
  })
}

// البحث عن طالب بمعرّف البطاقة (الرقم الرسمي، أو الرمز، أو الـ UUID الاحتياطي)
// تُستخدم بعد فك الـ QR — نثق فقط بالمعرّف ثم نجلب بيانات الطالب من Supabase
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function findStudentByCardId(cardId) {
  const card = String(cardId || '').trim()
  if (!card) return null
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .or(`official_student_id.eq.${card},student_code.eq.${card}`)
    .maybeSingle()
  if (error) throw error
  if (data) return data
  if (!UUID_RE.test(card)) return null
  const { data: byId, error: idErr } = await supabase
    .from('students')
    .select('*')
    .eq('id', card)
    .maybeSingle()
  if (idErr) throw idErr
  return byId || null
}

export async function getStudentsWithCounts(month) {
  // قائمة الطلاب من cache، وعدد مخالفات الشهر يُحسب بطلب واحد
  const students = await fetchStudents()
  const { data: violations, error } = await supabase
    .from('violations')
    .select('student_id')
    .eq('month_key', month)
  if (error) throw error
  const counts = {}
  ;(violations || []).forEach((r) => {
    counts[r.student_id] = (counts[r.student_id] || 0) + 1
  })
  return students.map((s) => ({ ...s, month_count: counts[s.id] || 0 }))
}

export async function addStudent({ student_code, name, class_name }) {
  const { data, error } = await supabase.from('students').insert({
    student_code: student_code || null,
    name,
    class_name
  }).select().single()
  if (error) throw error
  invalidateCache(['students', 'search'])
  return data
}

export async function updateStudent(id, fields) {
  const { data, error } = await supabase.from('students').update(fields).eq('id', id).select().single()
  if (error) throw error
  invalidateCache(['students', 'search'])
  return data
}

// ---------- Categories / Types ----------
async function fetchCategoriesCached() {
  return withCache('categories', TTL.categories, async () => {
    const { data, error } = await supabase
      .from('violation_categories')
      .select('id, name, violation_types(id, name)')
      .eq('active', true)
      .order('name')
    if (error) throw error
    return data || []
  })
}

export async function fetchCategories() {
  return fetchCategoriesCached()
}

// ---------- Reports ----------
export async function fetchReport(month) {
  const { data, error } = await supabase
    .from('violations')
    .select('*, student:students(name, class_name), category:violation_categories(name), type:violation_types(name), leader:profiles(name)')
    .eq('month_key', month)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchMonths() {
  return withCache('months', TTL.months, async () => {
    const { data, error } = await supabase
      .from('violations')
      .select('month_key')
      .order('month_key', { ascending: false })
    if (error) throw error
    const set = new Set((data || []).map((r) => r.month_key))
    return [...set].sort().reverse()
  })
}

// ---------- Student page ----------
export async function fetchStudent(id) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function fetchStudentViolations(id) {
  const { data, error } = await supabase
    .from('violations')
    .select('*, category:violation_categories(name), type:violation_types(name), leader:profiles(name)')
    .eq('student_id', id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ---------- Leader activity (Admin) ----------
export async function getLeaderActivity(month) {
  const { data, error } = await supabase
    .from('violations')
    .select('leader:profiles(name)')
    .eq('month_key', month)
  if (error) throw error
  const agg = {}
  ;(data || []).forEach((r) => {
    const name = r.leader?.name || 'غير معروف'
    agg[name] = (agg[name] || 0) + 1
  })
  return Object.entries(agg)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

// ---------- تقارير Excel (فترة زمنية) ----------
// جلب مخالفات خلال فترة زمنية مع كل الارتباطات اللازمة للتصدير
export async function fetchViolationsByRange(fromISO, toISO) {
  let q = supabase
    .from('violations')
    .select('*, student:students(id, name, class_name, student_code), category:violation_categories(name), type:violation_types(name), leader:profiles(name)')
    .order('created_at', { ascending: false })
  if (fromISO) q = q.gte('created_at', fromISO)
  if (toISO) q = q.lt('created_at', toISO)
  const { data, error } = await q
  if (error) throw error
  return data || []
}
