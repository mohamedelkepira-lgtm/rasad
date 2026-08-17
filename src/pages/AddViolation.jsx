import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, CheckCircle2, UserRound, ClipboardList, StickyNote, Send, X, Home, Plus } from 'lucide-react'
import { searchStudents, fetchCategories, createViolation, fetchStudent } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { isSupabaseConfigured } from '../lib/supabase'

export default function AddViolation() {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [student, setStudent] = useState(null)
  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState(null)
  const [typeId, setTypeId] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const searchRef = useRef(null)
  const debounce = useRef(null)

  const preselectStudentId = searchParams.get('student')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    fetchCategories().then(setCategories).catch(() => setCategories([]))
    if (preselectStudentId) {
      fetchStudent(preselectStudentId)
        .then(setStudent)
        .catch(() => {})
    }
  }, [preselectStudentId])

  useEffect(() => {
    if (!preselectStudentId && !saved) searchRef.current?.focus()
  }, [preselectStudentId, saved])

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!query.trim() || student) {
      setResults([])
      return
    }
    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchStudents(query.trim())
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(debounce.current)
  }, [query, student])

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const types = selectedCategory?.violation_types || []

  const selectStudent = (s) => {
    setStudent(s)
    setQuery('')
    setResults([])
  }

  const pickCategory = (id) => {
    setCategoryId(id)
    setTypeId(null)
  }

  const handleSubmit = async () => {
    if (!student || !categoryId || !typeId) {
      toast('يرجى إكمال البيانات المطلوبة', 'error')
      return
    }
    setSubmitting(true)
    try {
      await createViolation({ student_id: student.id, category_id: categoryId, violation_type_id: typeId, note })
      setSaved(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      toast('تعذر تسجيل المخالفة — تحقق من الاتصال', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setSaved(false)
    setStudent(null)
    setCategoryId(null)
    setTypeId(null)
    setNote('')
    setQuery('')
    setTimeout(() => searchRef.current?.focus(), 100)
  }

  const steps = [
    { n: 1, label: 'الطالب', done: !!student },
    { n: 2, label: 'نوع المخالفة', done: !!typeId },
    { n: 3, label: 'الحفظ', done: saved }
  ]

  if (!isSupabaseConfigured) {
    return <div className="setup-notice"><b>تعذر الاتصال بالنظام.</b> راجع الإعدادات.</div>
  }

  return (
    <div>
      <div className="page-head">
        <h2 className="page-title">تسجيل مخالفة</h2>
      </div>

      {saved && (
        <div className="card success-card">
          <div className="success-icon"><CheckCircle2 size={34} /></div>
          <div className="success-title">تم تسجيل المخالفة بنجاح</div>
          <div className="small muted">للطالب: {student?.name} • الفصل: {student?.class_name}</div>
          <div className="success-actions">
            <button className="btn btn-green" onClick={reset}><Plus size={16} /> تسجيل مخالفة أخرى</button>
            <button className="btn btn-navy" onClick={() => navigate(`/students/${student.id}`)}><UserRound size={16} /> صفحة الطالب</button>
            <button className="btn btn-ghost" onClick={() => navigate('/')}><Home size={16} /> الرئيسية</button>
          </div>
        </div>
      )}

      {!saved && (
        <>
          <div className="steps">
            {steps.map((s) => (
              <div key={s.n} className={'step' + (s.done ? ' done' : '')}>
                <span className="step-dot">{s.done ? <CheckCircle2 size={14} /> : s.n}</span>
                <span className="step-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title"><UserRound size={16} /> 1. اختر الطالب</div>
            </div>

            {!student ? (
              <>
                <div className="search-box">
                  <Search size={16} />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ابحث باسم الطالب..."
                  />
                </div>
                {searching && <div className="loading" style={{ padding: 14 }}><div className="spinner" />بحث...</div>}
                {!searching && results.length === 0 && query.trim() && (
                  <div className="empty" style={{ padding: 18 }}><p>لا توجد نتائج مطابقة</p></div>
                )}
                {results.length > 0 && (
                  <div className="list">
                    {results.map((s) => (
                      <div className="student-row" key={s.id} onClick={() => selectStudent(s)}>
                        <div className="student-avatar-sm">{s.name.trim().charAt(0)}</div>
                        <div className="row-body">
                          <div className="row-title">{s.name}</div>
                          <div className="row-sub">{s.class_name}</div>
                        </div>
                        <span className="badge gray">اختيار</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="selected-student">
                <div className="student-avatar-sm">{student.name.trim().charAt(0)}</div>
                <div className="row-body">
                  <div className="row-title">{student.name}</div>
                  <div className="row-sub">الفصل: {student.class_name}</div>
                </div>
                <button className="mini-btn edit" onClick={() => setStudent(null)} title="تغيير الطالب">
                  <X size={15} />
                </button>
              </div>
            )}
          </div>

          {categories.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><ClipboardList size={16} /> 2. نوع المخالفة</div>
              </div>
              <div className="picker-group">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    className={'chip' + (categoryId === c.id ? ' active' : '')}
                    onClick={() => pickCategory(c.id)}
                    disabled={!student}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              {selectedCategory && (
                <div className="picker-group mb0">
                  {types.map((t) => (
                    <button
                      key={t.id}
                      className={'chip' + (typeId === t.id ? ' active' : '')}
                      onClick={() => setTypeId(t.id)}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div className="card-title"><StickyNote size={16} /> 3. ملاحظة (اختياري)</div>
            </div>
            <div className="field mb0">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="أي تفاصيل إضافية عن المخالفة..."
              />
            </div>
          </div>

          <button className="btn btn-green" disabled={submitting || !student || !categoryId || !typeId} onClick={handleSubmit}>
            <Send size={18} />
            {submitting ? 'جارٍ الحفظ...' : 'تسجيل المخالفة'}
          </button>
        </>
      )}
    </div>
  )
}
