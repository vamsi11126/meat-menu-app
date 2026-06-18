# Meat Menu App — Project Context

## What this project is
A digital meat menu system for multiple meat shops.
Customers scan a QR code to view today's live prices.
Shop owners update prices each morning via admin panel or mobile app.

## Current status
- Phase 1 (Backend): COMPLETE
  - Node.js + Express + PostgreSQL
  
  - Auth with JWT
  - Shop management APIs
  - Daily price CRUD
  - QR code generation per shop

- Phase 2 (React Web Admin Panel): COMPLETE
  - Login page (super admin + shop owner)
  - Super admin dashboard (manage shops + owners)
  - Shop owner dashboard (update prices, view QR)
  - Public bilingual menu page (/menu/:shopId) in English + Telugu
  - Tailwind CSS styling

- Phase 3 (React Native Mobile App): NOT STARTED → build this next

## Users
- Super Admin: manages all shops and owners (web only)
- Shop Owner: updates daily prices, views QR code (web + mobile)
- Customer: scans QR, views menu in browser (no login, no app)

## Meat items & pricing
Items: Chicken, Mutton, Fish, Eggs
Price unit: Per kg only
Languages: English and Telugu (bilingual on customer menu)

## Tech stack
- Backend: Node.js + Express + PostgreSQL
- Web frontend: React.js (Vite) + Tailwind CSS
- Mobile app: React Native (Expo)
- Auth: JWT (stored in localStorage on web)
- QR: qrcode + qrcode.react

## Folder structure
meat-menu-app/
  backend/         → Node.js + Express API (COMPLETE)
  web/             → React.js admin panel (COMPLETE)
  mobile/          → React Native Expo app (NOT STARTED)
  AGENTS.md        → this file

## Database tables (PostgreSQL)
- users (id, name, email, password_hash, role, shop_id)
- shops (id, name, address, qr_code_url, created_at)
- daily_prices (id, shop_id, date, chicken_kg, mutton_kg, fish_kg, eggs_kg, updated_at)

## API base URL
http://localhost:5000

## Key rules
- Never expose password hashes in API responses
- Prices are set once per day per shop
- QR code links to /menu/:shopId and never changes
- Mobile app is for shop owners only
- Super admin only accessible via web