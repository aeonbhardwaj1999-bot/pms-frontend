import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { StatusBadge } from './ui'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▦', roles: 'all', end: true },
  { to: '/orders', label: 'Orders', icon: '🧾', roles: 'all' },
  { to: '/orders/new', label: 'New order', icon: '＋', roles: ['ADMIN', 'STAFF', 'HOSPITAL'] },
  { to: '/hospitals', label: 'Hospitals', icon: '🏥', roles: ['ADMIN', 'STAFF', 'ENGINEER'] },
  { to: '/products', label: 'Stock & products', icon: '📦', roles: ['ADMIN', 'STAFF', 'ENGINEER'] },
  { to: '/procurement', label: 'Imports & POs', icon: '🌍', roles: ['ADMIN', 'STAFF'] },
  { to: '/shipments', label: 'Dispatch & tracking', icon: '🚚', roles: 'all' },
  { to: '/invoices', label: 'Invoices', icon: '₹', roles: ['ADMIN', 'STAFF', 'HOSPITAL'] },
  { to: '/payments', label: 'Payments', icon: '💳', roles: ['ADMIN', 'STAFF', 'HOSPITAL'] },
  { to: '/satisfaction', label: 'Satisfaction letters', icon: '✍', roles: 'all' },
  { to: '/issues', label: 'Service issues', icon: '🛠', roles: 'all' },
  { to: '/notifications', label: 'Email outbox', icon: '✉', roles: 'all' },
  { to: '/users', label: 'Users', icon: '👤', roles: ['ADMIN'] },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const items = NAV.filter((n) => n.roles === 'all' || n.roles.includes(user.role))

  return (
    <div className={`shell ${open ? 'nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">✚</span>
          <div>
            <strong>FMPMS</strong>
            <small>Order & supply tracking</small>
          </div>
        </div>
        <nav>
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end || n.to === '/orders'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="nav-icon" aria-hidden="true">
                {n.icon}
              </span>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="backdrop" onClick={() => setOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">
            ☰
          </button>
          <div className="topbar-context muted">
            {user.hospital ? user.hospital.name : 'FM Medical Systems · Back office'}
          </div>
          <div className="topbar-user">
            <NavLink to="/profile" className="user-chip">
              <span className="avatar">{user.full_name.slice(0, 1)}</span>
              <span className="user-name">{user.full_name}</span>
              <StatusBadge value={user.role} />
            </NavLink>
            <button type="button" className="btn btn-sm btn-ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>
        <main className="content" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
