-- ============================================================================
-- YuenDeaw People OS — 0012 auto-generate employee_code
-- พนักงาน → YD-xxx · เด็กฝึกงาน → TR-xxx · กันรันซ้ำด้วย advisory lock + UNIQUE
-- ============================================================================

create or replace function public.gen_employee_code()
returns trigger language plpgsql as $$
declare
  pfx text;
  n   int;
begin
  -- ถ้ามีรหัสมาแล้ว (กรอกเอง / นำเข้า) ไม่ต้องออกให้
  if new.employee_code is not null and btrim(new.employee_code) <> '' then
    return new;
  end if;

  -- prefix ตามรูปแบบการจ้างงาน: เด็กฝึกงาน = TR, ที่เหลือ = YD
  select case when et.key = 'intern' then 'TR' else 'YD' end
    into pfx
  from public.employment_types et
  where et.id = new.employment_type_id;
  pfx := coalesce(pfx, 'YD');

  -- ล็อกต่อ prefix → insert พร้อมกันก็ไม่ได้เลขซ้ำ (รอจนอีก transaction commit)
  perform pg_advisory_xact_lock(hashtext('emp_code_' || pfx));

  select coalesce(max(nullif(regexp_replace(employee_code, '\D', '', 'g'), '')::int), 0) + 1
    into n
  from public.employees
  where employee_code like pfx || '-%';

  new.employee_code := pfx || '-' || lpad(n::text, 3, '0');
  return new;
end; $$;

drop trigger if exists trg_gen_employee_code on public.employees;
create trigger trg_gen_employee_code
  before insert on public.employees
  for each row execute function public.gen_employee_code();
