-- QR Menu Platform — Database Schema
-- PostgreSQL. Generic menu schema (platform rewrite Phase 1).
-- Safe to re-run: tables use IF NOT EXISTS; daily_prices is intentionally
-- dropped and recreated because its shape changed from fixed meat columns
-- to a generic per-item structure.

-- Shops table
CREATE TABLE IF NOT EXISTS shops (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    qr_code_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generic-platform columns (added in platform rewrite Phase 1)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS business_type VARCHAR(20) DEFAULT 'daily_menu';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS description TEXT;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'shop_owner')),
    shop_id INTEGER REFERENCES shops(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drop the legacy fixed-column daily_prices (test data, replaced below).
DROP TABLE IF EXISTS daily_prices;

-- Menu categories per shop (e.g. "Fresh Juices", "Meat Items")
CREATE TABLE IF NOT EXISTS shop_categories (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Menu items per shop. `price` holds the current price for static_menu shops;
-- for daily_menu shops the live price comes from daily_prices.
CREATE TABLE IF NOT EXISTS shop_items (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES shop_categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'per glass',
    is_available BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Date-based prices for daily_menu shops. One row per item per day.
CREATE TABLE IF NOT EXISTS daily_prices (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES shop_items(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(shop_id, item_id, date)
);

-- Sample shop (explicit id so users can reference it; shops has no natural unique key)
INSERT INTO shops (id, name, address, qr_code_url, business_type)
VALUES (
    1,
    'Fresh Meat Market',
    '123 Main Street, City',
    'https://example.com/qr/fresh-market',
    'daily_menu'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (name, email, password_hash, role, shop_id)
VALUES (
    'Admin',
    'admin@example.com',
    '$2b$10$Rchy1hd5zal0ZwtUXyqubO0iRfA0/82VI8qFtq0bAnmW25utGiwAq',
    'super_admin',
    NULL
),
(
    'Shop Owner',
    'owner@example.com',
    '$2b$10$/rjd/vreX5yEg2HEtZDBseoestSl.NHKeaK5GPyNQ3KOVXK6fnVBK',
    'shop_owner',
    1
)
ON CONFLICT (email) DO NOTHING;

-- Keep the shops id sequence ahead of the explicit id above.
SELECT setval(pg_get_serial_sequence('shops', 'id'), GREATEST((SELECT MAX(id) FROM shops), 1));