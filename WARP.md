# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Core Commands

All commands are run from the repository root unless noted.

### Backend (Express + TypeScript)

- Install deps:
  - `cd backend && npm install`
- Start dev server (watches TypeScript):
  - `cd backend && npm run dev`
- Build (TypeScript → `dist/`):
  - `cd backend && npm run build`
- Start built server:
  - `cd backend && npm start`

Useful manual checks (no automated test suite is configured):

- Health check (no auth):
  - `curl http://localhost:3001/api/health`
- Authenticated check for current user (replace `<token>` with a Supabase access token from the browser):
  - `curl -H "Authorization: Bearer <token>" http://localhost:3001/api/users/me`

### Frontend (React + Vite + Tailwind)

- Install deps:
  - `cd frontend && npm install`
- Start dev server:
  - `cd frontend && npm run dev`
- Build production bundle (typecheck + Vite build):
  - `cd frontend && npm run build`
- Preview built frontend:
  - `cd frontend && npm run preview`
- Lint frontend TypeScript/React:
  - `cd frontend && npm run lint`

The frontend expects the backend at `VITE_API_URL` (defaults to `http://localhost:3001/api` via `frontend/src/lib/api.ts`). Ensure `backend` dev server is running before using the app.

## High-Level Architecture

### Overall System

Pandec is a full-stack logistics management system for a small internal team (~20 users). It models and manages:

- **Users** with roles (`Admin`, `Shipper`, `Receiver`, `ForwardingAgent`), company details, VAT/EORI, and address metadata.
- **Orders** initiated by users (sender/receiver, ports, Incoterms, cargo items).
- **Price offers** per order, with cost components (`freight_cost`, `port_surcharge`, `trucking_fee`, `custom_clearance`) and status (`Pending`, `Accepted`, `Rejected`).
- **Shipments** created when an offer is accepted, tracking shipment number, dates, status, and associated order/offer.
- **Containers** and **container items**, including CN/EU codes with 8–10 digit validation.
- **User relations** (M:N, bidirectional) for modeling business relationships between users.

Supabase is used for authentication and as the Postgres host; the app maintains its own `users` table in sync with Supabase Auth.

### Backend Architecture

Location: `backend/`

- **Entry point:** `src/index.ts`
  - Configures Express, CORS, JSON body parsing.
  - Exposes unauthenticated `GET /api/health`.
  - Mounts all authenticated routes with a shared `authenticate` middleware:
    - `/api/users`, `/api/orders`, `/api/offers`, `/api/shipments`, `/api/containers`.
  - Provides a global error handler and simple 404 handler.

- **Configuration:** `src/config/`
  - `database.ts`: creates a shared `pg.Pool` using `DATABASE_URL` with SSL, logs a single `SELECT NOW()` at startup to confirm DB connectivity.
  - `supabase.ts`: creates a service-role Supabase client (`supabaseAdmin`) using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from environment variables. If either is missing, the process throws during startup.

- **Authentication & Permissions:** `src/middleware/`
  - `auth.ts`:
    - Validates `Authorization: Bearer <JWT>` using `supabaseAdmin.auth.getUser(token)`.
    - On success, loads the user from the local `users` table by Supabase user `id`.
    - If the user is missing locally, performs an **auto-sync insert** using Supabase `user_metadata` (name, company, phone, address1/2, country, VAT/EORI, role) with fallback defaults, then attaches the resulting row to `req.user`.
    - Exposes `AuthRequest` (extends Express `Request` with `user` and `authUserId`) and `requireAdmin` (403s unless `role === 'Admin'`).
  - `permissions.ts`:
    - Request-level guards `canAccessOrder`, `canAccessOffer`, `canAccessShipment` to enforce that non-admins can only access orders/flows where they are sender or receiver (based on joins against `orders`).
    - Query helpers `buildOrdersFilter`, `buildOffersFilter`, `buildShipmentsFilter` return `(query, params)` fragments added to `WHERE` clauses; admin users get no additional filter.
    - New endpoints that expose order/offer/shipment data should either reuse these helpers or follow the same pattern to keep authorization consistent.

