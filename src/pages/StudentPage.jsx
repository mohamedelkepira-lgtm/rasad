import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, AlertTriangle, ClipboardList, Plus, GraduationCap, Hash, CalendarDays, ChevronLeft, QrCode, Maximize2, Download, Printer, X } from 'lucide-react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { fetchStudent, fetchStudentViolations } from '../lib/api'
import { studentCardId, studentQrValue } from '../lib/studentQr'
import { formatDate, formatTime, monthKey } from '../lib/utils'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function StudentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [student, setStudent] = useState(null)
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(true)
  const [qrZoom, setQrZoom] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    try {
      // سجل مخالفات الطالب يظهر للأدمن فقط — القائد يسجل المخالفة فقط
      const st = await fetchStudent(id)
      setStudent(st)
      if (isAdmin) setViolations(await fetchStudentViolations(id))
      else setViolations([])
    } catch {
      setStudent(null)
      setViolations([])
    } finally {
      setLoading(false)
    }
  }, [id, isAdmin])

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
  const qrValue = studentQrValue(student)
  const cardId = studentCardId(student)

  const downloadQr = () => {
    const canvas = document.getElementById('student-qr-canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `QR-${cardId}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const printQr = () => {
    const canvas = document.getElementById('student-qr-canvas')
    if (!canvas) return
    const img = canvas.toDataURL('image/png')
    const w = window.open('', '_blank', 'width=480,height=640')
    if (!w) return
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>QR ${cardId}</title>
      <style>
        body{font-family:'Cairo Variable','Segoe UI',Tahoma,sans-serif;text-align:center;padding:32px;color:#0F1B2D}
        .brand{font-size:13px;color:#5E6E88;margin-bottom:4px}
        .name{font-size:18px;font-weight:800;margin-bottom:2px}
        .meta{font-size:13px;color:#5E6E88;margin-bottom:20px}
        img.qr{width:300px;height:300px;border:1px solid #E6EAF2;border-radius:16px;padding:16px;background:#fff}
        .id{margin-top:20px;font-size:15px;font-weight:800;color:#123061}
      </style></head><body>
      <div class="brand">رَصَد — نظام إدارة المخالفات الطلابية</div>
      <div class="name">${student.name}</div>
      <div class="meta">الفصل: ${student.class_name}</div>
      <img class="qr" src="${img}" alt="QR ${cardId}" />
      <div class="id">${cardId}</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script>
    </body></html>`)
    w.document.close()
  }

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
            {student.official_student_id && <span><Hash size={13} /> {student.official_student_id}</span>}
          </div>
        </div>
        <button className="btn btn-primary btn-sm hero-action" onClick={() => navigate(`/add?student=${student.id}`)}>
          <Plus size={15} /> تسجيل مخالفة
        </button>
      </div>

      {qrValue && (
        <div className="card qr-card">
          <div className="card-header">
            <div className="card-title"><QrCode size={16} /> QR Code الطالب</div>
          </div>
          <div className="qr-layout">
            <div className="qr-box">
              <QRCodeSVG value={qrValue} size={168} level="M" className="qr-img" />
              <QRCodeCanvas id="student-qr-canvas" value={qrValue} size={320} level="M" style={{ display: 'none' }} />
            </div>
            <div className="qr-info">
              {student.student_code && (
                <div className="qr-id-row"><span className="qr-id-label">Student Code</span><span className="qr-id-value" dir="ltr">{student.student_code}</span></div>
              )}
              {student.official_student_id && (
                <div className="qr-id-row"><span className="qr-id-label">Official ID</span><span className="qr-id-value" dir="ltr">{student.official_student_id}</span></div>
              )}
              {!student.student_code && !student.official_student_id && (
                <div className="qr-id-row"><span className="qr-id-label">معرّف داخلي</span><span className="qr-id-value" dir="ltr">{cardId}</span></div>
              )}
              <p className="qr-hint">امسح هذا الرمز لتسجيل المخالفات من تطبيق الموبايل</p>
              <div className="qr-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setQrZoom(true)}><Maximize2 size={14} /> تكبير QR</button>
                <button className="btn btn-ghost btn-sm" onClick={downloadQr}><Download size={14} /> تحميل QR</button>
                <button className="btn btn-ghost btn-sm" onClick={printQr}><Printer size={14} /> طباعة QR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <>
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
        </>
      )}

      {qrZoom && qrValue && (
        <div className="modal-overlay qr-zoom-overlay" onClick={() => setQrZoom(false)}>
          <div className="modal qr-zoom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>QR Code الطالب</h3>
              <button className="modal-close" onClick={() => setQrZoom(false)} aria-label="إغلاق"><X size={17} /></button>
            </div>
            <div className="qr-zoom-body">
              <div className="qr-box qr-box-lg">
                <QRCodeSVG value={qrValue} size={260} level="M" className="qr-img" />
              </div>
              <div className="qr-zoom-meta">
                <div className="student-name">{student.name}</div>
                <div className="student-meta">
                  <span><GraduationCap size={13} /> الفصل: {student.class_name}</span>
                  {cardId && <span><Hash size={13} /> <span dir="ltr">{cardId}</span></span>}
                </div>
              </div>
              <div className="qr-actions qr-actions-lg">
                <button className="btn btn-ghost btn-sm" onClick={downloadQr}><Download size={14} /> تحميل QR</button>
                <button className="btn btn-ghost btn-sm" onClick={printQr}><Printer size={14} /> طباعة QR</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
