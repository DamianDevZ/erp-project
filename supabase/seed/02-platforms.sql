-- ============================================================================
-- SEED DATA: Platforms (Aggregators)
-- ============================================================================
-- Food delivery and logistics platforms the company works with

INSERT INTO platforms (id, organization_id, name, code, type, logo_url, contact_email, contact_phone, commission_rate, payment_terms_days, api_config, status) VALUES
  (
    'p0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Talabat',
    'TALABAT',
    'food_delivery',
    '/logos/talabat.png',
    'partners@talabat.com',
    '+971 4 555 1234',
    15.0,
    14,
    '{"api_key": "tlbt_demo_key", "webhook_url": "https://api.swiftriders.ae/webhooks/talabat"}',
    'active'
  ),
  (
    'p0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Deliveroo',
    'DELIVEROO',
    'food_delivery',
    '/logos/deliveroo.png',
    'fleet@deliveroo.ae',
    '+971 4 555 2345',
    12.5,
    7,
    '{"api_key": "dlvr_demo_key", "webhook_url": "https://api.swiftriders.ae/webhooks/deliveroo"}',
    'active'
  ),
  (
    'p0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'Noon Food',
    'NOON',
    'food_delivery',
    '/logos/noon.png',
    'delivery@noon.com',
    '+971 4 555 3456',
    14.0,
    14,
    '{"api_key": "noon_demo_key", "webhook_url": "https://api.swiftriders.ae/webhooks/noon"}',
    'active'
  ),
  (
    'p0000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'Careem',
    'CAREEM',
    'food_delivery',
    '/logos/careem.png',
    'logistics@careem.com',
    '+971 4 555 4567',
    13.0,
    7,
    '{"api_key": "crm_demo_key", "webhook_url": "https://api.swiftriders.ae/webhooks/careem"}',
    'active'
  ),
  (
    'p0000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    'Instashop',
    'INSTASHOP',
    'grocery',
    '/logos/instashop.png',
    'ops@instashop.ae',
    '+971 4 555 5678',
    10.0,
    14,
    '{"api_key": "insta_demo_key", "webhook_url": "https://api.swiftriders.ae/webhooks/instashop"}',
    'active'
  ),
  (
    'p0000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000001',
    'Amazon',
    'AMAZON',
    'ecommerce',
    '/logos/amazon.png',
    'logistics@amazon.ae',
    '+971 4 555 6789',
    8.0,
    30,
    '{"api_key": "amz_demo_key", "webhook_url": "https://api.swiftriders.ae/webhooks/amazon"}',
    'active'
  ),
  (
    'p0000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000001',
    'Quiqup',
    'QUIQUP',
    'last_mile',
    '/logos/quiqup.png',
    'partners@quiqup.com',
    '+971 4 555 7890',
    18.0,
    7,
    '{"api_key": "quiq_demo_key", "webhook_url": "https://api.swiftriders.ae/webhooks/quiqup"}',
    'inactive'
  )
ON CONFLICT (id) DO NOTHING;

-- Platform rate cards (per-order earnings)
INSERT INTO platform_rate_cards (id, organization_id, platform_id, name, effective_from, base_rate, per_km_rate, peak_multiplier, night_multiplier, rain_multiplier) VALUES
  ('rc000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 'Talabat Standard 2026', '2026-01-01', 8.00, 1.50, 1.25, 1.15, 1.50),
  ('rc000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000002', 'Deliveroo Standard 2026', '2026-01-01', 7.50, 1.75, 1.30, 1.20, 1.40),
  ('rc000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000003', 'Noon Food 2026', '2026-01-01', 7.00, 1.50, 1.20, 1.10, 1.30),
  ('rc000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000004', 'Careem 2026', '2026-01-01', 8.50, 1.25, 1.25, 1.15, 1.35),
  ('rc000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000005', 'Instashop 2026', '2026-01-01', 10.00, 2.00, 1.10, 1.00, 1.20),
  ('rc000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000006', 'Amazon 2026', '2026-01-01', 12.00, 1.00, 1.00, 1.00, 1.00)
ON CONFLICT (id) DO NOTHING;

COMMIT;
