# RICH PAPA FAMILY RESTAURANT – POS

A full-stack MERN restaurant point-of-sale system with JWT authentication, role-based access, MongoDB models, POS checkout, kitchen display, inventory, expenses, customers, reports and 80mm thermal receipt printing.

## Requirements

- Node.js 20 or later
- npm
- MongoDB Community Server or MongoDB Atlas

## Setup

```powershell
cd restaurant-pos
cd backend
copy .env.example .env
npm install
npm run dev
```

In a second terminal:

```powershell
cd restaurant-pos/frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

For production builds:

```powershell
cd restaurant-pos
npm install
npm run build
```

## MongoDB

Set `MONGODB_URI` in `backend/.env`. The default is:

```text
mongodb://127.0.0.1:27017/rich_papa_pos
```

Set `JWT_SECRET` to a unique long random value in `.env`.

## Seed accounts

The backend creates demo accounts only when no users exist:

- Admin: `admin@richpapa.lk` / `Admin@123`
- Cashier: `cashier@richpapa.lk` / `Cashier@123`

It also creates sample categories, menu items and restaurant tables.

## Main API

- `POST /api/auth/login`
- `GET/POST /api/users`
- `GET/POST/PUT/DELETE /api/categories`
- `GET/POST/PUT/DELETE /api/menu`
- `GET/POST/PUT/DELETE /api/tables`
- `GET/POST/PUT/DELETE /api/customers`
- `GET/POST /api/orders`
- `POST /api/orders/:id/payment`
- `GET /api/orders/kitchen`
- `GET/POST/PUT/DELETE /api/inventory`
- `GET/POST/PUT/DELETE /api/expenses`
- `GET /api/reports/dashboard`
- `GET /api/reports/sales`

## Printing

Open an order in Order History and use its print button. The browser print stylesheet produces an 80mm thermal receipt and uses the browser's local printer selection.
