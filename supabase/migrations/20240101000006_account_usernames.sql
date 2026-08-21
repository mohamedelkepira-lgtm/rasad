-- ============================================================
-- رَصَد — أكواد دخول بالأسماء الإنجليزية
-- قاعدة التسمية: الاسم الفردي إذا لم يتكرر، والاسم الثنائي
-- (أول + ثانٍ) لمن تشابهت أول أسمائهم. لا تغيير في الأسماء
-- المعروضة ولا كلمات المرور — فقط بريد تسجيل الدخول.
-- idempotent: يتم التحويل فقط إذا كان البريد القديم موجودًا.
-- ============================================================

set search_path = public, extensions;

do $$
declare
  rec record;
  u uuid;
begin
  for rec in
    select * from (values
      -- القادة (33)
      ('lead01@rasad.school',  'adam@rasad.school'),          -- أدم محمود
      ('lead02@rasad.school',  'kirollos@rasad.school'),      -- كيرلس نادر
      ('lead03@rasad.school',  'mohamedhatem@rasad.school'),  -- محمد حاتم (ثنائي: محمد مكرر)
      ('lead04@rasad.school',  'ahmedsayed@rasad.school'),    -- أحمد سيد (ثنائي: أحمد مكرر)
      ('lead05@rasad.school',  'ali@rasad.school'),           -- علي
      ('lead06@rasad.school',  'asmaa@rasad.school'),         -- أسماء إدريس
      ('lead07@rasad.school',  'basma@rasad.school'),         -- بسمة أحمد
      ('lead08@rasad.school',  'basant@rasad.school'),        -- بسنت
      ('lead09@rasad.school',  'hager@rasad.school'),         -- هاجر
      ('lead10@rasad.school',  'hagersaber@rasad.school'),    -- هاجر صابر (ثنائي: هاجر مكرر)
      ('lead11@rasad.school',  'hamza@rasad.school'),         -- حمزة
      ('lead12@rasad.school',  'janaabdelnabi@rasad.school'), -- جنى عبد النبي (ثنائي)
      ('lead13@rasad.school',  'janaelhusseiny@rasad.school'),-- جنى الحسيني (ثنائي)
      ('lead14@rasad.school',  'janaosama@rasad.school'),     -- جنى أسامة (ثنائي)
      ('lead15@rasad.school',  'kenzy@rasad.school'),         -- كنزي محسن
      ('lead16@rasad.school',  'logy@rasad.school'),          -- لوجي
      ('lead17@rasad.school',  'malaksayed@rasad.school'),    -- ملك سيد (ثنائي: ملك مكرر)
      ('lead18@rasad.school',  'malakshady@rasad.school'),    -- ملك شادي (ثنائي)
      ('lead19@rasad.school',  'hassany@rasad.school'),       -- حسني
      ('lead20@rasad.school',  'mohamedahmed@rasad.school'),  -- محمد أحمد (ثنائي)
      ('lead21@rasad.school',  'nour@rasad.school'),          -- نور
      ('lead22@rasad.school',  'noursharqawy@rasad.school'),  -- نور شرقاوي (ثنائي)
      ('lead23@rasad.school',  'nourehab@rasad.school'),      -- نور إيهاب (ثنائي)
      ('lead24@rasad.school',  'rana@rasad.school'),          -- رنا محمد
      ('lead25@rasad.school',  'rodina@rasad.school'),        -- رودينا طارق
      ('lead26@rasad.school',  'salma@rasad.school'),         -- سلمى ياسر
      ('lead27@rasad.school',  'samah@rasad.school'),         -- سامح
      ('lead28@rasad.school',  'shahed@rasad.school'),        -- شاهد أشرف
      ('lead29@rasad.school',  'shika@rasad.school'),         -- شيكا
      ('lead30@rasad.school',  'tasneem@rasad.school'),       -- تسنيم
      ('lead31@rasad.school',  'yasmin@rasad.school'),        -- ياسمين
      ('lead32@rasad.school',  'ziad@rasad.school'),          -- زياد أسامة
      ('lead33@rasad.school',  'retaj@rasad.school'),         -- ريتاج
      -- المديرون (6)
      ('admin01@rasad.school', 'mayasayed@rasad.school'),     -- مايا سيد (ثنائي: مايا مكررة)
      ('admin02@rasad.school', 'mayaelsayed@rasad.school'),   -- دكتورة مايا السيد (ثنائي)
      ('admin03@rasad.school', 'tamer@rasad.school'),         -- تامر حسن
      ('admin04@rasad.school', 'ahmedhany@rasad.school'),     -- أحمد هاني (ثنائي: أحمد مكرر)
      ('admin05@rasad.school', 'anwar@rasad.school'),         -- أنوار
      ('admin06@rasad.school', 'amani@rasad.school')          -- أماني
    ) as t(old_email, new_email)
  loop
    u := (select id from auth.users where email = rec.old_email);
    if u is not null then
      update auth.users
        set email = rec.new_email, updated_at = now()
        where id = u;
      update auth.identities
        set identity_data = jsonb_build_object('sub', u::text, 'email', rec.new_email),
            provider_id = rec.new_email,
            updated_at = now()
        where user_id = u and provider = 'email';
    end if;
  end loop;
end $$;
