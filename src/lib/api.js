import { supabase } from './supabase'
import { monthKey, todayRange } from './utils'
import { withCache, invalidateCache } from './cache'
import { toISODate, monthDates, buildFillSchedule } from './scheduleGen'

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

// ---------- جدول مناوبة الليدرز ----------
const SCHEDULE_SELECT = `
  id, duty_date,
  assignments:schedule_assignments (
    id, slot, leader_id,
    leader:profiles!schedule_assignments_leader_id_fkey ( id, name ),
    attendance:schedule_attendance ( id, status, confirmed_at )
  )`

function monthBounds(year, month) {
  const mm = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` }
}

// جدول شهر كامل (أيام + تكليفات + حضور)
export async function fetchScheduleMonth(year, month) {
  const { start, end } = monthBounds(year, month)
  const { data, error } = await supabase
    .from('schedule_days')
    .select(SCHEDULE_SELECT)
    .gte('duty_date', start)
    .lte('duty_date', end)
    .order('duty_date', { ascending: true })
  if (error) throw error
  return data || []
}

// يوم واحد بالتفصيل
export async function fetchScheduleDay(dayId) {
  const { data, error } = await supabase
    .from('schedule_days')
    .select(SCHEDULE_SELECT)
    .eq('id', dayId)
    .maybeSingle()
  if (error) throw error
  return data
}

// قائمة القادة (لاستبدال مناوب أو توليد الجدول)
export async function fetchLeadersList() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('role', 'leader')
    .order('name', { ascending: true })
  if (error) throw error
  return data || []
}

// إنشاء جدول الشهر — يكمل الأيام الناقصة فقط ويحافظ على الموجود
export async function generateScheduleMonth(year, month) {
  const leaders = await fetchLeadersList()
  if (!leaders.length) throw new Error('لا يوجد قادة مسجلين في النظام')
  const ids = leaders.map((l) => l.id)
  const dates = monthDates(year, month)

  const existing = await fetchScheduleMonth(year, month)
  const existingByDate = new Map(existing.map((d) => [d.duty_date, d]))
  const missing = dates.filter((ds) => !existingByDate.has(ds))
  if (!missing.length) return { created: 0 }

  // عدالة الاستكمال: نحسب مناوبات كل قائد الموجودة أصلًا هذا الشهر
  const counts = {}
  for (const day of existing) {
    for (const a of day.assignments || []) counts[a.leader_id] = (counts[a.leader_id] || 0) + 1
  }
  const plan = buildFillSchedule(ids, missing.length, counts)

  const { data: insertedDays, error } = await supabase
    .from('schedule_days')
    .insert(missing.map((ds) => ({ duty_date: ds })))
    .select('id, duty_date')
  if (error) throw error

  const idByDate = new Map(insertedDays.map((d) => [d.duty_date, d.id]))
  const rows = []
  missing.forEach((ds, i) => {
    const dayId = idByDate.get(ds)
    ;(plan[i] || []).forEach((leaderId, idx) => rows.push({ day_id: dayId, leader_id: leaderId, slot: idx + 1 }))
  })
  if (rows.length) {
    const { error: aerr } = await supabase.from('schedule_assignments').insert(rows)
    if (aerr) throw aerr
  }
  return { created: missing.length }
}

// إعادة إنشاء كامل للشهر: يحذف أيام الشهر (والتكليفات تُحذف تلقائيًا Cascade) ثم يوزع من جديد
export async function regenerateScheduleMonth(year, month) {
  const { start, end } = monthBounds(year, month)
  const { error } = await supabase
    .from('schedule_days')
    .delete()
    .gte('duty_date', start)
    .lte('duty_date', end)
  if (error) throw error
  return generateScheduleMonth(year, month)
}

// استبدال قائد في يوم (Override للأدمن حتى في نفس اليوم) — الحضور القديم يُلغى
export async function replaceAssignmentLeader(assignmentId, newLeaderId) {
  const { error: delErr } = await supabase
    .from('schedule_attendance')
    .delete()
    .eq('assignment_id', assignmentId)
  if (delErr) throw delErr
  const { error } = await supabase
    .from('schedule_assignments')
    .update({ leader_id: newLeaderId })
    .eq('id', assignmentId)
  if (error) throw error
}

// تأكيد حضور القائد لمناوبته — RLS يمنع أي شخص غير مكلف بنفس التكليف
export async function confirmMyAttendance(assignmentId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('غير مسجل الدخول')
  const { data, error } = await supabase
    .from('schedule_attendance')
    .insert({ assignment_id: assignmentId, leader_id: user.id, confirmed_by: user.id, status: 'PRESENT' })
    .select('id, status, confirmed_at')
    .single()
  if (error) throw error
  return data
}

// مناوبة اليوم (تُستخدم في الصفحة الرئيسية)
export async function fetchTodayDuty() {
  const today = toISODate(new Date())
  const { data, error } = await supabase
    .from('schedule_days')
    .select(SCHEDULE_SELECT)
    .eq('duty_date', today)
    .maybeSingle()
  if (error) throw error
  return data
}

// أقرب مناوبة قادمة لقائد معين
export async function fetchMyNextDuty(leaderId) {
  const today = toISODate(new Date())
  const { data, error } = await supabase
    .from('schedule_assignments')
    .select('id, slot, day:schedule_days!inner(id, duty_date)')
    .eq('leader_id', leaderId)
    .gte('schedule_days.duty_date', today)
    .limit(120)
  if (error) throw error
  if (!data || !data.length) return null
  const sorted = [...data].sort((a, b) => String(a.day.duty_date).localeCompare(String(b.day.duty_date)))
  return fetchScheduleDay(sorted[0].day.id)
}
