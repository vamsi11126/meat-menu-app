-- QR Menu Platform — seed data (idempotent / safely re-runnable)
-- Assumes schema.sql has already created the tables.
-- Test credentials: admin@example.com / admin123, owner@example.com / owner123

-- Sample shop (explicit id so users can reference it; shops has no natural unique key)
INSERT INTO shops (id, name, address, qr_code_url, business_type)
VALUES (1, 'Fresh Meat Market', '123 Main Street, City', 'https://example.com/qr/fresh-market', 'daily_menu')
ON CONFLICT (id) DO NOTHING;

-- Ensure the existing shop is marked daily_menu even if it predates business_type.
UPDATE shops SET business_type = 'daily_menu' WHERE id = 1 AND business_type IS NULL;

-- Test users (email is UNIQUE, so conflict on email)
INSERT INTO users (name, email, password_hash, role, shop_id)
VALUES
    ('Admin', 'admin@example.com', '$2b$10$Rchy1hd5zal0ZwtUXyqubO0iRfA0/82VI8qFtq0bAnmW25utGiwAq', 'super_admin', NULL),
    ('Shop Owner', 'owner@example.com', '$2b$10$/rjd/vreX5yEg2HEtZDBseoestSl.NHKeaK5GPyNQ3KOVXK6fnVBK', 'shop_owner', 1)
ON CONFLICT (email) DO NOTHING;

-- Default category for Fresh Meat Market.
-- shop_categories has no unique constraint, so guard re-runs with NOT EXISTS.
INSERT INTO shop_categories (shop_id, name, display_order)
SELECT 1, 'Meat Items', 1
WHERE NOT EXISTS (
    SELECT 1 FROM shop_categories WHERE shop_id = 1 AND name = 'Meat Items'
);

-- Default items for Fresh Meat Market (unit: per kg), under "Meat Items".
-- shop_items has no unique constraint, so each insert is guarded by NOT EXISTS
-- on (shop_id, name) to stay idempotent.
INSERT INTO shop_items (shop_id, category_id, name, price, unit, display_order)
SELECT 1, (SELECT id FROM shop_categories WHERE shop_id = 1 AND name = 'Meat Items' LIMIT 1),
       v.name, 0, 'per kg', v.display_order
FROM (VALUES
    ('Chicken', 1),
    ('Mutton', 2),
    ('Fish', 3),
    ('Eggs', 4)
) AS v(name, display_order)
WHERE NOT EXISTS (
    SELECT 1 FROM shop_items si WHERE si.shop_id = 1 AND si.name = v.name
);

-- Keep the shops id sequence ahead of the explicit id above so future
-- auto-generated inserts don't collide with id=1.
SELECT setval(pg_get_serial_sequence('shops', 'id'), GREATEST((SELECT MAX(id) FROM shops), 1));
