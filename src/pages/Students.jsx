import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus, Users, Pencil, CheckCircle2, XCircle, ChevronLeft, ChevronDown } from 'lucide-react'
import { getStudentsWithCounts, addStudent, updateStudent } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { monthKey } from '../lib/utils'
import { isSupabaseConfigured } from '../lib/supabase'

const PAGE_SIZE = 50

export default function Students() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [filtered, setFiltered] = useState([])
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', class_name: '', student_code: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    try {
      const data = await getStudentsWithCounts(monthKey())
      setStudents(data)
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [q])

  useEffect(() => {
    const t = q.trim().toLowerCase()
    if (!t) {
      setFiltered(students)
      return
    }
    setFiltered(students.filter((s) => s.name.toLowerCase().includes(t) || s.class_name.toLowerCase().includes(t)))
  }, [q, students])

  // عرض تدريجي لتقليل الضغط على الـ DOM في القوائم الكبيرة
  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible])
  const hasMore = filtered.length > visible

  const openAdd = () => {
    setForm({ name: '', class_name: '', student_code: '' })
    setModal({ mode: 'add' })
  }

  const openEdit = (student) => {
    setForm({ name: student.name, class_name: student.class_name, student_code: student.student_code || '' })
    setModal({ mode: 'edit', student })
  }

  const save = async () => {
    if (!form.name.trim() || !form.class_name.trim()) {
      toast('الاسم والفصل مطلوبان', 'error')
      return
    }
    setSaving(true)
    try {
      if (modal.mode === 'add') {
        await addStudent({ name: form.name.trim(), class_name: form.class_name.trim(), student_code: form.student_code.trim() || null })
        toast('تمت إضافة الطالب ✓')
      } else {
        await updateStudent(modal.student.id, { name: form.name.trim(), class_name: form.class_name.trim(), student_code: form.student_code.trim() || null })
        toast('تم حفظ التعديلات ✓')
      }
      setModal(null)
      load()
    } catch {
      toast('تعذر الحفظ — تحقق من الصلاحية أو الاتصال', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (s) => {
    try {
      await updateStudent(s.id, { active: !s.active })
      toast(s.active ? 'تم تعطيل الطالب' : 'تم تفعيل الطالب')
      load()
    } catch {
      toast('تعذر التعديل', 'error')
    }
  }

  if (!isSupabaseConfigured) {
    return <div className="setup-notice"><b>تعذر الاتصال بالنظام.</b> راجع الإعدادات.</div>
  }

  return (
    <div>
      <div className="page-head">
        <h2 className="page-title">الطلاب</h2>
        <span className="count-pill">{students.length}</span>
        <div className="spacer" />
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <UserPlus size={15} /> إضافة طالب
          </button>
        )}
      </div>

      <div className="search-box">
        <Search size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الفصل..." />
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="card empty"><p>لا يوجد طلاب مطابقون</p></div>
      ) : (
        <div className="list-card">
          {shown.map((s) => (
            <div className="student-row" key={s.id} onClick={() => navigate(`/students/${s.id}`)}>
              <div className="student-avatar-sm">{s.name.trim().charAt(0)}</div>
              <div className="row-body">
                <div className="row-title">
                  {s.name} {!s.active && <span className="badge red">معطّل</span>}
                </div>
                <div className="row-sub">
                  الفصل: {s.class_name}{s.student_code ? ` • ${s.student_code}` : ''}
                </div>
              </div>
              <div className="row-meta">
                <span className={`badge ${s.month_count > 0 ? '' : 'gray'}`}>{s.month_count} هذا الشهر</span>
              </div>
              {isAdmin && (
                <div className="row-actions">
                  <button className="mini-btn edit" onClick={(e) => { e.stopPropagation(); openEdit(s) }} title="تعديل">
                    <Pencil size={14} />
                  </button>
                  <button className={`mini-btn ${s.active ? 'off' : 'on'}`} onClick={(e) => { e.stopPropagation(); toggleActive(s) }} title={s.active ? 'تعطيل' : 'تفعيل'}>
                    {s.active ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                  </button>
                </div>
              )}
              <ChevronLeft size={16} className="row-arrow" />
            </div>
          ))}
          {hasMore && (
            <button className="btn btn-ghost btn-sm load-more-btn" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              <ChevronDown size={15} /> عرض المزيد ({filtered.length - visible})
            </button>
          )}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{modal.mode === 'add' ? 'إضافة طالب جديد' : 'تعديل بيانات الطالب'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="field">
              <label>اسم الطالب</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: أحمد محمد" />
            </div>
            <div className="field">
              <label>الفصل</label>
              <input value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} placeholder="مثال: 2-A" />
            </div>
            <div className="field">
              <label>الرمز (اختياري)</label>
              <input value={form.student_code} onChange={(e) => setForm({ ...form, student_code: e.target.value })} placeholder="مثال: 1001" />
            </div>
            <button className="btn btn-primary" disabled={saving} onClick={save}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
