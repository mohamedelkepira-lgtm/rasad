import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, Camera, CameraOff, Search, UserRound, AlertTriangle, CheckCircle2, Plus, Keyboard, Loader2 } from 'lucide-react'
import jsQR from 'jsqr'
import { findStudentByCardId, searchStudents } from '../lib/api'
import { parseQrToCardId } from '../lib/studentQr'
import { isSupabaseConfigured } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

const SCAN_STATES = {
  idle: 'idle',
  starting: 'starting',
  scanning: 'scanning',
  found: 'found',
  notfound: 'notfound',
  error: 'error'
}

export default function Scan() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const scanningRef = useRef(false)
  const resolvedRef = useRef(false)
  const genRef = useRef(0)

  const [status, setStatus] = useState(SCAN_STATES.idle)
  const [foundStudent, setFoundStudent] = useState(null)
  const [lastRaw, setLastRaw] = useState('')
  const [cameraErr, setCameraErr] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [mq, setMq] = useState('')
  const [mResults, setMResults] = useState([])
  const [mSearching, setMSearching] = useState(false)
  const debounce = useRef(null)
  const manualRef = useRef(null)

  const stopCamera = useCallback(() => {
    genRef.current++
    scanningRef.current = false
    resolvedRef.current = false
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const handleRaw = useCallback(async (raw) => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    const cardId = parseQrToCardId(raw)
    setLastRaw(raw)
    if (!cardId) {
      setStatus(SCAN_STATES.notfound)
      return
    }
    try {
      const student = await findStudentByCardId(cardId)
      if (student) {
        setFoundStudent(student)
        setStatus(SCAN_STATES.found)
      } else {
        setStatus(SCAN_STATES.notfound)
      }
    } catch {
      toast('تعذر البحث عن الطالب — تحقق من الاتصال', 'error')
      setStatus(SCAN_STATES.error)
    }
  }, [toast])

  const decodeLoop = useCallback(() => {
    if (!scanningRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(decodeLoop)
      return
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const scale = Math.min(1, 1280 / video.videoWidth)
    canvas.width = Math.floor(video.videoWidth * scale)
    canvas.height = Math.floor(video.videoHeight * scale)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    let imageData
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    } catch {
      rafRef.current = requestAnimationFrame(decodeLoop)
      return
    }
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
    if (code && code.data) {
      stopCamera()
      handleRaw(code.data)
      return
    }
    rafRef.current = requestAnimationFrame(decodeLoop)
  }, [stopCamera, handleRaw])

  const startCamera = useCallback(async () => {
    const gen = ++genRef.current
    setStatus(SCAN_STATES.starting)
    setFoundStudent(null)
    setLastRaw('')
    setCameraErr('')
    resolvedRef.current = false
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraErr('المتصفح لا يدعم الكاميرا — استخدم البحث اليدوي')
      setStatus(SCAN_STATES.error)
      return
    }
    const constraints = {
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    }
    let stream = null
    for (let attempt = 0; attempt < 2 && !stream; attempt++) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch {
        if (attempt === 0 && gen === genRef.current) {
          await new Promise((r) => setTimeout(r, 400))
        }
      }
    }
    if (gen !== genRef.current) {
      if (stream) stream.getTracks().forEach((t) => t.stop())
      return
    }
    if (!stream) {
      setCameraErr('تعذر الوصول للكاميرا — امنح الصلاحية أو استخدم البحث اليدوي')
      setStatus(SCAN_STATES.error)
      return
    }
    streamRef.current = stream
    const video = videoRef.current
    if (!video) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }
    video.srcObject = stream
    try {
      await video.play()
    } catch {
      stream.getTracks().forEach((t) => t.stop())
      if (gen !== genRef.current) return
      setCameraErr('تعذر الوصول للكاميرا — امنح الصلاحية أو استخدم البحث اليدوي')
      setStatus(SCAN_STATES.error)
      return
    }
    scanningRef.current = true
    setStatus(SCAN_STATES.scanning)
    rafRef.current = requestAnimationFrame(decodeLoop)
  }, [decodeLoop])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    startCamera()
    return () => stopCamera()
  }, [isSupabaseConfigured, startCamera, stopCamera])

  // بحث يدوي (بديل عن الكاميرا)
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!mq.trim() || !manualOpen) {
      setMResults([])
      return
    }
    debounce.current = setTimeout(async () => {
      setMSearching(true)
      try {
        const card = parseQrToCardId(mq.trim())
        const [direct, byName] = await Promise.all([
          card ? findStudentByCardId(card).catch(() => null) : Promise.resolve(null),
          searchStudents(mq.trim()).catch(() => [])
        ])
        const list = []
        if (direct && !byName.some((s) => s.id === direct.id)) list.push(direct)
        list.push(...byName)
        setMResults(list)
      } catch {
        setMResults([])
      } finally {
        setMSearching(false)
      }
    }, 350)
    return () => clearTimeout(debounce.current)
  }, [mq, manualOpen])

  const pickManual = (student) => {
    setFoundStudent(student)
    setStatus(SCAN_STATES.found)
    setManualOpen(false)
    setMq('')
    stopCamera()
  }

  const reset = () => {
    stopCamera()
    setManualOpen(false)
    setMq('')
    setMResults([])
    setStatus(SCAN_STATES.idle)
    setTimeout(startCamera, 80)
  }

  if (!isSupabaseConfigured) {
    return <div className="setup-notice"><b>تعذر الاتصال بالنظام.</b> راجع الإعدادات.</div>
  }

  const scanning = status === SCAN_STATES.scanning || status === SCAN_STATES.starting

  return (
    <div className="scan-page">
      <div className="page-head">
        <h2 className="page-title">مسح QR</h2>
        <span className="count-pill">بصمة الطالب</span>
      </div>

      {status === SCAN_STATES.found && foundStudent ? (
        <div className="card scan-result-card">
          <div className="scan-result-icon ok"><CheckCircle2 size={28} /></div>
          <div className="scan-result-title">تم التعرّف على الطالب</div>
          <div className="student-hero scan-student-hero">
            <div className="student-avatar">{foundStudent.name?.trim()?.charAt(0) || 'ط'}</div>
            <div className="student-info">
              <div className="student-name">{foundStudent.name}</div>
              <div className="student-meta">
                <span>الفصل: {foundStudent.class_name}</span>
                {foundStudent.student_code && <span dir="ltr">{foundStudent.student_code}</span>}
                {foundStudent.official_student_id && <span dir="ltr">{foundStudent.official_student_id}</span>}
              </div>
            </div>
          </div>
          <div className="qr-result-actions">
            <button className="btn btn-primary" onClick={() => navigate(`/students/${foundStudent.id}`)}>
              <UserRound size={17} /> فتح ملف الطالب
            </button>
            <button className="btn btn-green" onClick={() => navigate(`/add?student=${foundStudent.id}`)}>
              <Plus size={17} /> تسجيل مخالفة
            </button>
            <button className="btn btn-ghost" onClick={reset}><ScanLine size={16} /> مسح طالب آخر</button>
          </div>
        </div>
      ) : status === SCAN_STATES.notfound ? (
        <div className="card scan-result-card">
          <div className="scan-result-icon bad"><AlertTriangle size={28} /></div>
          <div className="scan-result-title">QR غير معروف</div>
          <p className="scan-result-sub">لم نجد طالبًا مطابقًا لهذا الرمز.</p>
          <p className="scan-raw" dir="ltr">{lastRaw}</p>
          <div className="qr-result-actions">
            <button className="btn btn-primary" onClick={reset}><ScanLine size={16} /> مسح رمز آخر</button>
            <button className="btn btn-ghost" onClick={() => setManualOpen(true)}><Keyboard size={15} /> بحث يدوي</button>
          </div>
        </div>
      ) : status === SCAN_STATES.error ? (
        <div className="card scan-result-card">
          <div className="scan-result-icon bad"><CameraOff size={28} /></div>
          <div className="scan-result-title">تعذر فتح الكاميرا</div>
          <p className="scan-result-sub">{cameraErr}</p>
          <div className="qr-result-actions">
            <button className="btn btn-primary" onClick={startCamera}><Camera size={16} /> إعادة المحاولة</button>
            <button className="btn btn-ghost" onClick={() => setManualOpen(true)}><Keyboard size={15} /> بحث يدوي</button>
          </div>
        </div>
      ) : (
        <div className="scan-live">
          <div className="scan-viewport">
            <video ref={videoRef} className="scan-video" playsInline muted autoPlay />
            <canvas ref={canvasRef} className="scan-canvas" />
            {!scanning && status === SCAN_STATES.idle && (
              <div className="scan-overlay-message">
                <Camera size={26} />
                <span>جارٍ تحضير الكاميرا...</span>
              </div>
            )}
            {scanning && (
              <>
                <div className="scan-frame">
                  <span className="scan-corner tl" /><span className="scan-corner tr" /><span className="scan-corner bl" /><span className="scan-corner br" />
                </div>
                <div className="scan-overlay-message">
                  <span className="scan-live-dot" /> يبحث عن QR...
                </div>
              </>
            )}
          </div>
          <p className="scan-instruction"><ScanLine size={15} /> وجّه الكاميرا إلى QR الخاص بالطالب</p>
          <button className="btn btn-ghost btn-sm scan-manual-toggle" onClick={() => setManualOpen((v) => !v)}>
            <Keyboard size={15} /> {manualOpen ? 'إخفاء البحث اليدوي' : 'بحث يدوي (بديل)'}
          </button>
        </div>
      )}

      {manualOpen && status !== SCAN_STATES.found && (
        <div className="card scan-manual-card">
          <div className="card-header">
            <div className="card-title"><Search size={16} /> البحث اليدوي</div>
          </div>
          <div className="search-box">
            <Search size={16} />
            <input
              ref={manualRef}
              value={mq}
              onChange={(e) => setMq(e.target.value)}
              placeholder="اكتب اسم الطالب أو كود QR..."
            />
          </div>
          {mSearching && <div className="loading" style={{ padding: 12 }}><Loader2 size={16} className="spin" />بحث...</div>}
          {!mSearching && mq.trim() && mResults.length === 0 && (
            <div className="empty" style={{ padding: 18 }}><p>لا توجد نتائج مطابقة</p></div>
          )}
          {mResults.length > 0 && (
            <div className="list">
              {mResults.map((s) => (
                <div className="student-row" key={s.id} onClick={() => pickManual(s)}>
                  <div className="student-avatar-sm">{s.name.trim().charAt(0)}</div>
                  <div className="row-body">
                    <div className="row-title">{s.name}</div>
                    <div className="row-sub">{s.class_name}{s.student_code ? ` • ${s.student_code}` : ''}</div>
                  </div>
                  <span className="badge gray">اختيار</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}