- **Routes:** `src/routes/`
  - Each file encapsulates domain-specific SQL and shapes responses for the frontend. They all use the shared `pg.Pool` and, where applicable, permission helpers.
  - `users.ts`:
    - CRUD-like operations on the local `users` table.
    - `GET /me` returns `req.user` (local DB user corresponding to Supabase account).
    - `GET /` supports filters (`role`, `email`, `q`) and is used both for admin views and selection dropdowns.
    - `PUT /:id` performs partial updates with dynamic field lists; only admins may change `role`.
    - `POST /sync` is the explicit sync endpoint used by the frontend to upsert local user details based on the Supabase user (insert requires a full business profile; update only applies provided fields).
    - Relations sub-routes (`/users/:id/relations`): list, add, and delete user relations, with server-side checks to prevent self-relations and ensure bidirectional deletion via SQL.
  - `orders.ts`:
    - Encapsulates the order domain including embedded cargo items.
    - `GET /` builds a large `SELECT` with joins to sender/receiver `users` and `order_cargo`, uses `json_agg`/`json_build_object` to return a `cargo` array per order, and applies both permission-based filters and user-provided filters (`status`, `sender_id`, `receiver_id`, `q`).
    - `GET /:id` returns a fully hydrated order (sender/receiver names/emails + cargo summary) with `canAccessOrder` enforcement.
    - `POST /` and `PUT /:id` wrap an order + its cargo items in a single transaction:
      - Insert/update the order row.
      - Insert (or replace) associated `order_cargo` records.
      - On error (e.g., foreign-key or enum violations) the transaction is rolled back and a descriptive HTTP 400/500 is returned.
  - `offers.ts`:
    - `GET /` and `GET /:id` join offers with their orders.
    - `POST /` (admin only) creates an offer and sets the related order status to `Offered` in a transaction.
    - `POST /:id/status` handles the **accept/reject workflow**:
      - `accept`: sets offer to `Accepted`, relies on DB triggers to create a shipment and update order status, deletes all other offers for that order, and returns the resulting shipment.
      - `reject`: sets offer to `Rejected` and resets the order status to `Pending`.
  - `shipments.ts`:
    - `GET /` and `GET /:id` join shipments with their orders, users, and accepted offer to provide all business context needed for the UI.
    - Uses `buildShipmentsFilter` to restrict visibility to shipments tied to accessible orders.
    - `PUT /:id` allows partial updates of shipment metadata and status; empty strings for dates/tracking are normalized to `NULL`.
    - `GET /:id/containers` returns containers linked via `shipment_containers` and aggregates item counts.
  - `containers.ts`:
    - Index and detail endpoints for containers, including related shipments.
    - `POST /` serves a **create-or-update** behavior keyed by `container_number`, with optional linking to a shipment.
    - `POST /:id/link` and `POST /:id/unlink` manage the `shipment_containers` join table.
    - Container items sub-routes (`/containers/:id/items`, `/containers/items/:item_id`) perform validation of `cn_code` and `eu_code` via a shared regex (`^[0-9]{8,10}$`) and enforce referential integrity against `containers`/`shipments`.

When adding new backend functionality, follow the existing pattern:

- Model-level rules live in SQL (schema + triggers), while request validation and error handling live in the Express routes.
- Permissions are enforced either via route middleware (`canAccess*`) or via filter fragments (`build*Filter`).
- Responses are shaped for the frontend to minimize client-side joins (e.g., aggregated `cargo`, `shipment_numbers`).

### Frontend Architecture

Location: `frontend/`

- **Tooling:** React + TypeScript + Vite with Tailwind CSS and shadcn-style UI components. React Router handles navigation; TanStack Query (React Query) manages server state; Sonner shows toasts.

- **Config & aliases:**
  - `vite.config.ts` defines an `@` alias to `./src`, used consistently across components (`@/lib/api`, `@/contexts/AuthContext`, etc.).

- **Core libraries:** `frontend/src/lib/`
  - `supabase.ts` (not shown here) configures the Supabase client used across the app.
  - `api.ts` centralizes all HTTP access to the backend:
    - `fetchAPI` resolves `VITE_API_URL` (default `http://localhost:3001/api`), attaches `Authorization: Bearer <access_token>` from `supabase.auth.getSession()`, and throws a JavaScript `Error` on non-2xx responses (with message taken from backend JSON).
    - Domain-specific API wrappers (e.g., `usersAPI`, `ordersAPI`, `offersAPI`, `shipmentsAPI`, `containersAPI`) mirror backend routes. They accept typed parameter objects where appropriate and are designed to be consumed by React Query hooks.
  - `utils.ts` (not shown) contains generic helpers used across the UI (e.g., formatting, shared logic).

- **Auth & user sync:** `frontend/src/contexts/AuthContext.tsx`
  - Wraps the app with Supabase auth state (`user`, `loading`) and exposes `signUp`, `signIn`, and `signOut` helpers.
  - On startup and on auth state changes, it:
    - Reads the current Supabase session and sets `user`.
    - Performs a **background sync** to the backend via `usersAPI.sync`, mapping Supabase `user_metadata` to the backend’s required `users` fields.
  - `signUp` both creates the Supabase account and, when a session is immediately available, triggers an immediate sync to the backend; otherwise, the first login triggers sync.
  - Error handling is surfaced to the UI via Sonner toasts.

