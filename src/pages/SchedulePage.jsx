import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Clock, Plus,
  RefreshCw, UserRound, AlertTriangle, X
} from 'lucide-react'
import {
  fetchScheduleMonth, fetchLeadersList, generateScheduleMonth,
  regenerateScheduleMonth, replaceAssignmentLeader, confirmMyAttendance
} from '../lib/api'
import { toISODate } from '../lib/scheduleGen'
import { monthLabel } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const SLOT_LABELS = { 1: 'القائد الأول', 2: 'القائد الثاني', 3: 'القائد الثالث' }

function parseISO(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function weekdayAr(ds) {
  return parseISO(ds).toLocaleDateString('ar-EG', { weekday: 'long' })
}
function dateAr(ds) {
  return parseISO(ds).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })
}

export default function SchedulePage() {
  const { profile, isAdmin } = useAuth()
  const { toast } = useToast()

  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 })
  const [days, setDays] = useState([])
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [openDay, setOpenDay] = useState(null)

  const todayStr = toISODate(new Date())
  const myId = profile?.id
  const key = `${ym.y}-${ym.m}`

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchScheduleMonth(ym.y, ym.m)
      setDays(data || [])
    } catch {
      setDays([])
      toast('تعذر تحميل جدول المناوبات', 'error')
    } finally {
      setLoading(false)
    }
  }, [ym.y, ym.m, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!isAdmin) return
    fetchLeadersList().then(setLeaders).catch(() => setLeaders([]))
  }, [isAdmin])

  const totalDaysInMonth = useMemo(() => new Date(ym.y, ym.m, 0).getDate(), [key])
  const isComplete = days.length >= totalDaysInMonth

  const summary = useMemo(() => {
    let confirmed = 0
    let pending = 0
    for (const d of days) {
      for (const a of d.assignments || []) {
        if (a.attendance?.status === 'PRESENT') confirmed++
        else pending++
      }
    }
    const upcoming = days.filter((d) => d.duty_date >= todayStr)
    return { scheduledDays: days.length, confirmed, pending, nearest: upcoming[0] || null }
  }, [days, todayStr])

  const shiftMonth = (delta) => {
    let y = ym.y
    let m = ym.m + delta
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setYm({ y, m })
  }

  const handleGenerate = async () => {
    setBusy(true)
    try {
      const res = await generateScheduleMonth(ym.y, ym.m)
      await load()
      toast(res.created ? `تم إنشاء جدول ${monthLabel(key)} وتوزيع ${res.created} يوم ✅` : 'الجدول مكتمل بالفعل لهذا الشهر', 'success')
    } catch (e) {
      toast(e?.message || 'تعذر إنشاء الجدول', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleRegenerate = async () => {
    if (!window.confirm(`سيتم حذف جدول ${monthLabel(key)} بالكامل مع سجلات حضوره وإعادة توزيع المناوبات من جديد. هل أنت متأكد؟`)) return
    setBusy(true)
    try {
      await regenerateScheduleMonth(ym.y, ym.m)
      await load()
      toast('تمت إعادة إنشاء الجدول بالكامل ✅', 'success')
    } catch (e) {
      toast(e?.message || 'تعذر إعادة إنشاء الجدول', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleSwap = async (dayObj, assignment, newLeaderId) => {
    if (!newLeaderId) return
    const leader = leaders.find((l) => l.id === newLeaderId)
    if (!window.confirm(`استبدال ${assignment.leader?.name} بـ${leader?.name} في يوم ${dateAr(dayObj.duty_date)}؟`)) return
    setBusy(true)
    try {
      await replaceAssignmentLeader(assignment.id, newLeaderId)
      await load()
      toast('تم استبدال القائد في هذه المناوبة ✅', 'success')
    } catch (e) {
      const msg = /duplicate|unique/i.test(e?.message || '')
        ? 'هذا القائد موجود بالفعل في نفس اليوم'
        : (e?.message || 'تعذر الاستبدال')
      toast(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleConfirm = async () => {
    const day = days.find((d) => d.duty_date === openDay)
    const mine = day?.assignments?.find((a) => a.leader_id === myId)
    if (!mine) return
    setBusy(true)
    try {
      await confirmMyAttendance(mine.id)
      await load()
      toast('تم تأكيد حضور المناوبة بنجاح ✅', 'success')
    } catch (e) {
      const msg = /duplicate|unique/i.test(e?.message || '')
        ? 'تم تسجيل حضورك بالفعل لهذا اليوم.'
        : (e?.message || 'تعذر تأكيد الحضور')
      toast(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  const modalDay = days.find((d) => d.duty_date === openDay) || null
  const assignedIds = new Set((modalDay?.assignments || []).map((a) => a.leader_id))
  const swapOptions = leaders.filter((l) => !assignedIds.has(l.id))

  return (
    <div className="sched-page">
      <div className="sched-toolbar">
        <div className="sched-month-nav">
          <button className="sched-nav-btn" onClick={() => shiftMonth(-1)} aria-label="الشهر السابق">
            <ChevronRight size={18} />
          </button>
          <div className="sched-month-title">
            <CalendarDays size={17} />
            <span>{monthLabel(key)}</span>
          </div>
          <button className="sched-nav-btn" onClick={() => shiftMonth(1)} aria-label="الشهر القادم">
            <ChevronLeft size={18} />
          </button>
        </div>

        {isAdmin && (
          <div className="sched-admin-actions">
            {!isComplete && (
              <button className="btn btn-primary sched-gen-btn" disabled={busy} onClick={handleGenerate}>
                <Plus size={16} strokeWidth={2.6} />
                {days.length ? 'استكمال الأيام الناقصة' : 'إنشاء جدول الشهر'}
              </button>
            )}
            {days.length > 0 && (
              <button className="sched-regen" disabled={busy} onClick={handleRegenerate} title="إعادة إنشاء كامل">
                <RefreshCw size={14} />
                إعادة إنشاء كامل
              </button>
            )}
          </div>
        )}
      </div>

      {isAdmin && days.length > 0 && (
        <div className="sched-summary">
          <span className="sched-stat"><b>{summary.scheduledDays}</b> يوم مجدول</span>
          <span className="sched-stat ok"><CheckCircle2 size={13} /> {summary.confirmed} أكدوا الحضور</span>
          <span className="sched-stat warn"><Clock size={13} /> {summary.pending} لم يسجلوا</span>
          {summary.nearest && (
            <span className="sched-stat near">أقرب مناوبة: {weekdayAr(summary.nearest.duty_date)} {dateAr(summary.nearest.duty_date)}</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner" />جارٍ تحميل الجدول...</div>
      ) : days.length === 0 ? (
        <div className="card empty sched-empty">
          <CalendarDays size={30} strokeWidth={1.6} />
          <p>لا يوجد جدول مناوبات لشهر {monthLabel(key)} بعد</p>
          {isAdmin ? (
            <button className="btn btn-primary" disabled={busy} onClick={handleGenerate}>
              <Plus size={16} strokeWidth={2.6} /> إنشاء جدول الشهر
            </button>
          ) : (
            <p className="faint">سيظهر هنا بمجرد نشر الإدارة للجدول</p>
          )}
        </div>
      ) : (
        <div className="sched-list">
          {days.map((d) => {
            const isToday = d.duty_date === todayStr
            const mine = (d.assignments || []).find((a) => a.leader_id === myId)
            return (
              <button
                key={d.id}
                className={'sched-day' + (isToday ? ' today' : '') + (mine ? ' mine' : '')}
                onClick={() => setOpenDay(d.duty_date)}
              >
                <div className="sched-day-head">
                  <span className="sched-weekday">{weekdayAr(d.duty_date)}</span>
                  <span className="sched-date">{dateAr(d.duty_date)}</span>
                  {isToday && <span className="badge brand">اليوم</span>}
                  {mine && !isToday && <span className="badge green">مناوبتي</span>}
                </div>
                <div className="sched-chips">
                  {(d.assignments || []).sort((a, b) => a.slot - b.slot).map((a) => (
                    <span className={'chip' + (a.leader_id === myId ? ' chip-me' : '')} key={a.id}>
                      <UserRound size={12} />
                      {a.leader?.name || '—'}
                      {a.attendance?.status === 'PRESENT' && <CheckCircle2 size={12} className="chip-check" />}
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {modalDay && (
        <div className="modal-overlay qr-zoom-overlay" onClick={() => setOpenDay(null)}>
          <div className="modal qr-zoom-modal sched-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">مناوبة يوم {weekdayAr(modalDay.duty_date)} {dateAr(modalDay.duty_date)}</div>
              <button className="modal-close" onClick={() => setOpenDay(null)} aria-label="إغلاق"><X size={18} /></button>
            </div>

            <div className="sched-rows">
              {(modalDay.assignments || []).sort((a, b) => a.slot - b.slot).map((a) => {
                const att = a.attendance
                const isMine = a.leader_id === myId
                return (
                  <div className={'sched-row' + (isMine ? ' mine' : '')} key={a.id}>
                    <div className="sched-row-main">
                      <span className="sched-slot">{SLOT_LABELS[a.slot]}</span>
                      <span className="sched-name">{a.leader?.name || '—'}</span>
                      {att?.status === 'PRESENT' ? (
                        <span className="sched-badge present"><CheckCircle2 size={13} /> حاضر</span>
                      ) : att?.status === 'ABSENT' ? (
                        <span className="sched-badge absent"><AlertTriangle size={13} /> غائب</span>
                      ) : (
                        <span className="sched-badge pending"><Clock size={13} /> لم يسجل</span>
                      )}
                    </div>
                    {att?.confirmed_at && (
                      <div className="sched-time">
                        أكد الحضور: {new Date(att.confirmed_at).toLocaleString('ar-EG', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    {isAdmin && (
                      <select
                        className="sched-swap"
                        value=""
                        disabled={busy}
                        onChange={(e) => handleSwap(modalDay, a, e.target.value)}
                      >
                        <option value="">استبدال بقائد آخر...</option>
                        {swapOptions.map((l) => (
                          <option value={l.id} key={l.id}>{l.name}</option>
                        ))}
                      </select>
                    )}
                    {isMine && modalDay.duty_date === todayStr && !att && (
                      <button className="btn btn-primary sched-confirm" disabled={busy} onClick={handleConfirm}>
                        <CheckCircle2 size={15} /> تأكيد حضور المناوبة
                      </button>
                    )}
                  </div>
                )
              })}
              {(modalDay.assignments || []).length === 0 && (
                <div className="empty"><p>لا يوجد قادة مكلفين بهذا اليوم</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
