-- Fix trigger to only enforce server timestamp, not created_by
-- created_by is enforced by RLS (with check created_by = auth.uid()) and must be sent correctly by client
-- Overwriting it silently would hide forgery attempts; we want them to be DENIED
create or replace function public.enforce_violation_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    -- Always use server time for created_at/month_key, ignore client values
    new.created_at := now();
    new.month_key := to_char(new.created_at, 'YYYY-MM');
  end if;
  return new;
end;
$$;
