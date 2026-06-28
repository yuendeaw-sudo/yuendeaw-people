-- เก็บเหตุผล/หมายเหตุการออกจากงาน (offboard → status alumni)
alter table employees add column if not exists exit_reason text;
alter table employees add column if not exists exit_note text;
