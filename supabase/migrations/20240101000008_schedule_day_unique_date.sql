-- فرض فريدية يوم المناوبة: منع تكرار نفس التاريخ لأي سباق توليد
delete from public.schedule_days a
using public.schedule_days b
where a.duty_date = b.duty_date and a.id > b.id;

alter table public.schedule_days
  add constraint schedule_days_duty_date_key unique (duty_date);
