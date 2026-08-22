-- Fix violations SELECT to allow leaders to read own violations (needed for insert…select)
-- and ensure INSERT still requires created_by = auth.uid()
drop policy if exists violations_select on public.violations;
create policy violations_select on public.violations
  for select using (is_admin() OR created_by = auth.uid());

drop policy if exists violations_insert on public.violations;
create policy violations_insert on public.violations
  for insert with check (auth.role() = 'authenticated' and created_by = auth.uid());

-- Recreate integrity trigger (was dropped during debugging)
create or replace function public.enforce_violation_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
