# Pandec Backend API

Express.js backend with TypeScript, PostgreSQL, and Supabase authentication.

## Structure

```
backend/
├── src/
│   ├── config/          # Database and Supabase clients
│   ├── middleware/      # Authentication and permissions
│   ├── routes/          # API endpoints
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Main Express server
├── schema.sql           # Database schema
├── .env                 # Environment variables
├── package.json
└── tsconfig.json
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

The `.env` file is already configured with your Supabase credentials:

```
SUPABASE_URL=https://bgvrtxkttwbclchhtsdv.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
PORT=3001
```

### 3. Apply Database Schema

**Option A: Via Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Open your project SQL Editor
3. Copy the contents of `schema.sql`
4. Paste and execute

**Option B: Via psql**
```bash
psql "postgresql://postgres.bgvrtxkttwbclchhtsdv:SEIXBmS6mslxdpIy@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" -f schema.sql
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3001`

## API Endpoints

### Health Check
- `GET /api/health` - Check server status (no auth required)

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users` - List all users (filtered by role/email/q)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)
- `POST /api/users/sync` - Sync Supabase Auth user to local DB
- `GET /api/users/:id/relations` - Get user relations
- `POST /api/users/:id/relations` - Add user relation
- `DELETE /api/users/:id/relations/:related_user_id` - Remove relation

### Orders
- `GET /api/orders` - List orders (filtered by status/sender/receiver/q)
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Offers
- `GET /api/offers` - List offers (filtered by order_id/status)
- `GET /api/offers/:id` - Get offer by ID
- `POST /api/offers` - Create offer (admin only)
- `PUT /api/offers/:id` - Update offer (admin only)
- `DELETE /api/offers/:id` - Delete offer (admin only)
- `POST /api/offers/:id/status` - Accept/reject offer
  - Body: `{ "action": "accept" | "reject" }`

### Shipments
- `GET /api/shipments` - List shipments (filtered by status/order_id)
- `GET /api/shipments/:id` - Get shipment by ID
- `PUT /api/shipments/:id` - Update shipment
- `DELETE /api/shipments/:id` - Delete shipment (admin only)
- `GET /api/shipments/:id/containers` - Get containers for shipment

### Containers
- `GET /api/containers` - List containers (filtered by shipment_id/container_number)
- `GET /api/containers/:id` - Get container by ID
- `POST /api/containers` - Create container
- `PUT /api/containers/:id` - Update container
- `DELETE /api/containers/:id` - Delete container (admin only)
- `POST /api/containers/:id/link` - Link container to shipment
- `POST /api/containers/:id/unlink` - Unlink container from shipment
- `GET /api/containers/:id/items` - Get items in container
- `POST /api/containers/:id/items` - Add item to container
- `PUT /api/containers/items/:item_id` - Update container item
- `DELETE /api/containers/items/:item_id` - Delete container item

## Authentication

All endpoints (except `/api/health`) require authentication via Supabase JWT.

**Request Header:**
```
Authorization: Bearer <supabase_access_token>
```

## Permissions

### Admin Role
- Full access to all resources
- Can create/update/delete offers
- Can manage all users and resources

### Non-Admin Roles (Shipper/Receiver/ForwardingAgent)
- Can only view/edit orders where they are sender or receiver
- Can only view/edit related offers, shipments, and containers
- Cannot create offers (only admin)

## Workflow

1. **User signs up** → Supabase Auth creates user
2. **User synced** → POST `/api/users/sync` creates local DB record
3. **Order created** → Status: `Pending`
4. **Admin creates offer** → Order status: `Offered`
5. **User accepts offer** → 
   - Offer status: `Accepted`
   - Order status: `Accepted`
   - Shipment auto-created (via DB trigger)
   - Other offers for same order deleted
6. **User rejects offer** →
   - Offer status: `Rejected`
   - Order status: `Pending`
7. **Add containers** → Link containers to shipment
8. **Add items** → Add items to containers

## Development

### Build
```bash
npm run build
```

### Production
```bash
npm start
```

### Testing with curl

```bash
# Health check
curl http://localhost:3001/api/health

# Get users (requires auth token)
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/users

# Create order
curl -X POST http://localhost:3001/api/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": "...",
    "receiver_id": "...",
    "from_port": "Shanghai",
    "to_port": "Rotterdam",
    "delivery_type": "Sea",
    "incoterm": "FOB",
    "cargo_unit": "Container",
    "cargo_quantity": 2
  }'
```

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` in `.env`
- Verify Supabase project is active
- Ensure schema is applied

### Authentication Errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check token is valid and not expired
- Ensure user is synced to local DB

### Port Already in Use
```bash
lsof -ti:3001 | xargs kill
```
