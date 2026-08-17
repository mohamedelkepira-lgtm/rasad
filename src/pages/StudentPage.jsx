import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, AlertTriangle, ClipboardList, Plus, GraduationCap, Hash, CalendarDays, ChevronLeft } from 'lucide-react'
import { fetchStudent, fetchStudentViolations } from '../lib/api'
import { formatDate, formatTime, monthKey } from '../lib/utils'
import { isSupabaseConfigured } from '../lib/supabase'

export default function StudentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    try {
      const [st, v] = await Promise.all([fetchStudent(id), fetchStudentViolations(id)])
      setStudent(st)
      setViolations(v)
    } catch {
      setStudent(null)
      setViolations([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (!isSupabaseConfigured) {
    return <div className="setup-notice"><b>تعذر الاتصال بالنظام.</b> راجع الإعدادات.</div>
  }

  if (loading) {
    return <div className="loading"><div className="spinner" />جارٍ التحميل...</div>
  }

  if (!student) {
    return (
      <div>
        <button className="back-btn" onClick={() => navigate('/students')}><ArrowRight size={16} /> العودة للطلاب</button>
        <div className="card empty"><p>الطالب غير موجود</p></div>
      </div>
    )
  }

  const month = monthKey()
  const monthCount = violations.filter((v) => v.month_key === month).length
  const lastDate = violations[0]?.created_at

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/students')}><ArrowRight size={16} /> العودة للطلاب</button>

      <div className="card student-hero">
        <div className="student-avatar">{student.name?.trim()?.charAt(0) || 'ط'}</div>
        <div className="student-info">
          <div className="student-name">{student.name}</div>
          <div className="student-meta">
            <span><GraduationCap size={13} /> الفصل: {student.class_name}</span>
            {student.student_code && <span><Hash size={13} /> {student.student_code}</span>}
          </div>
        </div>
        <button className="btn btn-primary btn-sm hero-action" onClick={() => navigate(`/add?student=${student.id}`)}>
          <Plus size={15} /> تسجيل مخالفة
        </button>
      </div>

      <div className="stat-grid stat-grid-3">
        <div className="stat-card tone-warn">
          <div className="stat-icon"><AlertTriangle size={18} /></div>
          <div className="stat-value">{violations.length}</div>
          <div className="stat-label">إجمالي المخالفات</div>
        </div>
        <div className="stat-card tone-brand">
          <div className="stat-icon"><CalendarDays size={18} /></div>
          <div className="stat-value">{monthCount}</div>
          <div className="stat-label">هذا الشهر</div>
        </div>
        <div className="stat-card tone-info">
          <div className="stat-icon"><ClipboardList size={18} /></div>
          <div className="stat-value stat-value-sm">{lastDate ? formatDate(lastDate) : '—'}</div>
          <div className="stat-label">آخر مخالفة</div>
        </div>
      </div>

      <div className="section-title"><ClipboardList size={16} /> سجل المخالفات ({violations.length})</div>

      {violations.length === 0 ? (
        <div className="card empty"><p>لا توجد مخالفات مسجّلة لهذا الطالب</p></div>
      ) : (
        <div className="list-card">
          {violations.map((v) => (
            <div className="student-row" key={v.id} onClick={() => navigate(`/violations/${v.id}`)}>
              <div className="row-icon"><AlertTriangle size={16} /></div>
              <div className="row-body">
                <div className="row-title">{v.category?.name} / {v.type?.name}</div>
                <div className="row-sub">
                  <span>{formatDate(v.created_at)} • {formatTime(v.created_at)}</span>
                  <span className="badge gray">{v.leader?.name}</span>
                </div>
                {v.note && <div className="student-note">{v.note}</div>}
              </div>
              <ChevronLeft size={16} className="row-arrow" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
