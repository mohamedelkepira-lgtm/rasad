// أدوات QR الخاصة بالطلاب — توليد وفك معرفات بطاقات الطلاب

// بادئة موحّدة بإصدار، حتى نتمكن من توسيع الصيغة مستقبلًا دون كسر الـ QRs القديمة
export const QR_PREFIX = 'RASAD1:'

// معرّف بطاقة الطالب: الرقم الرسمي إن وُجد، وإلا الرمز الحالي، وإلا الـ UUID كخيار احتياطي ثابت
export function studentCardId(student) {
  if (!student) return null
  return student.official_student_id || student.student_code || student.id || null
}

// نص الـ QR الفعلي — معرّف فقط (بلا اسم أو فصل أو بيانات شخصية)
export function studentQrValue(student) {
  const cardId = studentCardId(student)
  return cardId ? `${QR_PREFIX}${cardId}` : null
}

// فك نص الـ QR أو معرّف مكتوب يدويًا إلى معرّف البطاقة
export function parseQrToCardId(text) {
  const s = String(text || '').trim()
  if (!s) return null
  const prefix = QR_PREFIX.toUpperCase()
  if (s.toUpperCase().startsWith(prefix)) {
    return s.slice(prefix.length).trim() || null
  }
  return s || null
}