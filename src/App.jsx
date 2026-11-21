import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { Loading } from './components/ui'
import { useAuth } from './context/AuthContext'
import DashboardPage from './pages/DashboardPage'
import HospitalDetailPage from './pages/HospitalDetailPage'
import HospitalsPage from './pages/HospitalsPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'
import InvoicesPage from './pages/InvoicesPage'
import IssuesPage from './pages/IssuesPage'
import LoginPage from './pages/LoginPage'
import NewOrderPage from './pages/NewOrderPage'
import NotificationsPage from './pages/NotificationsPage'
import OrderDetailPage from './pages/OrderDetailPage'
import OrdersPage from './pages/OrdersPage'
import PaymentsPage from './pages/PaymentsPage'
import ProcurementPage from './pages/ProcurementPage'
import ProductsPage from './pages/ProductsPage'
import ProfilePage from './pages/ProfilePage'
import SatisfactionPage from './pages/SatisfactionPage'
import ShipmentsPage from './pages/ShipmentsPage'
import UsersPage from './pages/UsersPage'

function RequireRole({ roles, children }) {
  const { user } = useAuth()
  if (!roles.includes(user.role)) {
    return (
      <div className="notice notice-error">You do not have access to this page.</div>
    )
  }
  return children
}

const INTERNAL = ['ADMIN', 'STAFF', 'ENGINEER']
const MANAGERS = ['ADMIN', 'STAFF']
const BILLING = ['ADMIN', 'STAFF', 'HOSPITAL']

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <Loading label="Starting FMPMS…" />

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/new" element={<RequireRole roles={BILLING}><NewOrderPage /></RequireRole>} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="hospitals" element={<RequireRole roles={INTERNAL}><HospitalsPage /></RequireRole>} />
        <Route path="hospitals/:id" element={<RequireRole roles={INTERNAL}><HospitalDetailPage /></RequireRole>} />
        <Route path="products" element={<RequireRole roles={INTERNAL}><ProductsPage /></RequireRole>} />
        <Route path="procurement" element={<RequireRole roles={MANAGERS}><ProcurementPage /></RequireRole>} />
        <Route path="shipments" element={<ShipmentsPage />} />
        <Route path="invoices" element={<RequireRole roles={BILLING}><InvoicesPage /></RequireRole>} />
        <Route path="invoices/:id" element={<RequireRole roles={BILLING}><InvoiceDetailPage /></RequireRole>} />
        <Route path="payments" element={<RequireRole roles={BILLING}><PaymentsPage /></RequireRole>} />
        <Route path="satisfaction" element={<SatisfactionPage />} />
        <Route path="issues" element={<IssuesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="users" element={<RequireRole roles={['ADMIN']}><UsersPage /></RequireRole>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<div className="notice">Page not found.</div>} />
      </Route>
    </Routes>
  )
}
