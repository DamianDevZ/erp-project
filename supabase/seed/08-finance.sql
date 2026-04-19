-- ============================================================================
-- SEED DATA: Invoices & Finance
-- ============================================================================
-- Platform invoices and financial records

-- Invoices to platforms (March 2026 completed)
INSERT INTO invoices (id, organization_id, platform_id, invoice_number, period_start, period_end, issued_at, due_at, status, subtotal, tax_rate, tax_amount, total, paid_at) VALUES
  ('inv00000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 'INV-2026-00001', '2026-03-01', '2026-03-31', '2026-04-01', '2026-04-15', 'paid', 45000.00, 5.0, 2250.00, 47250.00, '2026-04-12'),
  ('inv00000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000002', 'INV-2026-00002', '2026-03-01', '2026-03-31', '2026-04-01', '2026-04-08', 'paid', 32000.00, 5.0, 1600.00, 33600.00, '2026-04-07'),
  ('inv00000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000003', 'INV-2026-00003', '2026-03-01', '2026-03-31', '2026-04-01', '2026-04-15', 'paid', 28000.00, 5.0, 1400.00, 29400.00, '2026-04-14'),
  ('inv00000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000004', 'INV-2026-00004', '2026-03-01', '2026-03-31', '2026-04-01', '2026-04-08', 'paid', 22000.00, 5.0, 1100.00, 23100.00, '2026-04-06'),
  ('inv00000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000005', 'INV-2026-00005', '2026-03-01', '2026-03-31', '2026-04-01', '2026-04-15', 'paid', 18000.00, 5.0, 900.00, 18900.00, '2026-04-13'),
  ('inv00000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000006', 'INV-2026-00006', '2026-03-01', '2026-03-31', '2026-04-01', '2026-05-01', 'sent', 25000.00, 5.0, 1250.00, 26250.00, NULL)
ON CONFLICT (id) DO NOTHING;

-- April invoices (in progress)
INSERT INTO invoices (id, organization_id, platform_id, invoice_number, period_start, period_end, issued_at, due_at, status, subtotal, tax_rate, tax_amount, total) VALUES
  ('inv00000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 'INV-2026-00007', '2026-04-01', '2026-04-30', '2026-04-19', '2026-05-03', 'draft', 28500.00, 5.0, 1425.00, 29925.00),
  ('inv00000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000002', 'INV-2026-00008', '2026-04-01', '2026-04-30', '2026-04-19', '2026-04-26', 'draft', 19200.00, 5.0, 960.00, 20160.00)
ON CONFLICT (id) DO NOTHING;

-- Payroll batches
INSERT INTO payroll_batches (id, organization_id, period_start, period_end, status, total_employees, total_gross_pay, total_deductions, total_net_pay, processed_at, approved_by, approved_at) VALUES
  ('pb000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-03-01', '2026-03-31', 'completed', 35, 156000.00, 12000.00, 144000.00, '2026-04-01 10:00:00', 'e0000000-0000-0000-0000-000000000001', '2026-04-01 14:00:00'),
  ('pb000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '2026-02-01', '2026-02-28', 'completed', 33, 148000.00, 11500.00, 136500.00, '2026-03-01 10:00:00', 'e0000000-0000-0000-0000-000000000001', '2026-03-01 14:00:00')
ON CONFLICT (id) DO NOTHING;

-- Employee advances
INSERT INTO employee_advances (id, organization_id, employee_id, amount, reason, status, approved_by, approved_at, disbursed_at, repayment_method, amount_repaid) VALUES
  ('adv00000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000015', 2000.00, 'Family emergency - medical expenses', 'approved', 'e0000000-0000-0000-0000-000000000003', '2026-04-10 14:00:00', '2026-04-10 16:00:00', 'salary_deduction', 0.00),
  ('adv00000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000020', 1500.00, 'Rent payment assistance', 'partial', 'e0000000-0000-0000-0000-000000000003', '2026-03-15 11:00:00', '2026-03-15 15:00:00', 'salary_deduction', 500.00),
  ('adv00000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000025', 1000.00, 'Vehicle repair for personal bike', 'pending', NULL, NULL, NULL, NULL, 0.00)
ON CONFLICT (id) DO NOTHING;

-- Petty cash transactions
INSERT INTO petty_cash (id, organization_id, type, amount, category, description, recipient, transaction_date) VALUES
  ('pc000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'deposit', 10000.00, 'fund', 'Monthly petty cash fund allocation', 'Finance Dept', '2026-04-01'),
  ('pc000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'withdrawal', 450.00, 'office_supplies', 'Stationery and printer ink', 'Sara Abdullah', '2026-04-05'),
  ('pc000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'withdrawal', 320.00, 'rider_equipment', 'Delivery bags (4 units)', 'Ravi Kumar', '2026-04-08'),
  ('pc000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'withdrawal', 180.00, 'refreshments', 'Water and coffee for office', 'Mohammed Khalid', '2026-04-12'),
  ('pc000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'withdrawal', 750.00, 'emergency_repairs', 'Emergency phone screen replacement for rider', 'Ali Hussain', '2026-04-15'),
  ('pc000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'withdrawal', 200.00, 'transportation', 'Taxi fare for document pickup', 'Fatima Hassan', '2026-04-18')
ON CONFLICT (id) DO NOTHING;

-- Traffic violations
INSERT INTO traffic_violations (id, organization_id, vehicle_id, employee_id, violation_type, description, fine_amount, violation_date, location, status, reference_number) VALUES
  ('tv000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000013', 'speeding', 'Speed violation - 75km/h in 60km/h zone', 600.00, '2026-04-10', 'Sheikh Zayed Road, near Mall of Emirates', 'pending', 'RTA-2026-456789'),
  ('tv000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000016', 'parking', 'Illegal parking - no parking zone', 500.00, '2026-04-05', 'Downtown Dubai, near Burj Khalifa', 'paid', 'RTA-2026-456123'),
  ('tv000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000020', 'red_light', 'Red light violation', 1000.00, '2026-03-28', 'Business Bay, Signal 45', 'paid', 'RTA-2026-455890')
ON CONFLICT (id) DO NOTHING;

COMMIT;
