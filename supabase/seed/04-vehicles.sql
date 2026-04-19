-- ============================================================================
-- SEED DATA: Vehicles & Fleet
-- ============================================================================
-- Company-owned and rented vehicles for delivery operations

-- Motorcycles / Bikes
INSERT INTO vehicles (id, organization_id, registration_number, type, make, model, year, color, status, ownership_type, current_employee_id, insurance_expiry, registration_expiry, next_service_date, odometer_reading, fuel_type) VALUES
  ('v0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'DXB A 12345', 'bike', 'Honda', 'PCX 150', 2024, 'White', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000009', '2027-01-15', '2027-01-15', '2026-07-01', 15420, 'petrol'),
  ('v0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'DXB A 12346', 'bike', 'Honda', 'PCX 150', 2024, 'White', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000010', '2027-01-20', '2027-01-20', '2026-07-15', 14850, 'petrol'),
  ('v0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'DXB A 12347', 'bike', 'Honda', 'PCX 150', 2024, 'Red', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000011', '2027-02-01', '2027-02-01', '2026-08-01', 13200, 'petrol'),
  ('v0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'DXB A 12348', 'bike', 'Honda', 'PCX 150', 2024, 'Red', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000012', '2027-02-15', '2027-02-15', '2026-08-15', 12890, 'petrol'),
  ('v0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'DXB A 12349', 'bike', 'Honda', 'PCX 150', 2023, 'White', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000013', '2026-08-01', '2026-08-01', '2026-05-15', 28500, 'petrol'),
  ('v0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'DXB A 12350', 'bike', 'Honda', 'PCX 150', 2023, 'White', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000014', '2026-08-15', '2026-08-15', '2026-06-01', 27340, 'petrol'),
  ('v0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'DXB A 12351', 'bike', 'Honda', 'Dio', 2024, 'Blue', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000015', '2027-03-01', '2027-03-01', '2026-09-01', 11200, 'petrol'),
  ('v0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'DXB A 12352', 'bike', 'Honda', 'Dio', 2024, 'Blue', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000016', '2027-03-15', '2027-03-15', '2026-09-15', 10890, 'petrol'),
  ('v0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'DXB A 12353', 'bike', 'Honda', 'Dio', 2024, 'Black', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000017', '2027-04-01', '2027-04-01', '2026-10-01', 9500, 'petrol'),
  ('v0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'DXB A 12354', 'bike', 'Honda', 'Dio', 2024, 'Black', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000018', '2027-04-15', '2027-04-15', '2026-10-15', 8900, 'petrol'),
  ('v0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'DXB A 12355', 'bike', 'Yamaha', 'NMAX', 2024, 'White', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000019', '2027-05-01', '2027-05-01', '2026-11-01', 7200, 'petrol'),
  ('v0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'DXB A 12356', 'bike', 'Yamaha', 'NMAX', 2024, 'White', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000020', '2027-05-15', '2027-05-15', '2026-11-15', 6800, 'petrol'),
  ('v0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'DXB A 12357', 'bike', 'Yamaha', 'NMAX', 2025, 'Red', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000021', '2028-01-01', '2028-01-01', '2027-01-01', 4500, 'petrol'),
  ('v0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'DXB A 12358', 'bike', 'Yamaha', 'NMAX', 2025, 'Red', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000022', '2028-01-15', '2028-01-15', '2027-01-15', 4200, 'petrol'),
  ('v0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'DXB A 12359', 'bike', 'Honda', 'Vision', 2025, 'White', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000023', '2028-02-01', '2028-02-01', '2027-02-01', 3800, 'petrol'),
  ('v0000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'DXB A 12360', 'bike', 'Honda', 'Vision', 2025, 'White', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000024', '2028-02-15', '2028-02-15', '2027-02-15', 3500, 'petrol'),
  ('v0000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'DXB A 12361', 'bike', 'Honda', 'Vision', 2025, 'Blue', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000025', '2028-03-01', '2028-03-01', '2027-03-01', 3100, 'petrol'),
  ('v0000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'DXB A 12362', 'bike', 'Honda', 'Vision', 2025, 'Blue', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000026', '2028-03-15', '2028-03-15', '2027-03-15', 2900, 'petrol'),
  ('v0000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'DXB A 12363', 'bike', 'TVS', 'Jupiter', 2025, 'Grey', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000027', '2028-04-01', '2028-04-01', '2027-04-01', 2500, 'petrol'),
  ('v0000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'DXB A 12364', 'bike', 'TVS', 'Jupiter', 2025, 'Grey', 'assigned', 'owned', 'e0000000-0000-0000-0000-000000000028', '2028-04-15', '2028-04-15', '2027-04-15', 2200, 'petrol')
ON CONFLICT (id) DO NOTHING;

-- Spare/Available bikes
INSERT INTO vehicles (id, organization_id, registration_number, type, make, model, year, color, status, ownership_type, insurance_expiry, registration_expiry, next_service_date, odometer_reading, fuel_type) VALUES
  ('v0000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'DXB A 12365', 'bike', 'Honda', 'PCX 150', 2024, 'White', 'available', 'owned', '2027-05-01', '2027-05-01', '2026-11-01', 5200, 'petrol'),
  ('v0000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'DXB A 12366', 'bike', 'Honda', 'PCX 150', 2024, 'White', 'available', 'owned', '2027-05-15', '2027-05-15', '2026-11-15', 4800, 'petrol'),
  ('v0000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', 'DXB A 12367', 'bike', 'Honda', 'Dio', 2024, 'Red', 'available', 'owned', '2027-06-01', '2027-06-01', '2026-12-01', 4500, 'petrol'),
  ('v0000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', 'DXB A 12368', 'bike', 'Yamaha', 'NMAX', 2025, 'Black', 'available', 'owned', '2028-05-01', '2028-05-01', '2027-05-01', 1500, 'petrol'),
  ('v0000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000001', 'DXB A 12369', 'bike', 'Yamaha', 'NMAX', 2025, 'Black', 'available', 'owned', '2028-05-15', '2028-05-15', '2027-05-15', 1200, 'petrol')
ON CONFLICT (id) DO NOTHING;

-- Bikes in maintenance
INSERT INTO vehicles (id, organization_id, registration_number, type, make, model, year, color, status, ownership_type, insurance_expiry, registration_expiry, next_service_date, odometer_reading, fuel_type, notes) VALUES
  ('v0000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000001', 'DXB A 12370', 'bike', 'Honda', 'PCX 150', 2023, 'White', 'maintenance', 'owned', '2026-06-01', '2026-06-01', '2026-04-20', 32000, 'petrol', 'Engine overhaul'),
  ('v0000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000001', 'DXB A 12371', 'bike', 'Honda', 'Dio', 2023, 'Blue', 'maintenance', 'owned', '2026-07-01', '2026-07-01', '2026-04-22', 29500, 'petrol', 'Brake replacement')
ON CONFLICT (id) DO NOTHING;

-- Rented bikes
INSERT INTO vehicles (id, organization_id, registration_number, type, make, model, year, color, status, ownership_type, current_employee_id, insurance_expiry, registration_expiry, next_service_date, odometer_reading, fuel_type, notes) VALUES
  ('v0000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000001', 'DXB B 55001', 'bike', 'Honda', 'PCX 150', 2025, 'Grey', 'assigned', 'rented', 'e0000000-0000-0000-0000-000000000029', '2026-12-31', '2026-12-31', '2026-10-01', 3500, 'petrol', 'Rented from FleetCo - AED 800/month'),
  ('v0000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000001', 'DXB B 55002', 'bike', 'Honda', 'PCX 150', 2025, 'Grey', 'assigned', 'rented', 'e0000000-0000-0000-0000-000000000030', '2026-12-31', '2026-12-31', '2026-10-15', 3200, 'petrol', 'Rented from FleetCo - AED 800/month'),
  ('v0000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'DXB B 55003', 'bike', 'Yamaha', 'NMAX', 2025, 'Black', 'assigned', 'rented', 'e0000000-0000-0000-0000-000000000031', '2026-12-31', '2026-12-31', '2026-11-01', 2800, 'petrol', 'Rented from BikeRent LLC - AED 850/month')
ON CONFLICT (id) DO NOTHING;

-- Vans for larger deliveries
INSERT INTO vehicles (id, organization_id, registration_number, type, make, model, year, color, status, ownership_type, insurance_expiry, registration_expiry, next_service_date, odometer_reading, fuel_type) VALUES
  ('v0000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'DXB C 98001', 'van', 'Nissan', 'Urvan', 2023, 'White', 'available', 'owned', '2026-09-01', '2026-09-01', '2026-06-01', 45000, 'diesel'),
  ('v0000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', 'DXB C 98002', 'van', 'Nissan', 'Urvan', 2024, 'White', 'available', 'owned', '2027-03-01', '2027-03-01', '2026-09-01', 22000, 'diesel')
ON CONFLICT (id) DO NOTHING;

-- Maintenance Records
INSERT INTO maintenance_records (id, organization_id, vehicle_id, type, description, status, scheduled_date, completed_date, vendor, cost, odometer_at_service, parts_replaced) VALUES
  ('mr000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000001', 'scheduled', 'Regular 15,000 km service', 'completed', '2026-03-01', '2026-03-01', 'Honda Service Center', 450, 15000, 'Oil, filters, spark plug'),
  ('mr000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000002', 'scheduled', 'Regular 15,000 km service', 'completed', '2026-03-10', '2026-03-10', 'Honda Service Center', 420, 14500, 'Oil, filters'),
  ('mr000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000026', 'repair', 'Engine overhaul - loss of power', 'in_progress', '2026-04-15', NULL, 'Al Futtaim Motors', 2500, 32000, NULL),
  ('mr000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000027', 'repair', 'Brake pad replacement', 'scheduled', '2026-04-22', NULL, 'Quick Fix Garage', 350, 29500, NULL),
  ('mr000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000005', 'scheduled', '30,000 km major service', 'scheduled', '2026-05-15', NULL, 'Honda Service Center', 850, 28500, NULL)
ON CONFLICT (id) DO NOTHING;

COMMIT;
