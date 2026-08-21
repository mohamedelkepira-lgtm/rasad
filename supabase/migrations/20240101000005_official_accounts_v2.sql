-- ============================================================
-- رَصَد — الحسابات الرسمية الكاملة (39 حسابًا)
-- 33 قائدًا (Leader) + 6 مديرين (Admin) وفق الشيت المعتمد.
-- - الحسابان الموجودان (أحمد هاني / محمد حاتم) يُحدَّث إيميلهما
--   وكلمة مرورهما ليطابقا الشيت: admin04 / lead03
-- - باقي الحسابات تُنشأ من جديد (idempotent: لا تكرار بالإيميل)
-- - تقييد قراءة جدول المخالفات للأدمن فقط:
--   القائد يسجّل المخالفة فقط ولا يطّلع على السجل/التقارير/الأعداد
-- ============================================================

-- ---------- 1) حماية بيانات المخالفات ----------
drop policy if exists violations_select on public.violations;
create policy violations_select on public.violations
  for select using (public.is_admin());

set search_path = public, extensions;

-- ---------- 2) تحديث الحسابين الموجودين ----------
do $$
declare
  u uuid;
begin
  -- أحمد هاني → admin04@rasad.school
  u := (select id from auth.users where email = 'ahmedhany@rasad.school');
  if u is not null then
    update auth.users
      set email = 'admin04@rasad.school',
          encrypted_password = crypt('Rasad@Adm04!', gen_salt('bf')),
          updated_at = now()
      where id = u;
    update auth.identities
      set identity_data = jsonb_build_object('sub', u::text, 'email', 'admin04@rasad.school'),
          provider_id = 'admin04@rasad.school',
          updated_at = now()
      where user_id = u and provider = 'email';
    update public.profiles set name = 'أحمد هاني', role = 'admin' where id = u;
  end if;

  -- محمد حاتم → lead03@rasad.school
  u := (select id from auth.users where email = 'mhamedhatem@rasad.school');
  if u is not null then
    update auth.users
      set email = 'lead03@rasad.school',
          encrypted_password = crypt('Rasad@Lead03!', gen_salt('bf')),
          updated_at = now()
      where id = u;
    update auth.identities
      set identity_data = jsonb_build_object('sub', u::text, 'email', 'lead03@rasad.school'),
          provider_id = 'lead03@rasad.school',
          updated_at = now()
      where user_id = u and provider = 'email';
    update public.profiles set name = 'محمد حاتم', role = 'leader' where id = u;
  end if;
end $$;

-- ---------- 3) إنشاء باقي الحسابات (32 قائدًا + 5 مديرين) ----------
do $$
declare
  rec record;
  u uuid;
begin
  for rec in
    select * from (values
      ('lead01', 'أدم محمود',     'leader', 'Rasad@Lead01!'),
      ('lead02', 'كيرلس نادر',    'leader', 'Rasad@Lead02!'),
      ('lead04', 'أحمد سيد',      'leader', 'Rasad@Lead04!'),
      ('lead05', 'علي',           'leader', 'Rasad@Lead05!'),
      ('lead06', 'أسماء إدريس',   'leader', 'Rasad@Lead06!'),
      ('lead07', 'بسمة أحمد',     'leader', 'Rasad@Lead07!'),
      ('lead08', 'بسنت',          'leader', 'Rasad@Lead08!'),
      ('lead09', 'هاجر',          'leader', 'Rasad@Lead09!'),
      ('lead10', 'هاجر صابر',     'leader', 'Rasad@Lead10!'),
      ('lead11', 'حمزة',          'leader', 'Rasad@Lead11!'),
      ('lead12', 'جنى عبد النبي', 'leader', 'Rasad@Lead12!'),
      ('lead13', 'جنى الحسيني',   'leader', 'Rasad@Lead13!'),
      ('lead14', 'جنى أسامة',     'leader', 'Rasad@Lead14!'),
      ('lead15', 'كنزي محسن',     'leader', 'Rasad@Lead15!'),
      ('lead16', 'لوجي',          'leader', 'Rasad@Lead16!'),
      ('lead17', 'ملك سيد',       'leader', 'Rasad@Lead17!'),
      ('lead18', 'ملك شادي',      'leader', 'Rasad@Lead18!'),
      ('lead19', 'حسني',          'leader', 'Rasad@Lead19!'),
      ('lead20', 'محمد أحمد',     'leader', 'Rasad@Lead20!'),
      ('lead21', 'نور',           'leader', 'Rasad@Lead21!'),
      ('lead22', 'نور شرقاوي',    'leader', 'Rasad@Lead22!'),
      ('lead23', 'نور إيهاب',     'leader', 'Rasad@Lead23!'),
      ('lead24', 'رنا محمد',      'leader', 'Rasad@Lead24!'),
      ('lead25', 'رودينا طارق',   'leader', 'Rasad@Lead25!'),
      ('lead26', 'سلمى ياسر',     'leader', 'Rasad@Lead26!'),
      ('lead27', 'سامح',          'leader', 'Rasad@Lead27!'),
      ('lead28', 'شاهد أشرف',     'leader', 'Rasad@Lead28!'),
      ('lead29', 'شيكا',          'leader', 'Rasad@Lead29!'),
      ('lead30', 'تسنيم',         'leader', 'Rasad@Lead30!'),
      ('lead31', 'ياسمين',        'leader', 'Rasad@Lead31!'),
      ('lead32', 'زياد أسامة',    'leader', 'Rasad@Lead32!'),
      ('lead33', 'ريتاج',         'leader', 'Rasad@Lead33!'),
      ('admin01', 'مايا سيد',          'admin', 'Rasad@Adm01!'),
      ('admin02', 'دكتورة مايا السيد', 'admin', 'Rasad@Adm02!'),
      ('admin03', 'تامر حسن',          'admin', 'Rasad@Adm03!'),
      ('admin05', 'أنوار',             'admin', 'Rasad@Adm05!'),
      ('admin06', 'أماني',             'admin', 'Rasad@Adm06!')
    ) as t(code, full_name, user_role, pass)
  loop
    if not exists (select 1 from auth.users where email = rec.code || '@rasad.school') then
      u := gen_random_uuid();
      insert into auth.users
        (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
         confirmation_token, email_change, email_change_token_new, recovery_token)
      values
        ('00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
         rec.code || '@rasad.school', crypt(rec.pass, gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}', '{}', now(), now(),
         '', '', '', '');
      insert into auth.identities
        (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      values
        (u, u, jsonb_build_object('sub', u::text, 'email', rec.code || '@rasad.school'),
         'email', rec.code || '@rasad.school', now(), now(), now());
      insert into public.profiles (id, name, role) values (u, rec.full_name, rec.user_role);
    end if;
  end loop;
end $$;
