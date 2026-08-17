-- ============================================================
-- Student Behavior & Violation Manager — DEMO DATA (تجريبي فقط)
-- تشغيل: Supabase Dashboard > SQL Editor > تشغيل بعد schema.sql
--
-- ⚠️ بيانات تجريبية FAKE — لا تحتوي على أي بيانات طلاب حقيقية
-- كلمات مرور الحسابات تجريبية خاصة بالعرض فقط
-- ============================================================

-- تأكد أن دوال pgcrypto (crypt / gen_salt) قابلة للوصول أينما كانت مثبّتة
set search_path = public, extensions;

-- 1) مسح البيانات التجريبية السابقة (إن وُجدت) لإعادة البناء
-- جميع الجداول المترابطة بـFK في أمر truncate واحد (PostgreSQL يرفض قطعها منفردة)
truncate table public.violations, public.students, public.violation_types, public.violation_categories;

-- 2) حسابات تجريبية (Admin + 6 Leaders)
-- كلمة المرور للجميع: Demo1234!
do $$
declare
  u uuid;
  emails text[] := array[
    'admin@demo.school',
    'leader1@demo.school',
    'leader2@demo.school',
    'leader3@demo.school',
    'leader4@demo.school',
    'leader5@demo.school',
    'leader6@demo.school'
  ];
  names text[] := array[
    'مسؤول التحول الاحترافي',
    'Leader 1',
    'Leader 2',
    'Leader 3',
    'Leader 4',
    'Leader 5',
    'Leader 6'
  ];
  roles text[] := array['admin','leader','leader','leader','leader','leader','leader'];
  i int;
begin
  for i in 1..array_length(emails, 1) loop
    if not exists (select 1 from auth.users where email = emails[i]) then
      u := gen_random_uuid();
      insert into auth.users
        (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
         confirmation_token, email_change, email_change_token_new, recovery_token)
      values
        ('00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
         emails[i], crypt('Demo1234!', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}', '{}', now(), now(),
         '', '', '', '');
      insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      values (u, u, jsonb_build_object('sub', u::text, 'email', emails[i]), 'email', emails[i], now(), now(), now());
      insert into public.profiles (id, name, role) values (u, names[i], roles[i]);
    end if;
  end loop;
end $$;

-- 3) التصنيفات والأنواع
insert into public.violation_categories (name) values ('الشعر'), ('المظهر'), ('السلوك');

insert into public.violation_types (category_id, name)
select id, 'طول الشعر' from public.violation_categories where name = 'الشعر';
insert into public.violation_types (category_id, name)
select id, 'تسريحة غير مناسبة' from public.violation_categories where name = 'الشعر';
insert into public.violation_types (category_id, name)
select id, 'الأظافر' from public.violation_categories where name = 'المظهر';
insert into public.violation_types (category_id, name)
select id, 'المظهر العام' from public.violation_categories where name = 'المظهر';
insert into public.violation_types (category_id, name)
select id, 'مخالفة سلوكية' from public.violation_categories where name = 'السلوك';
insert into public.violation_types (category_id, name)
select id, 'عدم الالتزام بالتعليمات' from public.violation_categories where name = 'السلوك';

-- 4) طلاب تجريبيون (أسماء FAKE)
insert into public.students (name, class_name) values
  ('أحمد محمد', '2-A'),
  ('محمد علي', '2-B'),
  ('يوسف حسن', '1-A'),
  ('عمر خالد', '2-A'),
  ('محمود سامي', '2-B'),
  ('خالد إبراهيم', '3-A'),
  ('عبدالله فؤاد', '2-A'),
  ('حسين رامي', '3-A'),
  ('أنس طارق', '1-A'),
  ('زياد هاني', '1-B'),
  ('كريم سعيد', '2-A'),
  ('باسل ماجد', '2-B'),
  ('إبراهيم لطفي', '2-B'),
  ('حمزة وائل', '1-A'),
  ('سيف الدين محمود', '3-A'),
  ('طارق ناصر', '3-A'),
  ('أيمن أشرف', '1-B'),
  ('لؤي سمير', '1-B'),
  ('إلياس عماد', '1-A'),
  ('هيثم جمال', '1-B');

-- 5) مخالفات تجريبية موزعة على الشهر الحالي والسابق (لإظهار التقارير الشهرية)
with seed(sname, cname, tname, leader_name, days_ago, note) as (
  values
    ('أحمد محمد','الشعر','طول الشعر','Leader 1',0,'نُبّه شفهيًا'),
    ('محمد علي','المظهر','الأظافر','Leader 2',0,null),
    ('يوسف حسن','السلوك','مخالفة سلوكية','Leader 1',0,'تشويش داخل الصف'),
    ('عمر خالد','الشعر','تسريحة غير مناسبة','Leader 3',1,null),
    ('أحمد محمد','السلوك','عدم الالتزام بالتعليمات','Leader 2',1,null),
    ('محمود سامي','المظهر','المظهر العام','Leader 4',2,null),
    ('أحمد محمد','الشعر','طول الشعر','Leader 1',3,null),
    ('محمد علي','السلوك','مخالفة سلوكية','Leader 5',3,null),
    ('خالد إبراهيم','الشعر','تسريحة غير مناسبة','Leader 2',4,null),
    ('يوسف حسن','المظهر','الأظافر','Leader 3',5,null),
    ('أحمد محمد','الشعر','طول الشعر','Leader 4',6,null),
    ('أنس طارق','السلوك','عدم الالتزام بالتعليمات','Leader 6',7,null),
    ('عمر خالد','الشعر','تسريحة غير مناسبة','Leader 5',9,null),
    ('محمد علي','الشعر','طول الشعر','Leader 1',11,null),
    ('عبدالله فؤاد','المظهر','المظهر العام','Leader 6',12,null),
    ('أحمد محمد','السلوك','مخالفة سلوكية','Leader 2',14,null),
    ('يوسف حسن','الشعر','طول الشعر','Leader 3',16,null),
    ('محمود سامي','الشعر','تسريحة غير مناسبة','Leader 4',22,null),
    ('أحمد محمد','المظهر','الأظافر','Leader 5',25,null),
    ('خالد إبراهيم','السلوك','عدم الالتزام بالتعليمات','Leader 1',27,null)
)
insert into public.violations (student_id, category_id, violation_type_id, note, created_by, created_at)
select st.id, c.id, t.id, sd.note, p.id, now() - (sd.days_ago || ' days')::interval
from seed sd
join public.students st on st.name = sd.sname
join public.violation_categories c on c.name = sd.cname
join public.violation_types t on t.category_id = c.id and t.name = sd.tname
join public.profiles p on p.name = sd.leader_name;

-- ---------- ملخص للتأكد ----------
select 'مستخدمون تجريبيون' as item, count(*) as num from public.profiles
union all select 'طلاب تجريبيون', count(*) from public.students
union all select 'مخالفات تجريبية', count(*) from public.violations
union all select 'تصنيفات', count(*) from public.violation_categories
union all select 'أنواع', count(*) from public.violation_types;
