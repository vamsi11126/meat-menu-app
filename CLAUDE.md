# QR Menu Platform — Project Context

## What this project is
A generic QR code menu platform for small businesses.
Shop owners manage their menu via web admin panel or mobile app.
Customers scan a QR code to view the live menu in their browser — no app needed.

Originally built for meat shops. Now being scaled to support any business type
(juice bars, fruit shops, restaurants, etc.) with dynamic items and categories.

## Users
- Super Admin: manages shops and owners (web only)
- Shop Owner: manages menu items, categories, prices, QR code (web + mobile)
- Customer: scans QR, views menu in browser (no login, no app required)

## Business types
- daily_menu: owner sets prices every morning (meat shops)
  Prices stored in daily_prices table. Falls back to most recent price if not updated today.
- static_menu: owner edits prices whenever they change (juice bars, restaurants)
  Prices stored directly on shop_items. No daily entry workflow.

## Tech stack
- Backend: Node.js + Express + PostgreSQL (Supabase hosted)
- Web frontend: React.js (Vite) + Tailwind CSS
- Mobile app: React Native (Expo SDK 54)
- Auth: JWT (localStorage on web, AsyncStorage on mobile)
- QR generation: qrcode + qrcode.react

## Production URLs
- Web admin: https://web-gamma-eosin-99.vercel.app
- Backend API: https://meat-menu-app.onrender.com
- Database: Supabase (PostgreSQL)
- QR codes link to: https://web-gamma-eosin-99.vercel.app/menu/:shopId

## Folder structure
meat-menu-app/
  backend/    → Node.js + Express API
  web/        → React.js admin panel
  mobile/     → React Native Expo SDK 54 app
  CLAUDE.md   → this file

## Database schema (current — post platform rewrite)

### Existing tables (unchanged)
- users (id, name, email, password_hash, role: 'super_admin'|'shop_owner', shop_id)
- shops (id, name, address, qr_code_url, business_type, description, created_at)

### New tables (added in platform rewrite Phase 1)
- shop_categories (id, shop_id, name, display_order, created_at)
- shop_items (id, shop_id, category_id, name, price, unit, is_available, display_order, created_at, updated_at)
- daily_prices (id, shop_id, item_id, date, price, updated_at) — UNIQUE(shop_id, item_id, date)
  Note: daily_prices now references shop_items.id (not fixed columns)

## API routes

### Auth
POST   /api/auth/login
PUT    /api/auth/change-password     (shop owner — JWT required)

### Shops (super admin)
GET    /api/shops                    (super admin only)
POST   /api/shops                    (super admin only)

### Shop owner self-management
GET    /api/shops/me                 (owner — returns own shop + QR URL)
PUT    /api/shops/me/name            (owner — update shop display name)

### Categories
GET    /api/shops/:id/categories     (public)
POST   /api/shops/me/categories      (owner only)
PUT    /api/shops/me/categories/:id  (owner only)
DELETE /api/shops/me/categories/:id  (owner only)

### Items
GET    /api/shops/:id/items                        (public)
POST   /api/shops/me/items                         (owner only)
PUT    /api/shops/me/items/:id                     (owner only)
DELETE /api/shops/me/items/:id                     (owner only)
PATCH  /api/shops/me/items/:id/availability        (owner only)

### Prices
GET    /api/shops/:id/prices         (public — behavior differs by business_type)
POST   /api/shops/me/prices          (owner only — behavior differs by business_type)

Price behavior by business_type:
- daily_menu: reads/writes daily_prices table (date-based)
- static_menu: reads/writes price directly on shop_items table

## Key rules
- Never expose password hashes in API responses
- QR code links to /menu/:shopId and never changes
- Super admin only accessible via web
- Timezone: always use Asia/Kolkata for date comparisons in SQL
- Render free tier cold-starts after 15min inactivity (~30-60s first response)
- MENU_BASE_URL env var on Render controls QR code base URL

## Shops currently in system
1. Fresh Meat Market (id=1) — business_type='daily_menu'
   Owner: owner@example.com / owner123
   Items: Chicken, Mutton, Fish, Eggs (unit: per kg, category: Meat Items)
2. Juice bar shop (to be created) — business_type='static_menu'
   Owner: to be created by super admin
   Items: 60+ items across 5 categories (Fresh Juices, Milk Shakes,
   Lassi, Amma SPL Mixing, Special Items)

## Test credentials
- Super admin: admin@example.com / admin123
- Shop owner: owner@example.com / owner123

## Build status

### Phase 1 — Backend (original) ✅ COMPLETE
### Phase 2 — Web Admin Panel (original) ✅ COMPLETE
### Phase 3 — Mobile App ✅ COMPLETE
- Expo SDK 54, React 19, React Native 0.81.5
- Screens: Login, Dashboard, Update Prices, QR Code, Settings, Change Password
- Verified on real Android device via Expo Go and standalone APK (EAS build)
- API base URL: https://meat-menu-app.onrender.com

### Phase 4 — Deployment ✅ COMPLETE
- Web on Vercel, Backend on Render, DB on Supabase
- QR codes point to production Vercel URL

### Platform Rewrite — Phase 1 (Schema + Backend) ✅ COMPLETE
- New schema: shop_categories, shop_items, dynamic daily_prices
- business_type field on shops (daily_menu / static_menu)
- All new API routes for categories, items, availability, shop name edit
- Fresh Meat Market migrated to new schema

### Platform Rewrite — Phase 2 (Web item management) ❌ NOT STARTED
- Item + category management screens for shop owners
- Shop name edit on web
- Public menu page rewritten to render dynamic items + categories

### Platform Rewrite — Phase 3 (Public menu rewrite) ❌ NOT STARTED
- Remove hardcoded Chicken/Mutton/Fish/Eggs
- Render categories + items dynamically
- Grey out unavailable items
- No bilingual for MVP

### Platform Rewrite — Phase 4 (Mobile item management) ❌ NOT STARTED
- Item + category management in Settings tab
- Price edit per item for static_menu shops
- Availability toggle per item

### Platform Rewrite — Phase 5 (End-to-end testing + deployment) ❌ NOT STARTED
- Test both shop types end to end
- Deploy updated backend and web to production
- Onboard juice bar owner with their 60+ items

## Current task
Platform rewrite Phase 1 (schema + backend) complete.
Next: Platform rewrite Phase 2 — web admin item/category management screens.