-- Meat Menu App Database Schema
-- PostgreSQL tables for Phase 1

-- Shops table
CREATE TABLE IF NOT EXISTS shops (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    qr_code_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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



-- Daily prices table
CREATE TABLE IF NOT EXISTS daily_prices (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER REFERENCES shops(id),
    date DATE NOT NULL,
    chicken_kg DECIMAL(10, 2) NOT NULL DEFAULT 0,
    mutton_kg DECIMAL(10, 2) NOT NULL DEFAULT 0,
    fish_kg DECIMAL(10, 2) NOT NULL DEFAULT 0,
    eggs_kg DECIMAL(10, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shop_id, date)
);

-- Insert sample data for development (idempotent — safe to re-run)
INSERT INTO shops (id, name, address, qr_code_url)
VALUES (
    1,
    'Fresh Meat Market',
    '123 Main Street, City',
    'https://example.com/qr/fresh-market'
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
