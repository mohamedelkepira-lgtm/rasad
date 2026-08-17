-- ============================================================
-- Student Behavior & Violation Manager — Database Schema
-- تشغيل: Supabase Dashboard > SQL Editor > تشغيل هذا الملف كاملًا
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'leader' check (role in ('admin', 'leader')),
  created_at timestamptz not null default now()
);

-- دالة مساعدة: هل المستخدم الحالي Admin؟
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- students ----------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text,
  name text not null,
  class_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- violation_categories ----------
create table if not exists public.violation_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- violation_types ----------
create table if not exists public.violation_types (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.violation_categories(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- violations ----------
create table if not exists public.violations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  category_id uuid not null references public.violation_categories(id) on delete restrict,
  violation_type_id uuid not null references public.violation_types(id) on delete restrict,
  note text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  month_key text not null default to_char(now(), 'YYYY-MM')
);

-- month_key يُحدَّث تلقائيًا من created_at (للتقارير الشهرية)
create or replace function public.set_violation_month_key()
returns trigger
language plpgsql
as $$
begin
  new.month_key := to_char(new.created_at, 'YYYY-MM');
  return new;
end;
$$;

drop trigger if exists trg_violations_month_key on public.violations;
create trigger trg_violations_month_key
  before insert or update of created_at on public.violations
  for each row execute function public.set_violation_month_key();

-- ---------- Indexes ----------
create index if not exists idx_violations_student  on public.violations(student_id);
create index if not exists idx_violations_month    on public.violations(month_key);
create index if not exists idx_violations_created  on public.violations(created_at);
create index if not exists idx_violations_creator  on public.violations(created_by);
create index if not exists idx_types_category       on public.violation_types(category_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- المبدأ: الـLeader يقرأ ويسجّل فقط — الـAdmin يقرأ ويدير كل شيء
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.students          enable row level security;
alter table public.violation_categories enable row level security;
alter table public.violation_types   enable row level security;
alter table public.violations        enable row level security;

-- ---------- profiles ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update using (public.is_admin());

-- ---------- students ----------
drop policy if exists students_select on public.students;
create policy students_select on public.students
  for select using (auth.role() = 'authenticated');

drop policy if exists students_admin_insert on public.students;
create policy students_admin_insert on public.students
  for insert with check (public.is_admin());

drop policy if exists students_admin_update on public.students;
create policy students_admin_update on public.students
  for update using (public.is_admin());

drop policy if exists students_admin_delete on public.students;
create policy students_admin_delete on public.students
  for delete using (public.is_admin());

-- ---------- violation_categories ----------
drop policy if exists categories_select on public.violation_categories;
create policy categories_select on public.violation_categories
  for select using (auth.role() = 'authenticated');

drop policy if exists categories_admin_write on public.violation_categories;
create policy categories_admin_write on public.violation_categories
  for insert with check (public.is_admin());

drop policy if exists categories_admin_update on public.violation_categories;
create policy categories_admin_update on public.violation_categories
  for update using (public.is_admin());

drop policy if exists categories_admin_delete on public.violation_categories;
create policy categories_admin_delete on public.violation_categories
  for delete using (public.is_admin());

-- ---------- violation_types ----------
drop policy if exists types_select on public.violation_types;
create policy types_select on public.violation_types
  for select using (auth.role() = 'authenticated');

drop policy if exists types_admin_write on public.violation_types;
create policy types_admin_write on public.violation_types
  for insert with check (public.is_admin());

drop policy if exists types_admin_update on public.violation_types;
create policy types_admin_update on public.violation_types
  for update using (public.is_admin());

drop policy if exists types_admin_delete on public.violation_types;
create policy types_admin_delete on public.violation_types
  for delete using (public.is_admin());

-- ---------- violations ----------
-- أي مستخدم مسجّل يقرأ جميع المخالفات (الـLeader يرى ما سجّله والآخرين)
drop policy if exists violations_select on public.violations;
create policy violations_select on public.violations
  for select using (auth.role() = 'authenticated');

-- الـLeader والـAdmin يسجّلان مخالفات جديدة
drop policy if exists violations_insert on public.violations;
create policy violations_insert on public.violations
  for insert with check (auth.role() = 'authenticated');

-- التعديل والحذف: Admin فقط — الـLeader لا يملك أي سياسة تعديل/حذف
drop policy if exists violations_admin_update on public.violations;
create policy violations_admin_update on public.violations
  for update using (public.is_admin());

drop policy if exists violations_admin_delete on public.violations;
create policy violations_admin_delete on public.violations
  for delete using (public.is_admin());
