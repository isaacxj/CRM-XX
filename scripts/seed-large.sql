-- Large local dataset for checking performance: 2,000 companies, 3,000
-- contacts, 2,400 deals, 10,000 activities and 4,000 tasks. Replaces
-- everything in the local database. Run with `pnpm db:seed:large`;
-- `pnpm db:seed` puts the small demo data back.
DELETE FROM deal_events;
DELETE FROM tasks;
DELETE FROM activities;
DELETE FROM deals;
DELETE FROM contacts;
DELETE FROM companies;
DELETE FROM sqlite_sequence;

-- Companies 1-1000 are Statixx, 1001-2000 are Trazo. A fifth are clients,
-- a tenth are past clients, and every 40th is archived.
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 2000)
INSERT INTO companies (business, name, website, status, source, archived_at, created_at, updated_at)
SELECT
  CASE WHEN i <= 1000 THEN 'statixx' ELSE 'trazo' END,
  'Large company ' || printf('%04d', i),
  'https://company' || i || '.example.com',
  CASE WHEN i % 10 = 0 THEN 'past' WHEN i % 5 = 0 THEN 'client' ELSE 'prospect' END,
  CASE i % 4 WHEN 0 THEN 'referral' WHEN 1 THEN 'website' WHEN 2 THEN 'conference' ELSE 'cold outreach' END,
  CASE WHEN i % 40 = 0 THEN datetime('now', '-3 days') END,
  datetime('now', '-' || (i % 300 + 30) || ' days'),
  datetime('now', '-' || (i % 300 + 30) || ' days')
FROM n;

WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 3000)
INSERT INTO contacts (company_id, name, email, phone, title)
SELECT
  (i - 1) % 2000 + 1,
  'Contact ' || printf('%04d', i),
  'contact' || i || '@company' || ((i - 1) % 2000 + 1) || '.example.com',
  '555-' || printf('%04d', i),
  CASE i % 3 WHEN 0 THEN 'Founder' WHEN 1 THEN 'Operations lead' ELSE 'Head of sales' END
FROM n;

-- Statixx deals use its stage list, Trazo deals use its own; one in six is
-- monthly. About 200 end up open on each board.
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 2400)
INSERT INTO deals (company_id, title, stage, amount_cents, billing, close_date, lost_reason, created_at, updated_at)
SELECT
  (i - 1) % 2000 + 1,
  'Deal ' || printf('%04d', i),
  CASE WHEN (i - 1) % 2000 + 1 <= 1000
    THEN CASE i % 6 WHEN 0 THEN 'qualified' WHEN 1 THEN 'discovery' WHEN 2 THEN 'proposal_sent' WHEN 3 THEN 'negotiation' WHEN 4 THEN 'won' ELSE 'lost' END
    ELSE CASE i % 7 WHEN 0 THEN 'qualified' WHEN 1 THEN 'discovery' WHEN 2 THEN 'demo' WHEN 3 THEN 'pilot' WHEN 4 THEN 'proposal' WHEN 5 THEN 'won' ELSE 'lost' END
  END,
  (i % 40 + 1) * 50000,
  CASE WHEN i % 6 = 0 THEN 'monthly' ELSE 'one_time' END,
  NULL,
  NULL,
  datetime('now', '-' || (i % 200 + 20) || ' days'),
  datetime('now', '-' || (i % 90) || ' days')
FROM n;
UPDATE deals SET lost_reason = 'Budget cut', close_date = date(updated_at) WHERE stage = 'lost';
UPDATE deals SET close_date = date(updated_at) WHERE stage = 'won';

INSERT INTO deal_events (deal_id, from_stage, to_stage, created_at)
SELECT id, 'qualified', stage, updated_at FROM deals WHERE stage <> 'qualified';

WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 10000)
INSERT INTO activities (company_id, contact_id, type, subject, body, occurred_at, owner_email)
SELECT
  (i - 1) % 2000 + 1,
  NULL,
  CASE i % 5 WHEN 0 THEN 'note' WHEN 1 THEN 'email_sent' WHEN 2 THEN 'email_received' WHEN 3 THEN 'call' ELSE 'meeting' END,
  'Activity ' || i,
  'Notes for activity ' || i,
  datetime('now', '-' || (i % 150) || ' days', '-' || (i % 24) || ' hours'),
  CASE i % 2 WHEN 0 THEN 'you@example.com' ELSE 'teammate@example.com' END
FROM n;

-- Open follow-ups spread around today; every fourth is already done.
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 4000)
INSERT INTO tasks (company_id, title, due_date, done_at, kind, owner_email)
SELECT
  (i - 1) % 2000 + 1,
  'Follow up ' || i,
  date('now', (i % 30 - 10) || ' days'),
  CASE WHEN i % 4 = 0 THEN datetime('now', '-1 days') END,
  'follow_up',
  CASE i % 2 WHEN 0 THEN 'you@example.com' ELSE 'teammate@example.com' END
FROM n;
