# نظام إدارة سلوك ومخالفات الطلاب — MVP

تطبيق ويب Mobile-First للـLeaders ومسؤول التحول الاحترافي لتسجيل ومتابعة مخالفات الطلاب.

- **Frontend:** React + Vite
- **Database + Auth:** Supabase (Free Tier) + PostgreSQL + RLS
- **اللغة:** عربي RTL كامل

---

## 1) متطلبات التشغيل

- Node.js 18+
- حساب Supabase مجاني (Free Tier)

## 2) خطوات الإعداد

### أ) إنشاء مشروع Supabase
1. سجّل دخول على [supabase.com](https://supabase.com)
2. New Project → اختر اسمًا ومدينة قريبة → Create
3. من `Project Settings → API` انسخ القيمتين:
   - **Project URL**
   - **anon / public key**

> فقط هاتان القيمتان مطلوبتان. لا نحتاج Service Role Key إطلاقًا.

### ب) تشغيل قاعدة البيانات
1. من لوحة Supabase افتح **SQL Editor**
2. شغّل ملف `supabase/schema.sql` (الجداول + RLS)
3. ثم شغّل ملف `supabase/seed.sql` (بيانات تجريبية FAKE + حسابات تجريبية)

### ج) ربط التطبيق
1. انسخ `.env.example` إلى `.env`
2. ضع القيمتين:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
3. ثبّت وشغّل:
```
npm install
npm run dev
```
البناء للإنتاج:
```
npm run build
npm run preview
```

## 3) الحسابات التجريبية (للعرض فقط)

| الدور | البريد | كلمة المرور |
|-------|--------|-------------|
| Admin | `admin@demo.school` | `Demo1234!` |
| Leader | `leader1@demo.school` | `Demo1234!` |
| Leader | `leader2@demo.school` ... `leader6@demo.school` | `Demo1234!` |

> جميع الأسماء والبيانات تجريبية FAKE — لا يوجد أي بيانات حقيقية.

## 4) الصلاحيات

- **Leader:** تسجيل الدخول، لوحة اليوم، البحث عن الطلاب، تسجيل المخالفات، مشاهدة المخالفات.
- **Admin:** كل ما سبق + إدارة الطلاب (إضافة/تعديل/تعطيل)، تعديل وحذف المخالفات، التقارير الشهرية، تصدير CSV/Excel.

الصلاحيات مطبّقة على مستوى قاعدة البيانات عبر **Row Level Security** وليس فقط في الواجهة.

## 5) هيكل المشروع

```
app/
  src/
    lib/           # supabase client + api + utils
    context/       # AuthContext + ToastContext
    components/    # Layout (Topbar + BottomNav + FAB)
    pages/         # Login, Dashboard, AddViolation, Students, Violations, ViolationDetail, Reports
  supabase/
    schema.sql     # الجداول + RLS
    seed.sql       # بيانات تجريبية
```

## 6) أمان

- لا تُرفع `.env` إلى Git (مدرج في `.gitignore`).
- لا نستخدم Service Role Key إطلاقًا في الواجهة.
- لا توجد بيانات طلاب حقيقية في النسخة الحالية.

## 7) المراحل المستقبلية (غير مضمّنة الآن)

- Phase 2: سيرفر المدرسة الداخلي (Linux/Windows) مع قسم الشبكات + Backup
- Phase 3: تقارير متقدمة وإدارة الـLeaders
- Phase 4: التطبيق الكامل داخل المدرسة
