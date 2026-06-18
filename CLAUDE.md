# Meat Menu App — Project Context

## What this project is
A digital meat menu system for multiple meat shops.
Customers scan a QR code to view today's live prices.
Shop owners update prices each morning via admin panel or mobile app.

## Users
- Super Admin: manages all shops and owners (web only)
- Shop Owner: updates daily prices, views QR code (web + mobile)
- Customer: scans QR, views menu in browser (no login, no app)

## Meat items & pricing
Items: Chicken, Mutton, Fish, Eggs
Price unit: Per kg only
Languages: English and Telugu (bilingual display on customer menu)

## Tech stack
- Backend: Node.js + Express + PostgreSQL
- Web frontend: React.js (Vite) + Tailwind CSS
- Mobile app: React Native (Expo SDK 54)
- Auth: JWT (stored in localStorage on web, AsyncStorage on mobile)
- QR generation: qrcode + qrcode.react

## Folder structure
meat-menu-app/
  backend/         → Node.js + Express API (COMPLETE)
  web/             → React.js admin panel (COMPLETE)
  mobile/          → React Native Expo SDK 54 app (IN PROGRESS)
  CLAUDE.md        → this file

## Database tables (PostgreSQL)
- users (id, name, email, password_hash, role: 'super_admin'|'shop_owner', shop_id)
- shops (id, name, address, qr_code_url, created_at)
- daily_prices (id, shop_id, date, chicken_kg, mutton_kg, fish_kg, eggs_kg, updated_at)

## API routes
POST   /api/auth/login
GET    /api/shops              (super admin only)
POST   /api/shops              (super admin only)
GET    /api/shops/:id/prices   (public — used by customer menu)
POST   /api/shops/:id/prices   (shop owner only)
GET    /api/shops/:id/qr       (shop owner only)

## Customer menu URL format
/menu/:shopId → public page, no auth, shows today's prices in EN + Telugu

## Key rules
- Never expose password hashes in API responses
- Prices are set once per day per shop
- QR code links to /menu/:shopId and never changes
- Mobile app is for shop owners only (price update + QR view)
- Super admin only accessible via web
- Timezone: always use Asia/Kolkata for date comparisons in SQL

## Build status

### Phase 1 — Backend ✅ COMPLETE
- Express server, PostgreSQL schema, JWT auth
- Shop management APIs (GET /api/shops, POST /api/shops)
- Daily price CRUD with Asia/Kolkata timezone fix
- QR code generation per shop
- Public menu API endpoint
- Seeds file for test data

### Phase 2 — Web Admin Panel ✅ COMPLETE
- Login page (super admin + shop owner, JWT auth)
- Super admin dashboard (lists all shops, add new shop)
- Shop owner dashboard (today's prices, last updated time)
- Owner price update form (Chicken, Mutton, Fish, Eggs per kg)
- QR code page (display + download as PNG)
- Public bilingual menu page at /menu/:shopId (English + Telugu) ✅ verified working
- Protected routes with role-based access
- Tailwind CSS styling

### Phase 3 — Mobile App ✅ COMPLETE
- Expo SDK 54, React 19, React Native 0.81.5
- All screens verified on a real Android device (via Expo Go):
  Login, Dashboard, Update Prices, QR Code
- Navigation: react-navigation v6 (native stack + bottom tabs)
- AsyncStorage for JWT token persistence
- Supabase connected and working
- API base URL must be set to local network IP (not localhost)
  → Current test IP: 10.244.247.19:5000 (update when network changes)
- KNOWN REMAINING ISSUE: QR code shows localhost:5173
  → Will be fixed in Phase 4 by setting MENU_BASE_URL (backend env)
    to the production Vercel URL

### Phase 4 — Deployment ❌ NOT STARTED
Target infrastructure:
- Backend: Railway (Node.js + environment variables)
- Web admin panel: Vercel
- Database: Supabase (already live)
- Mobile: Expo Go for now, EAS build later

Deployment order:
1. Deploy web to Vercel → get production URL
2. Deploy backend to Railway → get production API URL
3. Update MENU_BASE_URL in Railway env to the Vercel URL
4. Update mobile API base URL to the Railway backend URL
5. Update web API base URL to the Railway backend URL
6. Test full flow end to end on production

## Known bugs to fix
1. Super admin shop table shows "Not assigned" for owner name
   → Fix: JOIN users table in GET /api/shops query on users.shop_id
2. Menu page shows Rs.0/kg for unset items
   → Fix: show "Not available" / "అందుబాటులో లేదు" when price is 0 or null

## Current task
Start Phase 4 — Deployment. Follow the deployment order above:
deploy web to Vercel, then backend to Railway, then point
MENU_BASE_URL at the Vercel URL to fix the QR localhost issue.


