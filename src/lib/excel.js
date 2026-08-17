// ============================================================
// رَصَد — مولّد تقارير Excel احترافية (مكتبة مجانية: xlsx/SheetJS)
// القاعدة الأساسية: Supabase هو الـSource of Truth، هذا الملف يُولّد
// تقريرًا قابلًا للتصدير والمشاركة من البيانات الحالية فقط.
// ============================================================
import * as XLSX from 'xlsx'
import { periodLabel } from './utils.js'

// ألوان الهوية
const C = {
  brand: '123061',
  brandLight: 'EAF1FD',
  navy: '0E2344',
  warn: 'D97706',
  warnLight: 'FDF3E3',
  danger: 'D64545',
  dangerLight: 'FCEBEB',
  success: '0E9F6E',
  successLight: 'E5F6EF',
  violet: '6D5BD0',
  gray: 'EEF1F6',
  white: 'FFFFFF',
  textDark: '0F1B2D',
  textMid: '5E6E88'
}

const THIN = { style: 'thin', color: { rgb: C.gray } }
const BOTTOM_BORDER = { bottom: THIN }
const ALL_BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN }

const FONT = {
  name: 'Calibri',
  color: { rgb: C.textDark }
}
const FONT_AR = { ...FONT, name: 'Arial' }

function titleCell(text) {
  return {
    v: text,
    t: 's',
    s: {
      font: { name: 'Calibri', sz: 20, bold: true, color: { rgb: C.white } },
      fill: { fgColor: { rgb: C.navy } },
      alignment: { vertical: 'center', horizontal: 'left' }
    }
  }
}

function headerCell(text) {
  return {
    v: text,
    t: 's',
    s: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: C.white } },
      fill: { fgColor: { rgb: C.brand } },
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
      border: ALL_BORDER
    }
  }
}

function textCell(text, opts = {}) {
  const s = {
    font: { ...FONT_AR, sz: 11, bold: !!opts.bold, color: { rgb: opts.color || C.textDark } },
    alignment: { vertical: 'center', horizontal: opts.center ? 'center' : 'right', wrapText: !!opts.wrap },
    border: BOTTOM_BORDER
  }
  if (opts.fill) s.fill = { fgColor: { rgb: opts.fill } }
  return { v: text == null ? '' : String(text), t: 's', s }
}

