import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Users, CalendarDays, Megaphone, Search, TrendingUp, ChevronLeft, Plus, ShieldCheck, UserRound, ClipboardList, BarChart3, CheckCircle2, BellRing } from 'lucide-react'
import { getDashboardStats, searchStudents, fetchTodayDuty, fetchMyNextDuty, confirmMyAttendance } from '../lib/api'
import { timeAgo } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { isSupabaseConfigured } from '../lib/supabase'

function dutyDateLabel(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function Home() {
  const { profile, isAdmin } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [focused, setFocused] = useState(false)
  const debounce = useRef(null)

  // مناوبتي (للقائد فقط)
  const [duty, setDuty] = useState(undefined) // undefined=تحميل، null=لا يوجد، object=يوم اليوم
  const [nextDuty, setNextDuty] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const firstName = profile?.name?.split(' ')[0] || 'مستخدم'
  const todayLabel = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })

  const load = useCallback(async () => {
    // الإحصائيات وسجل المخالفات للأدمن فقط — القائد يسجل المخالفات فقط
    if (!isSupabaseConfigured || !isAdmin) {
      setLoading(false)
      setStats(null)
      return
    }
    setLoading(true)
    try {
      setStats(await getDashboardStats())
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    load()
  }, [load])

  // جدول المناوبة للقائد: هل أنا مكلف اليوم؟ وما أقرب مناوبة قادمة؟
  const loadDuty = useCallback(async () => {
    if (!isSupabaseConfigured || isAdmin || !profile?.id) {
      setDuty(null)
      setNextDuty(null)
      return
    }
    try {
      const [today, next] = await Promise.all([fetchTodayDuty(), fetchMyNextDuty(profile.id)])
      setDuty(today)
      // أقرب مناوبة قادمة — نتجاهلها إن كانت مناوبة اليوم نفسه
      const mineToday = today?.assignments?.some((a) => a.leader_id === profile.id)
      setNextDuty(mineToday ? null : next)
    } catch {
      setDuty(null)
      setNextDuty(null)
    }
  }, [isAdmin, profile?.id])

  useEffect(() => {
    loadDuty()
  }, [loadDuty])

  const handleConfirmDuty = async () => {
    const mine = duty?.assignments?.find((a) => a.leader_id === profile?.id)
    if (!mine) return
    setConfirming(true)
    try {
      await confirmMyAttendance(mine.id)
      await loadDuty()
      toast('تم تأكيد حضور المناوبة بنجاح ✅', 'success')
    } catch (e) {
      const msg = /duplicate|unique/i.test(e?.message || '')
        ? 'تم تسجيل حضورك بالفعل لهذا اليوم.'
        : (e?.message || 'تعذر تأكيد الحضور')
      toast(msg, 'error')
    } finally {
      setConfirming(false)
    }
  }

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!q.trim()) {
      setResults([])
      return
    }
    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        setResults(await searchStudents(q.trim()))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(debounce.current)
  }, [q])

  const goStudent = (id) => {
    setQ('')
    setResults([])
    setFocused(false)
    navigate(`/students/${id}`)
  }

  const myAssignment = duty?.assignments?.find((a) => a.leader_id === profile?.id) || null
  const myAttendance = myAssignment?.attendance || null
  const teammates = (duty?.assignments || [])
    .filter((a) => a.leader_id !== profile?.id)
    .map((a) => a.leader?.name)
    .filter(Boolean)
  const matesLabel = teammates.length ? ` — معك: ${teammates.join(' + ')}` : ''

  if (!isSupabaseConfigured) {
    return <div className="setup-notice"><b>تعذر الاتصال بالنظام.</b> راجع الإعدادات.</div>
  }

  const statItems = isAdmin
    ? [
        { label: 'مخالفات اليوم', value: stats?.todayCount ?? 0, icon: <AlertTriangle size={18} />, tone: 'warn' },
        { label: 'هذا الشهر', value: stats?.monthCount ?? 0, icon: <CalendarDays size={18} />, tone: 'brand' },
        { label: 'طلاب مخالفون اليوم', value: stats?.todayStudents ?? 0, icon: <Users size={18} />, tone: 'info' },
        { label: 'قادة نشطون اليوم', value: stats?.todayLeaders ?? 0, icon: <Megaphone size={18} />, tone: 'violet' }
      ]
    : [
        { label: 'مخالفات اليوم', value: stats?.todayCount ?? 0, icon: <AlertTriangle size={18} />, tone: 'warn' },
        { label: 'هذا الشهر', value: stats?.monthCount ?? 0, icon: <CalendarDays size={18} />, tone: 'brand' },
        { label: 'طلاب مخالفون اليوم', value: stats?.todayStudents ?? 0, icon: <Users size={18} />, tone: 'info' },
        { label: 'سجلاتي هذا الشهر', value: stats?.myMonth ?? 0, icon: <UserRound size={18} />, tone: 'green' }
      ]

  return (
    <div>
      <div className="home-greeting">
        <div>
          <div className="home-hello">أهلاً، {firstName}</div>
          <div className="home-date">{todayLabel}</div>
        </div>
        <div className={`role-pill ${isAdmin ? 'admin' : 'leader'}`}>
          {isAdmin ? <ShieldCheck size={13} /> : <UserRound size={13} />}
          {isAdmin ? 'مدير النظام' : 'قائد'}
        </div>
      </div>

      {!isAdmin && (
        <button className="quick-action" onClick={() => navigate('/add')}>
          <span className="quick-icon"><Plus size={22} strokeWidth={2.6} /></span>
          <span className="quick-text">
            <span className="quick-title">تسجيل مخالفة</span>
            <span className="quick-sub">اختر الطالب ونوع المخالفة بخطوات قليلة</span>
          </span>
          <ChevronLeft size={18} className="quick-arrow" />
        </button>
      )}

      <div className="search-wrap">
        <div className={'big-search' + (focused || q ? ' big-search-focus' : '')}>
          <Search size={20} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="ابحث عن طالب..."
          />
        </div>
        {(focused || q) && results.length > 0 && (
          <div className="search-results">
            {results.map((s) => (
              <div className="search-result" key={s.id} onMouseDown={() => goStudent(s.id)}>
                <div className="search-avatar">{s.name.charAt(0)}</div>
                <div className="search-body">
                  <div className="search-name">{s.name}</div>
                  <div className="search-sub">{s.class_name}</div>
                </div>
                <ChevronLeft size={16} />
              </div>
            ))}
          </div>
        )}
        {(focused || q) && searching && <div className="loading" style={{ padding: 16 }}><div className="spinner" />بحث...</div>}
      </div>

      {loading || (isAdmin && !stats) ? (
        <div className="loading"><div className="spinner" />جارٍ تحميل البيانات...</div>
      ) : !isAdmin ? (
        <>
          {duty === undefined ? (
            <div className="loading"><div className="spinner" />جارٍ التحقق من المناوبة...</div>
          ) : myAssignment ? (
            myAttendance ? (
              <div className="duty-card done">
                <div className="duty-head"><CheckCircle2 size={18} /> تم تأكيد حضورك اليوم بنجاح ✅</div>
                <div className="duty-sub">
                  {myAttendance.confirmed_at
                    ? `سُجل الحضور الساعة ${new Date(myAttendance.confirmed_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
                    : 'سُجل حضورك لهذا اليوم'}
                  {matesLabel}
                </div>
              </div>
            ) : (
              <div className="duty-card alert">
                <div className="duty-head"><BellRing size={18} /> لديك مناوبة اليوم على البوابة</div>
                <div className="duty-sub">أنت مُكلّف بالمناوبة اليوم{matesLabel}</div>
                <button className="btn btn-primary" disabled={confirming} onClick={handleConfirmDuty}>
                  <CheckCircle2 size={16} /> تأكيد حضور المناوبة
                </button>
              </div>
            )
          ) : duty ? (
            <div className="duty-card warn">
              <div className="duty-head"><AlertTriangle size={17} /> أنت غير مُكلّف بالمناوبة اليوم ⚠️</div>
              <div className="duty-sub">لا يمكنك تسجيل حضور البوابة لهذا اليوم لأن المناوبة ليست مسجلة باسمك.</div>
            </div>
          ) : (
            <div className="duty-card muted">
              <div className="duty-head"><CalendarDays size={17} /> لا توجد مناوبة لك اليوم</div>
              <div className="duty-sub">راجع جدول الليدرز لمعرفة مناوباتك القادمة</div>
            </div>
          )}

          {nextDuty && (
            <button className="duty-card next" onClick={() => navigate('/schedule')}>
              <span className="duty-next-inner">
                <span className="duty-head"><CalendarDays size={17} /> مناوبتي القادمة</span>
                <span className="duty-sub">
                  📅 {dutyDateLabel(nextDuty.duty_date)} — {(nextDuty.assignments || []).map((a) => a.leader?.name).filter(Boolean).join(' + ')}
                </span>
              </span>
              <ChevronLeft size={16} className="quick-arrow" />
            </button>
          )}
        </>
      ) : (
        <>
          <div className="stat-grid">
            {statItems.map((s) => (
              <div className={`stat-card tone-${s.tone}`} key={s.label}>
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="admin-tools">
              <div className="admin-tools-title"><ShieldCheck size={15} /> أدوات الإدارة</div>
              <div className="admin-tools-row">
                <button onClick={() => navigate('/students')}><Users size={17} /> إدارة الطلاب</button>
                <button onClick={() => navigate('/reports')}><BarChart3 size={17} /> التقارير الشهرية</button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div className="card-title"><ClipboardList size={16} /> أحدث المخالفات</div>
              <button className="link-btn" onClick={() => navigate('/violations')}>عرض الكل</button>
            </div>
            {(stats?.recent?.length ?? 0) === 0 ? (
              <div className="empty"><p>لا توجد مخالفات مسجّلة بعد</p></div>
            ) : (
              <div className="list">
                {stats.recent.map((v) => (
                  <div className="row" key={v.id} onClick={() => navigate(`/violations/${v.id}`)}>
                    <div className="row-icon"><AlertTriangle size={16} /></div>
                    <div className="row-body">
                      <div className="row-title">
                        {v.student?.name} <span className="faint">• {v.student?.class_name}</span>
                      </div>
                      <div className="row-sub">
                        <span>{v.category?.name} / {v.type?.name}</span>
                        <span className="badge gray">{v.leader?.name}</span>
                      </div>
                    </div>
                    <div className="row-meta"><div className="time">{timeAgo(v.created_at)}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(stats?.topStudents?.length ?? 0) > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><TrendingUp size={16} /> أكثر الطلاب هذا الشهر</div>
                <button className="link-btn" onClick={() => navigate('/students')}>الطلاب</button>
              </div>
              <div className="list">
                {stats.topStudents.map((t, i) => (
                  <div className="row" key={i} onClick={() => t.id && navigate(`/students/${t.id}`)}>
                    <div className="rank-badge">{i + 1}</div>
                    <div className="row-body">
                      <div className="row-title">{t.name} <span className="faint">• {t.class_name}</span></div>
                    </div>
                    <div className="row-meta"><span className="badge red">{t.count} مخالفة</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
