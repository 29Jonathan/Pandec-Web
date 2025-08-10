import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { TrackingPage } from './pages/TrackingPage'
import { ManagementPage } from './pages/ManagementPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { UserPage } from './pages/UserPage'

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <NavBar />
        <Routes>
          <Route path="/" element={<TrackingPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/management" element={<ManagementPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="*" element={<Navigate to="/tracking" />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