function numCell(value, opts = {}) {
  const s = {
    numFmt: opts.fmt || '0',
    font: { ...FONT, sz: 11, bold: !!opts.bold, color: { rgb: opts.color || C.textDark } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: BOTTOM_BORDER
  }
  if (opts.fill) s.fill = { fgColor: { rgb: opts.fill } }
  return { v: value == null ? 0 : value, t: 'n', s }
}

// بطاقة إحصائية في الـDashboard
function statCard(ws, range, label, value, accent) {
  const [r1, c1, r2, c2] = range
  ws['!merges'] = ws['!merges'] || []
  ws['!merges'].push({ s: { r: r1, c: c1 }, e: { r: r1, c: c2 } })
  ws['!merges'].push({ s: { r: r2, c: c1 }, e: { r: r2, c: c2 } })
  ws[XLSX.utils.encode_cell({ r: r1, c: c1 })] = {
    v: label, t: 's',
    s: {
      font: { ...FONT_AR, sz: 10, bold: false, color: { rgb: C.textMid } },
      fill: { fgColor: { rgb: C.white } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: ALL_BORDER
    }
  }
  ws[XLSX.utils.encode_cell({ r: r2, c: c1 })] = {
    v: value, t: 'n',
    s: {
      font: { name: 'Calibri', sz: 22, bold: true, color: { rgb: accent } },
      fill: { fgColor: { rgb: C.white } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: ALL_BORDER
    }
  }
}

function sectionTitle(text) {
  return {
    v: text, t: 's',
    s: {
      font: { ...FONT_AR, sz: 13, bold: true, color: { rgb: C.navy } },
      fill: { fgColor: { rgb: C.brandLight } },
      alignment: { vertical: 'center', horizontal: 'right' },
      border: ALL_BORDER
    }
  }
}

// ---------- بناء تقرير "الطلاب حسب عدد المخالفات" (مرتبة تنازليًا) ----------
function buildStudentsSheet(wb, perStudent, catNames) {
  const ws = XLSX.utils.aoa_to_sheet([])
  ws['!cols'] = [
    { wch: 4 }, { wch: 26 }, { wch: 12 }, { wch: 12 },
    ...catNames.map(() => ({ wch: 12 }))
  ]
  const header = ['#', 'اسم الطالب', 'الفصل', 'إجمالي المخالفات', ...catNames]
  const rows = [header.map(headerCell)]

  perStudent.forEach((s, i) => {
    rows.push([
      numCell(i + 1, { center: true }),
      textCell(s.name, { bold: true }),
      textCell(s.class_name, { center: true }),
      numCell(s.total, { bold: true, color: C.brand }),
      ...catNames.map((c) => numCell(s.cats[c] || 0))
    ])
  })

  // صف الإجمالي
  const totals = catNames.map((c) => perStudent.reduce((a, s) => a + (s.cats[c] || 0), 0))
  rows.push([
    textCell('الإجمالي', { bold: true, center: true, fill: C.gray }),
    textCell('', { fill: C.gray }),
    textCell('', { fill: C.gray }),
    numCell(perStudent.reduce((a, s) => a + s.total, 0), { bold: true, fill: C.gray }),
    ...totals.map((t) => numCell(t, { fill: C.gray }))
  ])

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A1' })
  ws['!autofilter'] = { ref: 'A1:D1' }
  XLSX.utils.book_append_sheet(wb, ws, 'إحصائيات الطلاب')
}

// ---------- بناء جدول "تفاصيل المخالفات" ----------
function buildDetailsSheet(wb, violations) {
  const ws = XLSX.utils.aoa_to_sheet([])
  ws['!cols'] = [
    { wch: 6 }, { wch: 24 }, { wch: 12 }, { wch: 20 }, { wch: 24 },
    { wch: 40 }, { wch: 13 }, { wch: 9 }, { wch: 22 }
  ]
  const header = ['#', 'اسم الطالب', 'الفصل', 'تصنيف المخالفة', 'نوع المخالفة', 'تفاصيل / ملاحظة', 'التاريخ', 'الوقت', 'الـ Leader']
  const rows = [header.map(headerCell)]

  violations.forEach((v, i) => {
    const d = v.created_at ? new Date(v.created_at) : null
    rows.push([
      numCell(i + 1, { center: true }),
      textCell(v.student?.name || '—', { bold: true }),
      textCell(v.student?.class_name || '—', { center: true }),
      textCell(v.category?.name || 'أخرى', { center: true }),
      textCell(v.type?.name || '—', { center: true }),
      textCell(v.note || '', { wrap: true }),
      textCell(d ? d.toLocaleDateString('ar-EG') : '', { center: true }),
      textCell(d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '', { center: true }),
      textCell(v.leader?.name || '—', { center: true })
    ])
  })

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A1' })
  ws['!autofilter'] = { ref: 'A1:I1' }
  XLSX.utils.book_append_sheet(wb, ws, 'تفاصيل المخالفات')
}

// ---------- بناء شيت "المخالفات حسب التصنيف" ----------
function buildCategoriesSheet(wb, catCounts) {
  const ws = XLSX.utils.aoa_to_sheet([])
  ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 18 }]
  const rows = [
    ['#', 'التصنيف', 'عدد المخالفات'].map(headerCell),
    ...catCounts.map((c, i) => [
      numCell(i + 1, { center: true }),
      textCell(c.name),
      numCell(c.count, { bold: true, color: C.warn })
    ])
  ]
  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A1' })
  ws['!autofilter'] = { ref: 'A1:C1' }
  XLSX.utils.book_append_sheet(wb, ws, 'حسب التصنيف')
}

// ---------- بناء شيت "المخالفات حسب الفصل" ----------
function buildClassesSheet(wb, classCounts) {
  const ws = XLSX.utils.aoa_to_sheet([])
  ws['!cols'] = [{ wch: 4 }, { wch: 16 }, { wch: 18 }]
  const rows = [
    ['#', 'الفصل', 'عدد المخالفات'].map(headerCell),
    ...classCounts.map((c, i) => [
      numCell(i + 1, { center: true }),
      textCell(c.class_name, { center: true }),
      numCell(c.count, { bold: true, color: C.brand })
    ])
  ]
  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A1' })
  ws['!autofilter'] = { ref: 'A1:C1' }
  XLSX.utils.book_append_sheet(wb, ws, 'حسب الفصل')
}

// ---------- بناء شيت "المخالفات حسب النوع" ----------
function buildTypesSheet(wb, typeCounts) {
  const ws = XLSX.utils.aoa_to_sheet([])
  ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 18 }]
  const rows = [
    ['#', 'نوع المخالفة', 'عدد المخالفات'].map(headerCell),
    ...typeCounts.map((c, i) => [
      numCell(i + 1, { center: true }),
      textCell(c.name),
      numCell(c.count, { bold: true, color: C.success })
    ])
  ]
  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A1' })
  ws['!autofilter'] = { ref: 'A1:C1' }
  XLSX.utils.book_append_sheet(wb, ws, 'حسب النوع')
}

