-- เดิมหน้า Settings บันทึก URL เต็มลง DB (เช่น "http://localhost:3000/sounds/x.mp3")
-- ทำให้ค่าที่เก็บไว้ผูกกับ host ของเครื่องที่ตั้งค่าไว้ตอนนั้น พอย้าย backend ขึ้นโดเมนจริง
-- หรือเปลี่ยนพอร์ต เสียงและรูป overlay ทั้งหมดจะโหลดไม่ขึ้น
--
-- ตอนนี้เก็บเป็น path อย่างเดียว แล้วให้ frontend ประกอบกับ API_URL ตอนใช้งาน
-- migration นี้ตัดส่วน scheme + host ออกจากค่าที่มีอยู่แล้ว

UPDATE "Setting"
SET "alertSound" = regexp_replace("alertSound", '^https?://[^/]+', '')
WHERE "alertSound" ~ '^https?://';

UPDATE "Setting"
SET "overlayImage" = regexp_replace("overlayImage", '^https?://[^/]+', '')
WHERE "overlayImage" ~ '^https?://';
