import { useEffect, useState, useCallback, useMemo } from 'react'
import { BarChart3, Download, FileSpreadsheet, Users, CalendarDays, AlertTriangle, TrendingUp, Activity, FileBarChart2, Loader2, CalendarRange } from 'lucide-react'
import { fetchReport, fetchMonths, getLeaderActivity, fetchViolationsByRange } from '../lib/api'
import { monthKey, monthLabel, downloadCSV, todayStartISO, weekStartISO, monthStartISO, periodLabel, fileStamp } from '../lib/utils'
import { exportExcel } from '../lib/excel'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Reports() {
  const [months, setMonths] = useState([])
  const [month, setMonth] = useState(monthKey())
  const [report, setReport] = useState(null)
  const [leaderActivity, setLeaderActivity] = useState([])
  const [loading, setLoading] = useState(true)

  // فترة التصدير
  const [period, setPeriod] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    fetchMonths().then(setMonths).catch(() => setMonths([]))
  }, [])

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    try {
      const [rep, act] = await Promise.all([fetchReport(month), getLeaderActivity(month)])
      setReport(rep)
      setLeaderActivity(act)
    } catch {
      setReport([])
      setLeaderActivity([])
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    load()
  }, [load])

  const rows = report || []
  const total = rows.length
  const uniqueStudents = useMemo(() => new Set(rows.map((r) => r.student_id)).size, [rows])

  const { cats, catCounts } = useMemo(() => {
    const cc = {}
    const c = []
    rows.forEach((r) => {
      const name = r.category?.name || 'أخرى'
      if (!(name in cc)) { cc[name] = 0; c.push(name) }
      cc[name] += 1
    })
    return { cats: c, catCounts: cc }
  }, [rows])

  const studentRows = useMemo(() => {
    const perStudent = {}
    rows.forEach((r) => {
      const id = r.student_id
      if (!perStudent[id]) perStudent[id] = { name: r.student?.name || '—', class_name: r.student?.class_name || '—', total: 0, cats: {} }
      perStudent[id].total += 1
      const c = r.category?.name || 'أخرى'
      perStudent[id].cats[c] = (perStudent[id].cats[c] || 0) + 1
    })
    return Object.values(perStudent).sort((a, b) => b.total - a.total)
  }, [rows])

  const exportCSV = () => {
    const header = ['الطالب', 'الفصل', 'إجمالي المخالفات', ...cats]
    const data = [header]
    studentRows.forEach((s) => {
      data.push([s.name, s.class_name, s.total, ...cats.map((c) => s.cats[c] || 0)])
    })
    data.push([])
    data.push(['إجمالي الشهر', '', total, ...cats.map((c) => catCounts[c] || 0)])
    data.push(['عدد الطلاب المخالفين', '', uniqueStudents])
    downloadCSV(`تقرير_مخالفات_${month}.csv`, data)
  }

  // ---------- تصدير Excel احترافي (فترة زمنية) ----------
  const resolveRange = (p) => {
    if (p === 'today') {
      return { from: todayStartISO(), to: new Date().toISOString(), custom: {} }
    }
    if (p === 'week') {
      return { from: weekStartISO(), to: new Date().toISOString(), custom: {} }
    }
    if (p === 'custom') {
      if (!customFrom || !customTo) return { error: 'اختر تاريخ البداية والنهاية أولًا' }
      const f = new Date(customFrom); f.setHours(0, 0, 0, 0)
      const t = new Date(customTo); t.setHours(23, 59, 59, 999)
      if (f > t) return { error: 'تاريخ البداية بعد تاريخ النهاية' }
      return { from: f.toISOString(), to: t.toISOString(), custom: { from: customFrom, to: customTo } }
    }
    // month
    return { from: monthStartISO(), to: new Date().toISOString(), custom: {} }
  }

  const handleExport = async (p = period) => {
    if (!isSupabaseConfigured || exporting) return
    const range = resolveRange(p)
    if (range.error) { alert(range.error); return }
    setExporting(true)
    try {
      const data = await fetchViolationsByRange(range.from, range.to)
      const label = periodLabel(p, range.custom)
      exportExcel(data, {
        period: p,
        custom: range.custom,
        filename: `رصد_${label}_${fileStamp()}.xlsx`
      })
    } catch (err) {
      alert('فشل تصدير التقرير: ' + (err.message || 'خطأ غير متوقع'))
    } finally {
      setExporting(false)
    }
  }

  if (!isSupabaseConfigured) {
    return <div className="setup-notice"><b>تعذر الاتصال بالنظام.</b> راجع الإعدادات.</div>
  }

  return (
    <div>
      <div className="page-head">
        <h2 className="page-title">التقارير الشهرية</h2>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><FileBarChart2 size={16} /> تصدير تقرير Excel احترافي</div>
        </div>
        <div className="export-period-group">
          {[
            { id: 'today', label: 'اليوم' },
            { id: 'week', label: 'هذا الأسبوع' },
            { id: 'month', label: 'هذا الشهر' },
            { id: 'custom', label: 'فترة مخصصة' }
          ].map((opt) => (
            <button
              key={opt.id}
              className={'chip' + (period === opt.id ? ' active' : '')}
              onClick={() => setPeriod(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="custom-range-row">
            <div className="field">
              <label className="field-label">من</label>
              <input type="date" className="month-input" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">إلى</label>
              <input type="date" className="month-input" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </div>
        )}
        <div className="export-actions">
          <button className="btn btn-navy" onClick={() => handleExport(period)} disabled={exporting}>
            {exporting ? <Loader2 size={16} className="spin" /> : <FileBarChart2 size={16} />}
            {exporting ? 'جارٍ توليد الملف...' : 'تصدير التقرير'}
          </button>
          <button className="btn btn-primary" onClick={() => handleExport('month')} disabled={exporting}>
            <CalendarRange size={16} /> تقرير الشهر
          </button>
        </div>
        <p className="export-hint">يُولَّد ملف Excel يحتوي Dashboard إحصائيًا وجداول تفصيلية وفلاتر جاهزة.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><CalendarDays size={16} /> الشهر</div>
        </div>
        <div className="picker-group">
          {months.length > 0 ? (
            months.map((m) => (
              <button key={m} className={'chip' + (month === m ? ' active' : '')} onClick={() => setMonth(m)}>
                {monthLabel(m)}
              </button>
            ))
          ) : (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="month-input"
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />جارٍ تحميل التقرير...</div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card tone-warn">
              <div className="stat-icon"><AlertTriangle size={20} /></div>
              <div className="stat-value">{total}</div>
              <div className="stat-label">إجمالي المخالفات</div>
            </div>
            <div className="stat-card tone-brand">
              <div className="stat-icon"><Users size={20} /></div>
              <div className="stat-value">{uniqueStudents}</div>
              <div className="stat-label">الطلاب المخالفون</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title"><BarChart3 size={16} /> المخالفات حسب التصنيف</div>
            </div>
            {cats.length === 0 ? (
              <div className="empty"><p>لا توجد بيانات لهذا الشهر</p></div>
            ) : (
              <div className="list">
                {cats.map((c) => (
                  <div className="row" key={c} style={{ cursor: 'default' }}>
                    <div className="row-icon"><FileSpreadsheet size={16} /></div>
                    <div className="row-body"><div className="row-title">{c}</div></div>
                    <div className="row-meta"><span className="badge">{catCounts[c]}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title"><Activity size={16} /> نشاط الـLeaders</div>
            </div>
            {leaderActivity.length === 0 ? (
              <div className="empty"><p>لا توجد تسجيلات هذا الشهر</p></div>
            ) : (
              <div className="list">
                {leaderActivity.map((l, i) => (
                  <div className="row" key={i} style={{ cursor: 'default' }}>
                    <div className="rank-badge">{i + 1}</div>
                    <div className="row-body"><div className="row-title">{l.name}</div></div>
                    <div className="row-meta"><span className="badge">{l.count} تسجيل</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title"><TrendingUp size={16} /> الطلاب حسب عدد المخالفات</div>
              <button className="btn btn-navy btn-sm" onClick={exportCSV} disabled={rows.length === 0}>
                <Download size={15} /> تصدير Excel
              </button>
            </div>
            {rows.length === 0 ? (
              <div className="empty"><p>لا توجد بيانات لهذا الشهر</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>الطالب</th>
                      <th>الفصل</th>
                      <th>الإجمالي</th>
                      {cats.map((c) => <th key={c}>{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {studentRows.map((s, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{s.name}</td>
                        <td>{s.class_name}</td>
                        <td style={{ fontWeight: 800, color: 'var(--brand-600)' }}>{s.total}</td>
                        {cats.map((c) => <td key={c}>{s.cats[c] || 0}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
