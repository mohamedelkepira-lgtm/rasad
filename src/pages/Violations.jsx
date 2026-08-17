import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListChecks, Search, AlertTriangle, Filter, ChevronDown } from 'lucide-react'
import { fetchViolations, fetchCategories } from '../lib/api'
import { timeAgo, monthKey } from '../lib/utils'
import { isSupabaseConfigured } from '../lib/supabase'

const PAGE_SIZE = 50

function isToday(iso) {
  const d = new Date(iso)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function isThisWeek(iso) {
  const d = new Date(iso).getTime()
  return Date.now() - d <= 7 * 24 * 60 * 60 * 1000
}

export default function Violations() {
  const navigate = useNavigate()
  const [all, setAll] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [period, setPeriod] = useState('all')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    try {
      const [v, c] = await Promise.all([fetchViolations({ page: 0, pageSize: 200 }), fetchCategories()])
      setAll(v)
      setCategories(c)
    } catch {
      setAll([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [q, cat, period])

  const filtered = useMemo(() => {
    const mk = monthKey()
    return all.filter((v) => {
      if (cat !== 'all' && v.category?.name !== cat) return false
      if (period === 'today' && !isToday(v.created_at)) return false
      if (period === 'week' && !isThisWeek(v.created_at)) return false
      if (period === 'month' && v.month_key !== mk) return false
      if (q.trim()) {
        const t = q.trim().toLowerCase()
        const hay = `${v.student?.name || ''} ${v.student?.class_name || ''}`.toLowerCase()
        if (!hay.includes(t)) return false
      }
      return true
    })
  }, [all, cat, period, q])

  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible])
  const hasMore = filtered.length > visible

  if (!isSupabaseConfigured) {
    return <div className="setup-notice"><b>تعذر الاتصال بالنظام.</b> راجع الإعدادات.</div>
  }

  return (
    <div>
      <div className="page-head">
        <h2 className="page-title">المخالفات</h2>
        <span className="count-pill">{filtered.length}</span>
        <div className="spacer" />
        <span className="filter-hint"><Filter size={13} /> تصفية</span>
      </div>

      <div className="search-box">
        <Search size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم الطالب..." />
      </div>

      <div className="filter-group">
        <div className="filter-label">النوع</div>
        <div className="chip-row">
          <button className={'chip' + (cat === 'all' ? ' active' : '')} onClick={() => setCat('all')}>الكل</button>
          {categories.map((c) => (
            <button key={c.id} className={'chip' + (cat === c.name ? ' active' : '')} onClick={() => setCat(c.name)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <div className="filter-label">الفترة</div>
        <div className="chip-row">
          {[['all', 'الكل'], ['today', 'اليوم'], ['week', 'هذا الأسبوع'], ['month', 'هذا الشهر']].map(([k, lbl]) => (
            <button key={k} className={'chip' + (period === k ? ' active' : '')} onClick={() => setPeriod(k)}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="card empty">
          <ListChecks size={40} />
          <p>لا توجد مخالفات مطابقة</p>
        </div>
      ) : (
        <div className="list-card">
          {shown.map((v) => (
            <div className="student-row" key={v.id} onClick={() => navigate(`/violations/${v.id}`)}>
              <div className="row-icon"><AlertTriangle size={16} /></div>
              <div className="row-body">
                <div className="row-title">
                  {v.student?.name} <span className="faint">• {v.student?.class_name}</span>
                </div>
                <div className="row-sub">
                  <span>{v.category?.name} / {v.type?.name}</span>
                  <span className="badge gray">تسجيل: {v.leader?.name}</span>
                </div>
              </div>
              <div className="row-meta"><div className="time">{timeAgo(v.created_at)}</div></div>
            </div>
          ))}
          {hasMore && (
            <button className="btn btn-ghost btn-sm load-more-btn" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              <ChevronDown size={15} /> عرض المزيد ({filtered.length - visible})
            </button>
          )}
        </div>
      )}
    </div>
  )
}
