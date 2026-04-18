import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppShell } from './components/layout/AppShell'

// Public pages
import { RoleSelection } from './pages/public/RoleSelection'
import { LoginPage } from './pages/public/Login'
import { RegisterDonor } from './pages/public/RegisterDonor'
import { RegisterHospital } from './pages/public/RegisterHospital'

// Donor pages
import { DonorDashboard } from './pages/donor/Dashboard'
import { DonorProfile } from './pages/donor/Profile'
import { Quiz } from './pages/donor/Quiz'
import { DonorDonations } from './pages/donor/Donations'
import { DonorNotifications } from './pages/donor/Notifications'

// Hospital pages
import { HospitalDashboard } from './pages/hospital/Dashboard'
import { HospitalProfilePage } from './pages/hospital/Profile'
import { HospitalSearch } from './pages/hospital/Search'
import { HospitalRequests } from './pages/hospital/Requests'
import { HospitalDonations } from './pages/hospital/Donations'
import { HospitalNotifications } from './pages/hospital/Notifications'

// Shared
import { NotFound } from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<RoleSelection />} />
          <Route path="/login/donor" element={<LoginPage role="donor" />} />
          <Route path="/login/hospital" element={<LoginPage role="hospital" />} />
          <Route path="/register/donor" element={<RegisterDonor />} />
          <Route path="/register/hospital" element={<RegisterHospital />} />

          {/* Donor protected */}
          <Route element={<AppShell requiredRole="DONOR" />}>
            <Route path="/donor/dashboard" element={<DonorDashboard />} />
            <Route path="/donor/profile" element={<DonorProfile />} />
            <Route path="/donor/quiz" element={<Quiz />} />
            <Route path="/donor/donations" element={<DonorDonations />} />
            <Route path="/donor/notifications" element={<DonorNotifications />} />
            <Route path="/donor" element={<Navigate to="/donor/dashboard" replace />} />
          </Route>

          {/* Hospital protected */}
          <Route element={<AppShell requiredRole="HOSPITAL" />}>
            <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
            <Route path="/hospital/profile" element={<HospitalProfilePage />} />
            <Route path="/hospital/search" element={<HospitalSearch />} />
            <Route path="/hospital/requests" element={<HospitalRequests />} />
            <Route path="/hospital/donations" element={<HospitalDonations />} />
            <Route path="/hospital/notifications" element={<HospitalNotifications />} />
            <Route path="/hospital" element={<Navigate to="/hospital/dashboard" replace />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
