import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import { Tracking } from './pages/Tracking'
import { Documents } from './pages/Documents'
import { Management } from './pages/Management'
import { Auth } from './pages/Auth'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="min-vh-100 bg-light">
        <Navigation />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Navigate to="/tracking" replace />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/management" element={<Management />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<Navigate to="/tracking" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