// ---------- بناء شيت "المخالفات حسب الـ Leader" ----------
function buildLeadersSheet(wb, leaderCounts) {
  const ws = XLSX.utils.aoa_to_sheet([])
  ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 18 }]
  const rows = [
    ['#', 'الـ Leader', 'عدد المخالفات'].map(headerCell),
    ...leaderCounts.map((c, i) => [
      numCell(i + 1, { center: true }),
      textCell(c.name),
      numCell(c.count, { bold: true, color: C.violet })
    ])
  ]
  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A1' })
  ws['!autofilter'] = { ref: 'A1:C1' }
  XLSX.utils.book_append_sheet(wb, ws, 'حسب الـ Leader')
}

// ---------- التحليل ----------
export function analyzeViolations(violations) {
  const rows = violations || []

  // طلاب
  const perStudentMap = {}
  rows.forEach((v) => {
    const id = v.student_id
    if (!perStudentMap[id]) perStudentMap[id] = { id, name: v.student?.name || '—', class_name: v.student?.class_name || '—', total: 0, cats: {} }
    perStudentMap[id].total += 1
    const c = v.category?.name || 'أخرى'
    perStudentMap[id].cats[c] = (perStudentMap[id].cats[c] || 0) + 1
  })
  const perStudent = Object.values(perStudentMap).sort((a, b) => b.total - a.total)

  // فصول
  const classMap = {}
  rows.forEach((v) => {
    const k = v.student?.class_name || '—'
    if (!classMap[k]) classMap[k] = 0
    classMap[k] += 1
  })
  const classCounts = Object.entries(classMap).map(([class_name, count]) => ({ class_name, count })).sort((a, b) => b.count - a.count)

  // تصنيفات
  const catMap = {}
  rows.forEach((v) => {
    const k = v.category?.name || 'أخرى'
    catMap[k] = (catMap[k] || 0) + 1
  })
  const catCounts = Object.entries(catMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  const catNames = catCounts.map((c) => c.name)

  // أنواع
  const typeMap = {}
  rows.forEach((v) => {
    const k = v.type?.name || 'أخرى'
    typeMap[k] = (typeMap[k] || 0) + 1
  })
  const typeCounts = Object.entries(typeMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

  // Leaders
  const leaderMap = {}
  rows.forEach((v) => {
    const k = v.leader?.name || 'غير معروف'
    leaderMap[k] = (leaderMap[k] || 0) + 1
  })
  const leaderCounts = Object.entries(leaderMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

  return {
    total: rows.length,
    uniqueStudents: perStudent.length,
    perStudent,
    classCounts,
    catCounts,
    catNames,
    typeCounts,
    leaderCounts
  }
}

// ---------- توليد الملف النهائي ----------
export function buildWorkbook(violations, { period, custom } = {}) {
  const analysis = analyzeViolations(violations)
  const wb = XLSX.utils.book_new()
  const title = periodLabel(period, custom)
  const now = new Date().toLocaleString('ar-EG')

  // ===== شيت Dashboard =====
  const ds = XLSX.utils.aoa_to_sheet([])
  ds['!cols'] = [
    { wch: 4 }, { wch: 30 }, { wch: 4 }, { wch: 4 }, { wch: 30 },
    { wch: 4 }, { wch: 4 }, { wch: 30 }, { wch: 4 }, { wch: 30 }
  ]
  ds[XLSX.utils.encode_cell({ r: 0, c: 0 })] = titleCell(`رَصَد — ${title}`)
  ds['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }]
  ds['!rows'] = [{ hpt: 42 }]

  ds[XLSX.utils.encode_cell({ r: 1, c: 0 })] = {
    v: `تاريخ التوليد: ${now} — إجمالي المخالفات: ${analysis.total}`,
    t: 's',
    s: {
      font: { ...FONT_AR, sz: 10, color: { rgb: C.textMid } },
      alignment: { vertical: 'center', horizontal: 'left' }
    }
  }
  ds['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 9 } })
  ds['!rows'].push({ hpt: 22 })

  // البطاقات الإحصائية (2×3)
  const cards = [
    ['إجمالي المخالفات', analysis.total, C.danger],
    ['الطلاب المخالفون', analysis.uniqueStudents, C.brand],
    ['أكثر الفصول تسجيلًا', analysis.classCounts[0] ? analysis.classCounts[0].class_name : '—', C.warn]
  ]
  cards.forEach(([label, value, accent], i) => {
    const col = i * 3
    statCard(ds, [3, col, 4, col + 1], label, typeof value === 'number' ? value : 0, accent)
    ds['!merges'].push({ s: { r: 3, c: col + 2 }, e: { r: 4, c: col + 2 } })
    const valCell = { v: String(value), t: 's', s: { font: { ...FONT_AR, sz: 12, bold: true, color: { rgb: accent } }, alignment: { vertical: 'center', horizontal: 'left' }, border: ALL_BORDER } }
    if (typeof value === 'number') valCell.t = 'n', valCell.v = value, valCell.s.font = { ...FONT_AR, sz: 18, bold: true, color: { rgb: accent } }
    ds[XLSX.utils.encode_cell({ r: 3, c: col + 2 })] = valCell
  })

  let r = 6

  // أكثر الطلاب تكرارًا
  ds[XLSX.utils.encode_cell({ r, c: 0 })] = sectionTitle('أكثر الطلاب تكرارًا للمخالفات')
  ds['!merges'].push({ s: { r, c: 0 }, e: { r, c: 9 } })
  r += 1
  ds[XLSX.utils.encode_cell({ r, c: 0 })] = headerCell('#')
  ds[XLSX.utils.encode_cell({ r, c: 1 })] = headerCell('اسم الطالب')
  ds[XLSX.utils.encode_cell({ r, c: 2 })] = headerCell('الفصل')
  ds['!merges'].push({ s: { r, c: 2 }, e: { r, c: 6 } })
  ds[XLSX.utils.encode_cell({ r, c: 7 })] = headerCell('عدد المخالفات')
  ds['!merges'].push({ s: { r, c: 7 }, e: { r, c: 9 } })
  r += 1
  const top = analysis.perStudent.slice(0, 10)
  if (top.length === 0) {
    ds[XLSX.utils.encode_cell({ r, c: 0 })] = { v: 'لا توجد بيانات', t: 's', s: { font: { ...FONT_AR, sz: 11, color: { rgb: C.textMid } } } }
    ds['!merges'].push({ s: { r, c: 0 }, e: { r, c: 9 } })
    r += 1
  } else {
    top.forEach((s, i) => {
      ds[XLSX.utils.encode_cell({ r, c: 0 })] = numCell(i + 1, { center: true })
      ds[XLSX.utils.encode_cell({ r, c: 1 })] = textCell(s.name, { bold: true })
      ds[XLSX.utils.encode_cell({ r, c: 2 })] = textCell(s.class_name, { center: true })
      ds['!merges'].push({ s: { r, c: 2 }, e: { r, c: 6 } })
      ds[XLSX.utils.encode_cell({ r, c: 7 })] = numCell(s.total, { bold: true, color: C.danger })
      ds['!merges'].push({ s: { r, c: 7 }, e: { r, c: 9 } })
      r += 1
    })
  }

  // أكثر التصنيفات انتشارًا
  r += 1
  ds[XLSX.utils.encode_cell({ r, c: 0 })] = sectionTitle('أكثر التصنيفات انتشارًا')
  ds['!merges'].push({ s: { r, c: 0 }, e: { r, c: 9 } })
  r += 1
  ds[XLSX.utils.encode_cell({ r, c: 0 })] = headerCell('#')
  ds[XLSX.utils.encode_cell({ r, c: 1 })] = headerCell('التصنيف')
  ds['!merges'].push({ s: { r, c: 1 }, e: { r, c: 6 } })
  ds[XLSX.utils.encode_cell({ r, c: 7 })] = headerCell('عدد المخالفات')
  ds['!merges'].push({ s: { r, c: 7 }, e: { r, c: 9 } })
  r += 1
  analysis.catCounts.slice(0, 10).forEach((c, i) => {
    ds[XLSX.utils.encode_cell({ r, c: 0 })] = numCell(i + 1, { center: true })
    ds[XLSX.utils.encode_cell({ r, c: 1 })] = textCell(c.name, { bold: true })
    ds['!merges'].push({ s: { r, c: 1 }, e: { r, c: 6 } })
    ds[XLSX.utils.encode_cell({ r, c: 7 })] = numCell(c.count, { bold: true, color: C.warn })
    ds['!merges'].push({ s: { r, c: 7 }, e: { r, c: 9 } })
    r += 1
  })

  // أكثر الـLeaders نشاطًا
  r += 1
  ds[XLSX.utils.encode_cell({ r, c: 0 })] = sectionTitle('نشاط الـ Leaders')
  ds['!merges'].push({ s: { r, c: 0 }, e: { r, c: 9 } })
  r += 1
  ds[XLSX.utils.encode_cell({ r, c: 0 })] = headerCell('#')
  ds[XLSX.utils.encode_cell({ r, c: 1 })] = headerCell('الـ Leader')
  ds['!merges'].push({ s: { r, c: 1 }, e: { r, c: 6 } })
  ds[XLSX.utils.encode_cell({ r, c: 7 })] = headerCell('عدد المخالفات')
  ds['!merges'].push({ s: { r, c: 7 }, e: { r, c: 9 } })
  r += 1
  analysis.leaderCounts.slice(0, 10).forEach((l, i) => {
    ds[XLSX.utils.encode_cell({ r, c: 0 })] = numCell(i + 1, { center: true })
    ds[XLSX.utils.encode_cell({ r, c: 1 })] = textCell(l.name, { bold: true })
    ds['!merges'].push({ s: { r, c: 1 }, e: { r, c: 6 } })
    ds[XLSX.utils.encode_cell({ r, c: 7 })] = numCell(l.count, { bold: true, color: C.success })
    ds['!merges'].push({ s: { r, c: 7 }, e: { r, c: 9 } })
    r += 1
  })

  ds['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(r - 1, 0), c: 9 } })
  XLSX.utils.book_append_sheet(wb, ds, 'Dashboard')

  // الشيتات التفصيلية
  buildDetailsSheet(wb, violations)
  buildStudentsSheet(wb, analysis.perStudent, analysis.catNames)
  buildCategoriesSheet(wb, analysis.catCounts)
  buildTypesSheet(wb, analysis.typeCounts)
  buildClassesSheet(wb, analysis.classCounts)
  buildLeadersSheet(wb, analysis.leaderCounts)

  return wb
}

// تنزيل الملف
export function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename)
}

// توليد وتنزيل دفعة واحدة
export function exportExcel(violations, { period, custom, filename }) {
  const wb = buildWorkbook(violations, { period, custom })
  downloadWorkbook(wb, filename || `تقرير_رصد_${new Date().getTime()}.xlsx`)
}
