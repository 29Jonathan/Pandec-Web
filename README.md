# Pandec - Logistics Management System

A full-stack logistics management web application for managing Users, Orders, Price Offers, Shipments, and Containers.

## 🎯 Overview

Pandec is designed for small internal teams (about 20 users) to manage the complete logistics workflow:
- Users create orders requesting shipment
- Admin prepare and send price offers for each order
- When the user accepts the offer, a Shipment is created
- Add shipment details and containers to a shipment

## 🛠️ Tech Stack

### Frontend
- React with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- ShadCN/UI for component library
- Lucide React for icons
- Sonner for toast notifications
- TanStack Query (React Query) for data fetching
- React Router for navigation
- Supabase client for authentication

### Backend
- Express.js (no framework decorators/annotations)
- TypeScript with CommonJS
- pg (node-postgres) for raw SQL queries
- Supabase for auth and database hosting
- CORS enabled for frontend

### Infrastructure
- Supabase for database, authentication, and storage
- Supabase Auth: User data stored in both Supabase Auth and PostgreSQL `users` table (synced via `usersAPI.sync()`)

## 🚀 Quick Start

### 1. Database Setup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open SQL Editor
3. Copy contents of `backend/schema.sql`
4. Paste and execute

### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

Backend runs on http://localhost:3001

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

### 4. First Login

1. Click "Sign up" on login page
2. Create an Admin account
3. System auto-creates user in both Supabase Auth and local DB

## 📁 Project Structure

```
pandecV2/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & Supabase
│   │   ├── middleware/      # Auth & Permissions
│   │   ├── routes/          # API endpoints
│   │   └── types/           # TypeScript types
│   ├── schema.sql           # Database schema
│   └── .env                 # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # AuthContext
│   │   ├── lib/             # API client & utils
│   │   └── pages/           # Page components
│   └── .env                 # Environment variables
├── FRONTEND_SETUP.md        # Frontend completion guide
└── README.md                # This file
```

## 📚 Documentation

- **Backend API**: See `backend/README.md`
- **Frontend Setup**: See `FRONTEND_SETUP.md`
- **Database Schema**: See `backend/schema.sql`

## ✅ Implementation Status

### Backend
- ✅ Database schema with triggers
- ✅ Authentication middleware
- ✅ Permission system
- ✅ All API endpoints (users, orders, offers, shipments, containers)
- ✅ User sync from Supabase
- ✅ Offer accept/reject workflow
- ✅ Container items with validation

### Frontend
- ✅ Project setup & configuration
- ✅ Tailwind CSS & ShadCN UI
- ✅ Authentication (Login/Signup pages)
- ✅ API client with all endpoints
- ✅ AuthContext with auto-sync
- ✅ Layout & Navigation
- ✅ All pages (Dashboard, Orders, Offers, Shipments, Containers, Profile)
- ✅ All modal components (Order, Offer, Shipment, Container)
- ✅ Build compiles successfully

## 🔑 Key Features

1. **Multi-Role System**: Admin, Shipper, Receiver, ForwardingAgent
2. **Permission-Based Access**: Users only see their orders/offers/shipments
3. **User Relations**: M:N bidirectional relationships
4. **Offer Workflow**: 
   - Accept → Creates shipment, deletes other offers
   - Reject → Returns order to Pending
5. **Container Management**: Link containers to shipments, manage items
6. **CN/EU Code Validation**: 8-10 digit format validation

## 🧪 Testing

```bash
# Backend health check
curl http://localhost:3001/api/health

# With authentication (get token from browser after login)
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/users/me
```

## 🐛 Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` in `backend/.env`
- Ensure schema is applied in Supabase

### Frontend Build Issues
- Run `npm install` in frontend directory
- Check all pages are created in `src/pages/`

### Authentication Issues
- Verify Supabase keys in both `.env` files
- Check network tab for API responses

## 📝 License

This project is for internal use.
