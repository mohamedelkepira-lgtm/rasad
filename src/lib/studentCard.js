// توليد كارنيه الطالب على Canvas عالي الدقة (مناسب للطباعة — ليس Screenshot)
// لا يولّد QR جديدًا: يستقبل canvas الـQR المرسوم بنفس نظام المشروع (RASAD1:<code>)
// الثيمات: محايد افتراضيًا — وجاهز لتوسعة boy/girl عند توفر حقل الجنس رسميًا في قاعدة البيانات

export const CARD_W = 1050
export const CARD_H = 1665

// خريطة الثيمات — الجنس لا يُستنتج من الاسم أبدًا، ويُقرأ فقط من حقل صريح مستقبلًا
const THEMES = {
  neutral: { header: '#123061', accent: '#1E4A8C', soft: '#EAF1FB', ring: '#B9C4D6', ink: '#0F1B2D', sub: '#5E6E88' },
  boy: { header: '#0C4A6E', accent: '#0E7490', soft: '#E0F2FE', ring: '#93C5FD', ink: '#0F1B2D', sub: '#475569' },
  girl: { header: '#86198F', accent: '#A21CAF', soft: '#FCE7F3', ring: '#F0ABFC', ink: '#0F1B2D', sub: '#6B7280' }
}

// يعيد اسم الثيم من بيانات الطالب — حاليًا محايد دائمًا لأن حقل الجنس غير موجود في الـschema.
// عند إضافة حقل gender رسميًا لاحقًا: 'male' → boy، 'female' → girl، وأي قيمة أخرى → neutral.
export function resolveTheme(student) {
  const g = String(student?.gender || '').toLowerCase()
  if (g === 'male' || g === 'm' || g === 'boy') return 'boy'
  if (g === 'female' || g === 'f' || g === 'girl') return 'girl'
  return 'neutral'
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const AR_FONT = "'Cairo Variable','Segoe UI',Tahoma,sans-serif"
const CODE_FONT = "'Consolas','Cascadia Mono',monospace"

// شعار رَصَد المرسوم (رادار): حلقة + قوسا مسح + مؤشر + نقطة
function drawLogo(ctx, cx, cy, r, color) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(3, r * 0.09)
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
  ctx.lineWidth = Math.max(2, r * 0.06)
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 0.42); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 0.42); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * 0.92, cy - r * 0.38); ctx.closePath(); ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.09, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

// يقيس ويقلّص اسم الطالب ليتسع داخل العرض المتاح دون خروج نص
function fitText(ctx, text, maxW, startSize, minSize, weight) {
  let size = startSize
  ctx.font = `${weight} ${size}px ${AR_FONT}`
  while (size > minSize && ctx.measureText(text).width > maxW) {
    size -= 2
    ctx.font = `${weight} ${size}px ${AR_FONT}`
  }
  let t = text
  let truncated = false
  if (ctx.measureText(t).width > maxW) {
    truncated = true
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
    t = t + '…'
  }
  return { text: t, size, truncated, width: ctx.measureText(t).width }
}

