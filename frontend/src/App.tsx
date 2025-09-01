import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import { ProfileSync } from './components/ProfileSync'
import { Tracking } from './pages/Tracking'
import { Documents } from './pages/Documents'
import { CreateOrder } from './pages/Management'
import { FindUser } from './pages/FindUser'
import { Auth } from './pages/Auth'
import { User } from './pages/User'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="min-vh-100 bg-light">
        <ProfileSync />
        <Navigation />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Navigate to="/tracking" replace />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/management" element={<CreateOrder />} />
            <Route path="/find-user" element={<FindUser />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/user" element={<User />} />
            <Route path="*" element={<Navigate to="/tracking" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
