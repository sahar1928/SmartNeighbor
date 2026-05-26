INSERT INTO buildings (id, name, address, units, balance_cents, monthly_fee_cents, collection_rate, emergency_fund_cents)
VALUES ('bldg-rtl-24', 'בניין רוטשילד 24', 'רוטשילד 24, תל אביב', 40, 940000, 35000, 78, 4520000);

INSERT INTO residents (id, building_id, name, apartment, floor, role, access_token_hash, consent_ai_processing)
VALUES
  ('res-1', 'bldg-rtl-24', 'דני לוי', '4ב', 2, 'resident', '9388541163130c8806b72ce24499dcb207b7add5086733fe94ebd54b6689318e', true),
  ('res-2', 'bldg-rtl-24', 'שרה כהן', '4', 2, 'resident', 'b13eb94f039c0ff05cb61c8c02382f8de204803c4491551fe8a92352d3da3399', true),
  ('res-3', 'bldg-rtl-24', 'יוסי מזרחי', '11', 5, 'committee', 'ff42c15780678723a45548704a78ee417d52c3643ebe2d9791c7122c32f54ecb', true),
  ('res-4', 'bldg-rtl-24', 'מיכל ברק', '1א', 1, 'chair', 'c44b77ad87444bee4662906da01d2e62f2aef91fd3ee4cede9c09e966a9f1b8b', true);

INSERT INTO providers (id, name, domain, phone, rating, avg_response_hours)
VALUES
  ('prov-1', 'מרק שירותי אינסטלציה וגז', 'אינסטלציה וגז', '+972-50-123-4567', 4.7, 2),
  ('prov-2', 'אור חשמל', 'חשמל', '+972-52-234-5678', 4.5, 4),
  ('prov-3', 'רחל ניקיון', 'ניקיון', '+972-54-345-6789', 4.9, 6);

INSERT INTO payments (id, building_id, resident_id, amount_cents, method, status, paid_at)
VALUES
  ('pay-1', 'bldg-rtl-24', 'res-2', 35000, 'Bit', 'paid', '2026-05-03T10:00:00+03:00'),
  ('pay-2', 'bldg-rtl-24', 'res-3', 35000, 'credit_card', 'paid', '2026-05-02T10:00:00+03:00'),
  ('pay-3', 'bldg-rtl-24', 'res-1', 35000, NULL, 'late', NULL);

INSERT INTO resident_charges (id, building_id, resident_id, title, description, amount_cents, status, due_date, category)
VALUES
  ('chg-1', 'bldg-rtl-24', 'res-1', 'ועד בית מאי 2026', 'דמי ועד חודשיים לדירה 4ב', 35000, 'open', '2026-05-10', 'monthly_fee'),
  ('chg-2', 'bldg-rtl-24', 'res-1', 'השתתפות תיקון מעלית', 'חלוקת עלות תיקון חירום במעלית', 12000, 'open', '2026-06-01', 'maintenance'),
  ('chg-3', 'bldg-rtl-24', 'res-2', 'ועד בית מאי 2026', 'דמי ועד חודשיים לדירה 4', 35000, 'paid', '2026-05-10', 'monthly_fee');

INSERT INTO resident_ledger (id, resident_id, type, title, amount_cents, posted_at)
VALUES
  ('led-1', 'res-1', 'charge', 'ועד בית מאי 2026', 35000, '2026-05-01'),
  ('led-2', 'res-1', 'charge', 'השתתפות תיקון מעלית', 12000, '2026-05-22'),
  ('led-3', 'res-2', 'charge', 'ועד בית מאי 2026', 35000, '2026-05-01'),
  ('led-4', 'res-2', 'payment', 'תשלום Bit', -35000, '2026-05-03');

INSERT INTO maintenance_tickets (id, building_id, reporter_id, provider_id, title, description, category, priority, status, location, sla_hours, opened_at)
VALUES
  ('T-2847', 'bldg-rtl-24', NULL, 'prov-1', 'ריח גז בחדר מדרגות', 'דווח ריח גז בחדר המדרגות בקומה ג', 'gas', 'P0', 'assigned', 'חדר מדרגות, קומה ג', 1, '2026-05-26T09:15:00+03:00'),
  ('T-2848', 'bldg-rtl-24', 'res-2', 'prov-2', 'נורה שרופה בלובי', 'תאורת הכניסה לא עובדת', 'electricity', 'P2', 'open', 'לובי', 48, '2026-05-25T18:20:00+03:00');

INSERT INTO community_posts (id, building_id, author_id, channel, title, body, pinned)
VALUES
  ('post-1', 'bldg-rtl-24', 'res-4', 'announcements', 'אסיפת דיירים חודשית', 'האסיפה תתקיים ביום ראשון בשעה 20:00 בלובי.', true),
  ('post-2', 'bldg-rtl-24', 'res-1', 'help', 'המלצה על גנן', 'מחפשים המלצה לגנן להחלפת שתילים בכניסה.', false);

INSERT INTO library_items (id, building_id, owner_id, name, category, description, status, max_days, loans_count, notes)
VALUES
  ('item-1', 'bldg-rtl-24', 'res-2', 'מקדחה Bosch GSB 18V', 'tools', 'מקדחה ביתית', 'available', 3, 3, 'יש 2 ביטים. להחזיר בסוף יום.'),
  ('item-2', 'bldg-rtl-24', 'res-3', 'סולם מתקפל', 'tools', 'סולם לעבודות פנים', 'available', 2, 5, 'לתאם מראש.');
