-- ============================================================
-- رَصَد — الحسابات الرسمية
-- حذف جميع حسابات الديمو وإنشاء الحسابين الرسميين فقط
-- ============================================================

-- 1) حذف مخالفات حسابات الديمو (قيد FK يمنع حذف المستخدم مع وجود مخالفات)
delete from public.violations v
where v.created_by in (
  select p.id
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email like '%@demo.school'
);

-- 2) حذف حسابات الديمو (profiles تُحذف تلقائيًا عبر on delete cascade)
delete from auth.users u
where u.email like '%@demo.school';

-- 3) إنشاء الحسابين الرسميين
set search_path = public, extensions;

do $$
declare
  u uuid;
begin
  if not exists (select 1 from auth.users where email = 'ahmedhany@rasad.school') then
    u := gen_random_uuid();
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, email_change, email_change_token_new, recovery_token)
    values
      ('00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
       'ahmedhany@rasad.school', crypt('ahmed@2010', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{}', now(), now(),
       '', '', '', '');
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (u, u, jsonb_build_object('sub', u::text, 'email', 'ahmedhany@rasad.school'), 'email', 'ahmedhany@rasad.school', now(), now(), now());
    insert into public.profiles (id, name, role) values (u, 'أحمد هاني', 'admin');
  end if;

  if not exists (select 1 from auth.users where email = 'mhamedhatem@rasad.school') then
    u := gen_random_uuid();
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, email_change, email_change_token_new, recovery_token)
    values
      ('00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
       'mhamedhatem@rasad.school', crypt('mohamed@2010', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{}', now(), now(),
       '', '', '', '');
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (u, u, jsonb_build_object('sub', u::text, 'email', 'mhamedhatem@rasad.school'), 'email', 'mhamedhatem@rasad.school', now(), now(), now());
    insert into public.profiles (id, name, role) values (u, 'محمد حاتم', 'leader');
  end if;
end $$;
