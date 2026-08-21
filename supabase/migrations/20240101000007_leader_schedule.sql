-- ============================================================
-- رَصَد — جدول مناوبة الليدرز على بوابة المدرسة
-- schedule_days        : يوم المناوبة (يوم واحد فريد)
-- schedule_assignments : القادة المكلفين باليوم (3 كحد أقصى بترتيب 1..3)
-- schedule_attendance  : تأكيد حضور القائد لمناوبته (مرة واحدة لكل تكليف)
--
-- الأمان:
-- - القراءة لأي مستخدم مسجل الدخول، والكتابة للأدمن فقط
-- - القائد يُسجل حضوره لنفسه فقط عبر with check تتحقق أن التكليف
--   مسجّل باسمه فعلاً (حماية server-side حتى مع استدعاء API مباشرة)
-- - قيود UNIQUE تمنع تكرار القائد في اليوم، وتكرار الخانة،
--   وتكرار الحضور لنفس التكليف
-- ============================================================

-- ---------- جداول ----------
create table if not exists public.schedule_days (
  id uuid primary key default gen_random_uuid(),
  duty_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.schedule_days(id) on delete cascade,
  leader_id uuid not null references public.profiles(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  created_at timestamptz not null default now(),
  unique (day_id, leader_id),
  unique (day_id, slot)
);

create table if not exists public.schedule_attendance (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.schedule_assignments(id) on delete cascade,
  leader_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'PRESENT' check (status in ('PRESENT', 'ABSENT')),
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz not null default now()
);

create index if not exists schedule_days_date_idx on public.schedule_days(duty_date);
create index if not exists schedule_assignments_day_idx on public.schedule_assignments(day_id);
create index if not exists schedule_assignments_leader_idx on public.schedule_assignments(leader_id);
create index if not exists schedule_attendance_leader_idx on public.schedule_attendance(leader_id);

-- ---------- RLS ----------
alter table public.schedule_days enable row level security;
alter table public.schedule_assignments enable row level security;
alter table public.schedule_attendance enable row level security;

-- قراءة الجدول لكل المستخدمين المسجلين
drop policy if exists schedule_days_select on public.schedule_days;
create policy schedule_days_select on public.schedule_days
  for select using (auth.role() = 'authenticated');

drop policy if exists schedule_assignments_select on public.schedule_assignments;
create policy schedule_assignments_select on public.schedule_assignments
  for select using (auth.role() = 'authenticated');

drop policy if exists schedule_attendance_select on public.schedule_attendance;
create policy schedule_attendance_select on public.schedule_attendance
  for select using (auth.role() = 'authenticated');

-- الكتابة على الأيام والتكليفات: للأدمن فقط
drop policy if exists schedule_days_admin_write on public.schedule_days;
create policy schedule_days_admin_write on public.schedule_days
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists schedule_assignments_admin_write on public.schedule_assignments;
create policy schedule_assignments_admin_write on public.schedule_assignments
  for all using (public.is_admin()) with check (public.is_admin());

-- الحضور: الأدمن يفعل ما يشاء — القائد يسجل حضور نفسه فقط لتكليف مسجل باسمه
drop policy if exists schedule_attendance_admin_write on public.schedule_attendance;
create policy schedule_attendance_admin_write on public.schedule_attendance
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists schedule_attendance_self_insert on public.schedule_attendance;
create policy schedule_attendance_self_insert on public.schedule_attendance
  for insert with check (
    leader_id = auth.uid()
    and confirmed_by = auth.uid()
    and status = 'PRESENT'
    and exists (
      select 1 from public.schedule_assignments a
      where a.id = assignment_id and a.leader_id = auth.uid()
    )
  );
