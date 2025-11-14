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
import { ShipmentDetails } from './pages/ShipmentDetails'
import { Containers } from './pages/Containers'
import { Profile } from './pages/Profile'
import { UserRelations } from './pages/UserRelations'

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
              <Route path="shipments/:shipmentNumber" element={<ShipmentDetails />} />
              <Route path="containers" element={<Containers />} />
              <Route path="user-relations" element={<UserRelations />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
