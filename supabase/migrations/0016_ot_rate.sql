-- เรตค่า OT ต่อครั้ง กำหนดรายคนโดย owner (เว้นว่าง = ใช้ค่าเริ่มต้นในโค้ด 600)
alter table employees add column if not exists ot_rate numeric(8,2);

-- จำนวนชั่วโมงที่ทำ (เผื่อ 0015 ถูกรันไปก่อนที่จะเพิ่ม hours)
alter table ot_requests add column if not exists hours numeric(4,1);
