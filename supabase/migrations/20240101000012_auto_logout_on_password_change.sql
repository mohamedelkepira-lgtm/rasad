-- Auto-logout عند تغيير كلمة المرور: حذف refresh tokens للمستخدم
-- هذا يضمن أنه في أي وقت يتم فيه تدوير كلمة مرور (سواء لكل الحسابات أو لحساب واحد)، سيتم طرد الجلسات القديمة تلقائيًا
-- مع منطق AuthContext الذي يقارن updated_at بـ iat، سيتم تسجيل الخروج الفوري عند إعادة تحميل التطبيق

create or replace function public.handle_password_change_logout()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- فقط عند تغيير كلمة المرور
  if OLD.encrypted_password is distinct from NEW.encrypted_password then
    delete from auth.refresh_tokens where user_id::uuid = NEW.id;
    -- بعض إصدارات Supabase تستخدم جدول sessions أيضًا
    -- نحاول حذفه إن وجد (لن يفشل إذا لم يكن موجودًا أو بلا صلاحية)
    begin
      delete from auth.sessions where user_id = NEW.id;
    exception when others then
      -- تجاهل أي خطأ (مثل عدم وجود الجدول)
      null;
    end;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_password_change_logout on auth.users;
create trigger trg_password_change_logout
  after update of encrypted_password on auth.users
  for each row execute function public.handle_password_change_logout();
