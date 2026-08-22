-- ============================================================
-- Security Hardening Phase 1
-- 1) إغلاق ثغرة Leader → Admin Escalation:
--    سحب صلاحية UPDATE الكاملة عن authenticated على profiles،
--    والسماح بتحديث عمود الاسم فقط (الصلاحيات تُدار خارج الـAPI).
-- 2) فرض هوية مسجّل المخالفة: created_by يُفرض من auth.uid()
--    و created_at/month_key يعتمدان وقت السيرفر عند أي إدخال عبر API.
-- 3) ربط violations_insert بالمستخدم الفعلي (created_by = auth.uid()).
-- كل الخطوات idempotent وآمنة على البيانات الموجودة.
-- ============================================================

-- ---------- 1) profiles: لا أحد يعدل الأدوار عبر الـAPI ----------
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- الإدخال الذاتي مقفول على دور القائد فقط (إنشاء الحسابات يتم عبر SQL كـpostgres)
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id and role = 'leader');

-- ---------- 2) violations: هوية المسجل والتimestamp من السيرفر ----------
create or replace function public.enforce_violation_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- عند الدخول عبر الـAPI (يوجد JWT) نتجاهل قيم العميل تمامًا؛
  -- السكربتات الداخلية (postgres بلا JWT) تحتفظ بقيمها لعمليات البذر.
  if auth.uid() is not null then
    new.created_by := auth.uid();
    new.created_at := now();
    new.month_key := to_char(new.created_at, 'YYYY-MM');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_violations_integrity on public.violations;
create trigger trg_violations_integrity
  before insert on public.violations
  for each row execute function public.enforce_violation_integrity();

-- ---------- 3) ربط المخالفة بصاحبها ----------
drop policy if exists violations_insert on public.violations;
create policy violations_insert on public.violations
  for insert with check (
    auth.role() = 'authenticated'
    and created_by = auth.uid()
  );
