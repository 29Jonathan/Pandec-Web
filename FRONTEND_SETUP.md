# Frontend Setup - Remaining Steps

## Status

✅ **Completed:**
- Dependencies installed
- Tailwind CSS configured
- Path aliases setup (@/* imports)
- Core lib files (utils, supabase, api)
- AuthContext
- UI components copied from reference app
- Layout & ProtectedRoute components
- Login page

## Remaining Files to Create

### 1. Signup Page

Copy and adapt from: `/Users/jonathan/shipment_app/frontend/src/pages/Signup.tsx`

**Changes needed:**
- Update role options to: `Admin`, `Shipper`, `Receiver`, `ForwardingAgent`
- Keep everything else the same

### 2. Dashboard Page

Copy from: `/Users/jonathan/shipment_app/frontend/src/pages/Dashboard.tsx`

**No changes needed** - works as-is with new API

### 3. Profile Page  

Copy from: `/Users/jonathan/shipment_app/frontend/src/pages/Profile.tsx`

**Add user relations section:**
```tsx
// Add to Profile page after existing content:
<Card>
  <CardHeader>
    <CardTitle>Related Users</CardTitle>
    <CardDescription>Manage your business relationships</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Table of related users with remove button */}
    {/* Add relation button with user selector */}
  </CardContent>
</Card>
```

### 4. Orders Page

Copy from: `/Users/jonathan/shipment_app/frontend/src/pages/Orders.tsx`

**Changes needed:**
- Remove `goods` references
- Update form fields to match new schema (sender_id, receiver_id, delivery_type, incoterm, cargo_unit, etc.)

### 5. Offers Page

Copy from: `/Users/jonathan/shipment_app/frontend/src/pages/Offers.tsx`

**Changes needed:**
- Add fields: `port_surcharge`, `trucking_fee`, `custom_clearance` to form
- Update accept/reject handlers to use `offersAPI.setStatus(id, 'accept')` or `'reject'`

### 6. Shipments Page

Copy from: `/Users/jonathan/shipment_app/frontend/src/pages/Shipments.tsx`

**Minor updates:**
- Use `shipmentsAPI` methods
- Add container management UI

### 7. Containers Page

Create NEW page (doesn't exist in reference):

```tsx
// Show table of containers with:
// - container_number, container_type, tare_weight, gross_weight, items_count
// - View items dialog
// - Add/Edit/Delete container
// - Manage items with CN/EU code validation (8-10 digits)
```

### 8. App.tsx

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { Orders } from './pages/Orders'
import { Offers } from './pages/Offers'
import { Shipments } from './pages/Shipments'
import { Containers } from './pages/Containers'
import { Profile } from './pages/Profile'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="offers" element={<Offers />} />
              <Route path="shipments" element={<Shipments />} />
              <Route path="containers" element={<Containers />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
```

### 9. main.tsx

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

## Quick Copy Commands

```bash
cd /Users/jonathan/pandecV2/frontend/src/pages

# Copy pages from reference
cp /Users/jonathan/shipment_app/frontend/src/pages/Signup.tsx ./
cp /Users/jonathan/shipment_app/frontend/src/pages/Dashboard.tsx ./
cp /Users/jonathan/shipment_app/frontend/src/pages/Profile.tsx ./
cp /Users/jonathan/shipment_app/frontend/src/pages/Orders.tsx ./
cp /Users/jonathan/shipment_app/frontend/src/pages/Offers.tsx ./
cp /Users/jonathan/shipment_app/frontend/src/pages/Shipments.tsx ./

# Then manually adapt each file according to notes above
```

## Testing

1. **Apply database schema** in Supabase SQL Editor (copy `/Users/jonathan/pandecV2/backend/schema.sql`)
2. **Start backend**: `cd backend && npm run dev`
3. **Start frontend**: `cd frontend && npm run dev`
4. **Sign up** a new user (creates Supabase Auth + local DB user)
5. **Test workflow**: Create order → Admin creates offer → Accept offer → Shipment created

## Key Schema Differences from Reference App

1. **No `goods` table** - items are managed via `container_items`
2. **User relations** - M:N bidirectional relationships via `user_relations` table
3. **Offer fields** - added `port_surcharge`, `trucking_fee`, `custom_clearance`
4. **Container items** - have `cn_code` and `eu_code` with validation
5. **Offer workflow** - accepting deletes other offers; rejecting returns order to Pending
