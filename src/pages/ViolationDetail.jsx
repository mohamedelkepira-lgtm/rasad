import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, Pencil, Trash2, Save, X, CheckCircle2, ArrowRight, StickyNote } from 'lucide-react'
import { fetchViolation, fetchCategories, updateViolation, deleteViolation } from '../lib/api'
import { formatDateTime } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { isSupabaseConfigured } from '../lib/supabase'

export default function ViolationDetail() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [violation, setViolation] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [editType, setEditType] = useState(null)
  const [editNote, setEditNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    try {
      const v = await fetchViolation(id)
      setViolation(v)
      setEditCat(v.category_id)
      setEditType(v.violation_type_id)
      setEditNote(v.note || '')
    } catch {
      setViolation(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (isAdmin) fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [isAdmin])

  const startEdit = () => setEditing(true)
  const cancelEdit = () => {
    setEditing(false)
    setEditCat(violation?.category_id)
    setEditType(violation?.violation_type_id)
    setEditNote(violation?.note || '')
  }

  const saveEdit = async () => {
    if (!editCat || !editType) {
      toast('اختر التصنيف والنوع', 'error')
      return
    }
    setSaving(true)
    try {
      const updated = await updateViolation(id, {
        category_id: editCat,
        violation_type_id: editType,
        note: editNote.trim() || null
      })
      setViolation(updated)
      setEditing(false)
      toast('تم تحديث المخالفة ✓')
    } catch {
      toast('تعذر التحديث — الصلاحية مطلوبة', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await deleteViolation(id)
      toast('تم حذف المخالفة')
      navigate('/violations', { replace: true })
    } catch {
      toast('تعذر الحذف — الصلاحية مطلوبة', 'error')
      setSaving(false)
    }
  }

  const selectedCat = categories.find((c) => c.id === editCat)

  if (!isSupabaseConfigured) {
    return <div className="setup-notice"><b>تعذر الاتصال بالنظام.</b> راجع الإعدادات.</div>
  }

  if (loading) {
    return <div className="loading"><div className="spinner" />جارٍ التحميل...</div>
  }

  if (!violation) {
    return <div className="card empty"><p>المخالفة غير موجودة</p></div>
  }

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/violations')}><ArrowRight size={16} /> العودة للمخالفات</button>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><AlertTriangle size={16} /> تفاصيل المخالفة</div>
          {isAdmin && !editing && (
            <div className="row-actions">
              <button className="mini-btn edit" onClick={startEdit}><Pencil size={14} /> تعديل</button>
              <button className="mini-btn danger" onClick={() => setConfirming(true)}><Trash2 size={14} /> حذف</button>
            </div>
          )}
        </div>

        <div className="detail-list">
          <div className="detail-item"><span className="k">الطالب</span><span className="v">{violation.student?.name} — {violation.student?.class_name}</span></div>

          {editing ? (
            <>
              <div className="detail-item col">
                <span className="k">التصنيف</span>
                <div className="picker-group">
                  {categories.map((c) => (
                    <button key={c.id} className={'chip' + (editCat === c.id ? ' active' : '')}
                      onClick={() => { setEditCat(c.id); setEditType(null) }}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              {selectedCat && (
                <div className="detail-item col">
                  <span className="k">نوع المخالفة</span>
                  <div className="picker-group">
                    {selectedCat.violation_types.map((t) => (
                      <button key={t.id} className={'chip' + (editType === t.id ? ' active' : '')}
                        onClick={() => setEditType(t.id)}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="detail-item col">
                <span className="k">الملاحظة</span>
                <textarea className="edit-note" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div className="detail-item"><span className="k"><StickyNote size={13} style={{ verticalAlign: '-2px', marginLeft: 4 }} /> نوع المخالفة</span><span className="v">{violation.category?.name} / {violation.type?.name}</span></div>
              <div className="detail-item"><span className="k"><StickyNote size={13} style={{ verticalAlign: '-2px', marginLeft: 4 }} /> الملاحظة</span><span className="v">{violation.note || '—'}</span></div>
            </>
          )}
          <div className="detail-item"><span className="k">التاريخ والوقت</span><span className="v">{formatDateTime(violation.created_at)}</span></div>
        </div>

        <div className="divider" />

        <div className="recorded-by">
          <div className="row-icon"><CheckCircle2 size={17} /></div>
          <div>
            <div className="small muted">تم التسجيل بواسطة</div>
            <div className="recorded-name">{violation.leader?.name}</div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="actions-row">
          <button className="btn btn-primary" disabled={saving} onClick={saveEdit}>
            <Save size={16} /> {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
          </button>
          <button className="btn btn-ghost" disabled={saving} onClick={cancelEdit}>
            <X size={16} /> إلغاء
          </button>
        </div>
      )}

      {confirming && (
        <div className="modal-overlay" onClick={() => setConfirming(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>حذف المخالفة</h3>
              <button className="modal-close" onClick={() => setConfirming(false)}>✕</button>
            </div>
            <p className="muted small" style={{ lineHeight: 1.7 }}>
              هل أنت متأكد من حذف هذه المخالفة؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="actions-row">
              <button className="btn btn-danger" disabled={saving} onClick={handleDelete}>
                <Trash2 size={16} /> نعم، احذف
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirming(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