- **Routing, layout, and protection:**
  - Application routing follows the structure outlined in `FRONTEND_SETUP.md` and implemented in `App.tsx`/`main.tsx`:
    - `Login` and `Signup` routes are public.
    - All business pages are nested under a `ProtectedRoute` that requires an authenticated Supabase user.
  - `components/ProtectedRoute.tsx` gates access:
    - Shows a full-screen loading spinner while `AuthContext` is initializing.
    - Redirects unauthenticated users to `/login`.
  - `components/Layout.tsx` defines the main shell:
    - Header with app name and current user, linking to the `Profile` page.
    - Top-level navigation for `Dashboard`, `Orders`, `Offers`, `Shipments`, `Containers`, and `UserRelations`.
    - Renders the active page via React Router’s `<Outlet />`.

- **Pages and domain UI:** `frontend/src/pages/`
  - **Dashboard:** summarizes order and shipment counts; uses React Query to fetch core lists and computes derived stats client-side.
  - **Orders:** tabular view of orders, including cargo breakdown, Incoterms, and status chips; uses an `OrderModal` for creating/updating orders.
  - **Offers:** shows offers with detailed cost breakdown and computed total; UI behavior depends on the current user’s role:
    - Admin users can create and edit offers.
    - Non-admin users can accept or reject `Pending` offers; actions call `offersAPI.setStatus` and invalidate related React Query caches (`offers`, `orders`, `shipments`).
  - **Shipments:** sortable and searchable table of shipments, including links to tracking URLs, status selectors (admin-only), and controls for adding containers via `ContainerModal`. Clicking a row navigates to shipment detail (by `shipment_number`).
  - **Containers:** list of containers with associated shipment chips and gross/tare weight; admins can edit/delete; rows open a details modal showing items and relations.
  - **Login/Signup:** account creation and sign-in flows built on `AuthContext`.
  - **Profile:** displays and edits user profile metadata stored in Supabase; uses `supabase.auth.updateUser` and reflects the same fields that the backend expects for sync. Also provides a basic “Security” section stub for password management.
  - **UserRelations:** front-end for the user relations feature:
    - Reads the current user’s relations (`usersAPI.getRelations`).
    - Shows an add-relation UI backed by a `Select` of all users (excluding self and already-related users).
    - Uses React Query mutations for add/remove with cache invalidation and toast feedback.

- **UI components & modals:** `frontend/src/components/`
  - `ui/` contains composable, Tailwind-based primitives (`button`, `card`, `table`, `dialog`, etc.) tailored to the app.
  - `modals/` contains domain-specific modal components for Orders, Offers, Shipments, Containers, and Container Details; these encapsulate forms and validation consistent with backend expectations (e.g., container CN/EU codes, cargo items, shipment status).

### Data & Workflow Semantics

These domain rules are enforced jointly by the database, backend, and frontend; keeping them in mind helps avoid introducing inconsistent flows:

- **User lifecycle:**
  - Users sign up via Supabase; their profile metadata is stored with the Supabase user.
  - The backend either auto-syncs (on first authenticated request) or is explicitly synced by the frontend via `/api/users/sync`.
  - The local `users` table is the source of truth for roles and business attributes used across queries and permissions.

- **Permissions model:**
  - `Admin` users have full access to all users, orders, offers, shipments, and containers.
  - Non-admin users can only access orders where they are `sender` or `receiver`, and only offers/shipments/containers derived from those orders. This is enforced at the SQL level (joins/filters) in addition to UI constraints.

- **Order → Offer → Shipment workflow:**
  - Orders start in `Pending` state.
  - Creating an offer for an order sets the order to `Offered`.
  - Accepting an offer:
    - Sets the offer to `Accepted`.
    - Automatically creates a shipment via DB triggers and updates the order status (details in `backend/schema.sql`).
    - Deletes all other offers for that order to ensure only one accepted offer.
  - Rejecting an offer sets its status to `Rejected` and returns the order to `Pending`.

- **Containers and items:**
  - Containers can be reused across shipments and are linked via the `shipment_containers` join table.
  - Container items belong to a specific container + shipment combination and include tariff classification fields `cn_code` and `eu_code`, both validated as 8–10 digit numeric strings in the API layer.

- **User relations:**
  - Relations are stored in `user_relations` with triggers ensuring bidirectional entries.
  - The UI assumes that `GET /users/:id/relations` returns only related users, not the pivot rows; removing a relation deletes both directions.

### Environment & Configuration Notes

- Backend expects at least `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and `PORT` in `backend/.env`.
- Frontend expects Supabase public keys and API URL in `frontend/.env` (see `frontend/src/lib/supabase.ts` and `frontend/src/lib/api.ts` for exact variable names and usage).
- Database schema and triggers live in `backend/schema.sql` and are assumed to be applied to the Supabase Postgres instance pointed to by `DATABASE_URL`.

There are no CLAUDE, Cursor, or Copilot instruction files in this repository; this `WARP.md` is the primary project-specific guidance for agents.