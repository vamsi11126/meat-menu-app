-- Meat Menu App — seed data (idempotent / safely re-runnable)
-- Assumes schema.sql has already created the tables.
-- Test credentials: admin@example.com / admin123, owner@example.com / owner123

-- Sample shop (explicit id so users can reference it; shops has no natural unique key)
INSERT INTO shops (id, name, address, qr_code_url)
VALUES (1, 'Fresh Meat Market', '123 Main Street, City', 'https://example.com/qr/fresh-market')
ON CONFLICT (id) DO NOTHING;

-- Test users (email is UNIQUE, so conflict on email)
INSERT INTO users (name, email, password_hash, role, shop_id)
VALUES
    ('Admin', 'admin@example.com', '$2b$10$Rchy1hd5zal0ZwtUXyqubO0iRfA0/82VI8qFtq0bAnmW25utGiwAq', 'super_admin', NULL),
    ('Shop Owner', 'owner@example.com', '$2b$10$/rjd/vreX5yEg2HEtZDBseoestSl.NHKeaK5GPyNQ3KOVXK6fnVBK', 'shop_owner', 1)
ON CONFLICT (email) DO NOTHING;

-- Keep the shops id sequence ahead of the explicit id above so future
-- auto-generated inserts don't collide with id=1.
SELECT setval(pg_get_serial_sequence('shops', 'id'), GREATEST((SELECT MAX(id) FROM shops), 1));