export function drawStudentCard(canvas, opts) {
  const { name, className, code, qrCanvas, theme = 'neutral' } = opts
  const T = THEMES[theme] || THEMES.neutral
  const W = CARD_W, H = CARD_H
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // الخلفية والإطار
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)
  rr(ctx, 14, 14, W - 28, H - 28, 44)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = T.ring
  ctx.stroke()

  // شريط الرأس
  const headH = 320
  rr(ctx, 14, 14, W - 28, headH, 44)
  ctx.save()
  ctx.clip()
  const grad = ctx.createLinearGradient(0, 14, W, 14 + headH)
  grad.addColorStop(0, T.header)
  grad.addColorStop(1, T.accent)
  ctx.fillStyle = grad
  ctx.fillRect(14, 14, W - 28, headH)

  // زخرفة دوائر شفافة خفيفة
  ctx.globalAlpha = 0.08
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath(); ctx.arc(W - 90, 40, 150, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(70, headH + 10, 110, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1

  // الشعار والاسم التجاري
  drawLogo(ctx, W - 118, 118, 52, '#FFFFFF')
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `800 74px ${AR_FONT}`
  ctx.fillText('رَصَد', W - 196, 142)
  ctx.font = `600 27px ${AR_FONT}`
  ctx.globalAlpha = 0.85
  ctx.fillText('نظام إدارة المخالفات الطلابية', W - 34, 196)
  ctx.globalAlpha = 1

  // شارة نوع البطاقة
  ctx.textAlign = 'right'
  ctx.font = `700 30px ${AR_FONT}`
  const chipTxt = 'كارنيه طالب'
  const chipW = ctx.measureText(chipTxt).width + 56
  rr(ctx, W - 34 - chipW, 236, chipW, 58, 29)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#FFFFFF'
  ctx.textBaseline = 'middle'
  ctx.fillText(chipTxt, W - 34 - 28, 236 + 30)
  ctx.restore()

  // ---- اسم الطالب ----
  const padX = 84
  const maxW = W - padX * 2
  let y = 420
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.direction = 'rtl'
  ctx.fillStyle = T.sub
  ctx.font = `700 26px ${AR_FONT}`
  ctx.fillText('اسم الطالب', W / 2, y)
  y += 78
  const fitted = fitText(ctx, String(name || ''), maxW, 68, 32, '800')
  ctx.fillStyle = T.ink
  ctx.font = `800 ${fitted.size}px ${AR_FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillText(fitted.text, W / 2, y + fitted.size * 0.32)
  y += fitted.size + 46

  // الفصل (إن وُجد) — من سجل الطالب نفسه
  if (className) {
    ctx.font = `600 30px ${AR_FONT}`
    const clsTxt = `الفصل: ${className}`
    const cw = ctx.measureText(clsTxt).width + 64
    rr(ctx, (W - cw) / 2, y, cw, 56, 28)
    ctx.fillStyle = T.soft
    ctx.fill()
    ctx.fillStyle = T.header
    ctx.fillText(clsTxt, W / 2, y + 29)
    y += 96
  } else {
    y += 12
  }

  // ---- كود الطالب ----
  y += 26
  ctx.fillStyle = T.sub
  ctx.font = `700 26px ${AR_FONT}`
  ctx.fillText('كود الطالب', W / 2, y)
  y += 22
  ctx.font = `800 44px ${CODE_FONT}`
  const codeTxt = String(code || '—')
  const pw = Math.max(ctx.measureText(codeTxt).width + 76, 300)
  rr(ctx, (W - pw) / 2, y, pw, 84, 20)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.strokeStyle = T.ring
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.fillStyle = T.header
  ctx.textBaseline = 'middle'
  ctx.direction = 'ltr'
  ctx.fillText(codeTxt, W / 2, y + 44)
  ctx.direction = 'rtl'
  y += 84

  // ---- QR ----
  y += 54
  const qrSize = 620
  const boxPad = 26
  const boxSize = qrSize + boxPad * 2
  rr(ctx, (W - boxSize) / 2, y, boxSize, boxSize, 28)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.strokeStyle = T.ring
  ctx.lineWidth = 3
  ctx.stroke()
  if (qrCanvas && qrCanvas.width > 0) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(qrCanvas, (W - qrSize) / 2, y + boxPad, qrSize, qrSize)
    ctx.imageSmoothingEnabled = true
  }
  y += boxSize + 52
  ctx.fillStyle = T.sub
  ctx.font = `600 27px ${AR_FONT}`
  ctx.textAlign = 'center'
  ctx.fillText('امسح الكود للتعريف بالطالب في نظام رَصَد', W / 2, y)

  // ---- التذييل ----
  const footH = 74
  rr(ctx, 14, H - 14 - footH, W - 28, footH, 44)
  ctx.save()
  ctx.clip()
  const g2 = ctx.createLinearGradient(0, H - footH, W, H)
  g2.addColorStop(0, T.header)
  g2.addColorStop(1, T.accent)
  ctx.fillStyle = g2
  ctx.fillRect(14, H - 14 - footH, W - 28, footH)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 28px ${AR_FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillText('رَصَد • RASAD', W / 2, H - 14 - footH / 2)
  ctx.restore()

  return { nameFontSize: fitted.size, nameTruncated: fitted.truncated, nameWidth: fitted.width, maxWidth: maxW }
}
