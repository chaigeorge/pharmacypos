# PharmaCare POS — Windows Setup Guide

## What's Inside This Project

```
pharmacy/
├── backend/          ← Node.js + Express + Socket.IO + Prisma
│   ├── prisma/       ← Database schema and seed data
│   └── src/
│       ├── config/   ← Socket.IO, Prisma client
│       ├── controllers/  ← Business logic for all modules
│       ├── middleware/   ← JWT authentication
│       └── routes/       ← API endpoints
│
└── frontend/         ← Next.js + Tailwind CSS
    └── src/
        ├── app/      ← All pages (dashboard, sales, inventory, etc.)
        ├── components/   ← Reusable UI components
        ├── hooks/    ← useSocket hook
        ├── lib/      ← API client, utilities
        └── store/    ← Zustand auth store
```

---

## STEP 1 — Install Required Software

### 1a. Install Node.js
Download from: https://nodejs.org  
Choose the **LTS version** (e.g. 20.x).  
During install, tick "Add to PATH" ✓

Verify installation — open Command Prompt and run:
```
node -v
npm -v
```

---

### 1b. Install PostgreSQL
Download from: https://www.postgresql.org/download/windows/

During install:
- Set a password for the `postgres` user (remember this!)
- Keep default port: `5432`
- Install pgAdmin (comes with installer) ✓

---

## STEP 2 — Create the Database

Open pgAdmin (installed with PostgreSQL) or the SQL Shell (psql).

Run these commands:

```sql
CREATE DATABASE pharmacy_db;
CREATE USER pharmacy_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE pharmacy_db TO pharmacy_user;
```

Or, if using psql command line:
```
psql -U postgres
```
Then paste the SQL above.

---

## STEP 3 — Configure the Backend

Open the `backend` folder and create a file named `.env` (copy from `.env.example`):

```
DATABASE_URL="postgresql://pharmacy_user:yourpassword@localhost:5432/pharmacy_db"
JWT_SECRET="change-this-to-a-long-random-string"
JWT_EXPIRES_IN="7d"
PORT=5000
CLIENT_URL="http://localhost:3000"
NODE_ENV="development"
```

Replace `yourpassword` with the password you set in Step 2.

---

## STEP 4 — Install Backend Dependencies

Open Command Prompt, navigate to the backend folder:

```
cd path\to\pharmacy\backend
npm install
```

---

## STEP 5 — Set Up the Database Schema

```
cd path\to\pharmacy\backend
npx prisma migrate dev --name init
npx prisma generate
node prisma/seed.js
```

This will:
- Create all database tables
- Add sample data (categories, suppliers)
- Create 3 default user accounts

---

## STEP 6 — Configure the Frontend

Open the `frontend` folder and create a file named `.env.local`:

```
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## STEP 7 — Install Frontend Dependencies

```
cd path\to\pharmacy\frontend
npm install
```

---

## STEP 8 — Run the Application

You need **two Command Prompt windows** open simultaneously.

### Window 1 — Start the Backend:
```
cd path\to\pharmacy\backend
npm run dev
```
You should see:
```
🚀 Pharmacy server running on port 5000
📡 Socket.IO ready for real-time scanning
```

### Window 2 — Start the Frontend:
```
cd path\to\pharmacy\frontend
npm run dev
```
You should see:
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
```

---

## STEP 9 — Open the Application

Open your browser and go to:
```
http://localhost:3000
```

### Default Login Accounts:

| Role        | Email                       | Password      |
|-------------|----------------------------|---------------|
| Superadmin  | admin@pharmacy.com          | admin123      |
| Manager     | manager@pharmacy.com        | manager123    |
| Pharmacist  | pharmacist@pharmacy.com     | pharmacist123 |

---

## STEP 10 — Mobile Phone Scanner Setup

1. Make sure your phone is on the **same WiFi network** as your PC
2. Find your PC's local IP address:
   - Press `Win + R`, type `cmd`, press Enter
   - Type `ipconfig`
   - Look for `IPv4 Address` (e.g. `192.168.1.100`)
3. Log in to the POS on your PC computer first
4. Click the **"Mobile Scanner"** button on the POS page
5. It will copy a URL like:
   ```
   http://localhost:3000/scan?session=abc123...
   ```
6. Replace `localhost` with your PC's IP:
   ```
   http://192.168.1.100:3000/scan?session=abc123...
   ```
7. Open that URL on your phone browser
8. Allow camera access when prompted
9. Scan a barcode — it will instantly appear in the POS cart!

---

## Running for Production (Windows Startup)

To run the system automatically when Windows starts:

### Option A — Use PM2 (recommended)

Install PM2:
```
npm install -g pm2
npm install -g pm2-windows-startup
```

Start both servers with PM2:
```
cd path\to\pharmacy\backend
pm2 start src/server.js --name pharmacy-backend

cd path\to\pharmacy\frontend
npm run build
pm2 start npm --name pharmacy-frontend -- start

pm2 save
pm2-startup install
```

### Option B — Build and run frontend manually
```
cd path\to\pharmacy\frontend
npm run build
npm start
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm install` fails | Make sure Node.js is installed and in PATH |
| Database connection error | Check `.env` DATABASE_URL and PostgreSQL is running |
| Port 5000 in use | Change `PORT=5001` in backend `.env` |
| Port 3000 in use | Run frontend with `npm run dev -- -p 3001` |
| Mobile scanner not connecting | Make sure phone is on same WiFi, use PC's IP not localhost |
| Prisma errors | Run `npx prisma generate` again after any schema changes |

---

## API Endpoints Summary

| Module | Endpoints |
|--------|-----------|
| Auth | POST /api/auth/login |
| Products | GET/POST /api/products, GET /api/products/barcode/:code |
| Sales | GET/POST /api/sales, PUT /api/sales/:id/void |
| Inventory | GET /api/inventory, GET /api/inventory/low-stock |
| Purchases | GET/POST /api/purchases |
| Expenses | GET/POST/PUT/DELETE /api/expenses |
| Reports | GET /api/reports/sales, profit, best-sellers, inventory-value |
| Users | GET/POST/PUT /api/users (Superadmin only) |
| Settings | GET/PUT /api/settings |
| Dashboard | GET /api/dashboard |

---

## What's Included — Feature Checklist

- [x] Multi-role auth (Superadmin, Manager, Pharmacist)
- [x] POS with cart, discounts, checkout
- [x] USB barcode scanner support (auto-detects keyboard input)
- [x] Webcam/mobile camera barcode scanning (html5-qrcode)
- [x] Real-time phone → POS scanning via Socket.IO
- [x] Sales history with void capability
- [x] Stock receiving with batch + expiry tracking
- [x] FEFO stock deduction (First Expiry First Out)
- [x] Inventory management with filters
- [x] Low stock and expiry alerts
- [x] Product management
- [x] Expense tracking
- [x] Reports: P&L, best sellers, inventory value
- [x] Dashboard with live charts
- [x] User management (Superadmin)
- [x] System settings

---
