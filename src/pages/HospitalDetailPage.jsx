import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import HospitalFormModal from '../components/HospitalForm'
import { Card, DefinitionList, EmptyState, ErrorState, Field, FormError, Loading, Modal, PageHeader, StatusBadge, useSubmit } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { compactMoney, formatDate, humanize, money } from '../utils/format'

function AddPortalUserModal({ hospital, onClose, onDone }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' })
  const { busy, error, run } = useSubmit()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    run(() => api.post(`/hospitals/${hospital.id}/users`, { ...form, phone: form.phone || null }))
      .then(onDone)
      .catch(() => {})
  }
  return (
    <Modal
      title="Add portal user"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button form="pu-form" className="btn btn-primary" disabled={busy}>
            Create login
          </button>
        </>
      }
    >
      <form id="pu-form" onSubmit={submit}>
        <Field label="Full name" required>
          <input className="input" required value={form.full_name} onChange={set('full_name')} />
        </Field>
        <Field label="Email" required>
          <input className="input" type="email" required value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Phone">
          <input className="input" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Temporary password" required>
          <input className="input" required minLength={8} value={form.password} onChange={set('password')} />
        </Field>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

export default function HospitalDetailPage() {
  const { id } = useParams()
  const { isManager } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [modal, setModal] = useState(null)

  const hospital = useAsync(() => api.get(`/hospitals/${id}`).then((r) => r.data), [id])
  const users = useAsync(() => api.get(`/hospitals/${id}/users`).then((r) => r.data), [id])
  const orders = useAsync(() => api.get('/orders', { params: { hospital_id: id, page_size: 10 } }).then((r) => r.data), [id])

  if (hospital.loading && !hospital.data) return <Loading />
  if (hospital.error) return <ErrorState error={hospital.error} onRetry={hospital.reload} />
  const h = hospital.data

  return (
    <>
      <PageHeader
        back={<Link to="/hospitals" className="back-link">← Hospitals</Link>}
        title={h.name}
        subtitle={`${h.code} · ${humanize(h.type)} · ${h.city}, ${h.state}`}
        actions={
          isManager && (
            <>
              <button className="btn" onClick={() => setModal('edit')}>
                Edit details
              </button>
              <Link className="btn btn-primary" to="/orders/new">
                ＋ Order for hospital
              </Link>
            </>
          )
        }
      />
      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label">Total orders</div>
          <div className="kpi-value">{h.stats.total_orders}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Open orders</div>
          <div className="kpi-value">{h.stats.open_orders}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Total billed</div>
          <div className="kpi-value">{compactMoney(h.stats.total_billed)}</div>
        </div>
        <div className={`kpi ${h.stats.outstanding_amount > 0 ? 'alert' : ''}`}>
          <div className="kpi-label">Outstanding</div>
          <div className="kpi-value">{compactMoney(h.stats.outstanding_amount)}</div>
          <div className="kpi-sub">{money(h.stats.outstanding_amount)}</div>
        </div>
      </div>
      <div className="detail-grid">
        <div className="stack">
          <Card title="Account details">
            <DefinitionList
              items={[
                ['Contact person', h.contact_person],
                ['Email', h.email],
                ['Phone', h.phone],
                ['GSTIN', h.gstin],
                ['Address', [h.address_line, h.city, h.state, h.pincode].filter(Boolean).join(', ')],
                ['Payment terms', `${h.default_payment_terms_days} days`],
                ['Status', h.is_active ? 'Active' : 'Inactive'],
                ['Customer since', formatDate(h.created_at)],
              ]}
            />
          </Card>
          <Card title="Recent orders" actions={<Link to={`/orders?hospital_id=${id}`}>All orders →</Link>} flush>
            {orders.data?.items.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Status</th>
                      <th className="num">Value</th>
                      <th>Placed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.data.items.map((o) => (
                      <tr key={o.id} className="clickable" onClick={() => navigate(`/orders/${o.id}`)}>
                        <td className="strong">{o.order_number}</td>
                        <td>
                          <StatusBadge value={o.status} />
                        </td>
                        <td className="num">{money(o.grand_total)}</td>
                        <td>{formatDate(o.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No orders yet" />
            )}
          </Card>
        </div>
        <Card
          title="Portal users"
          actions={
            isManager && (
              <button className="btn btn-sm" onClick={() => setModal('user')}>
                ＋ Add
              </button>
            )
          }
        >
          {users.data?.length ? (
            <ul className="list-plain">
              {users.data.map((u) => (
                <li key={u.id}>
                  <div>
                    <div className="strong">{u.full_name}</div>
                    <div className="muted small">{u.email}</div>
                  </div>
                  {u.is_active ? <StatusBadge tone="green">Active</StatusBadge> : <StatusBadge tone="gray">Disabled</StatusBadge>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No portal logins. Orders are placed by our staff on the hospital's behalf.</p>
          )}
        </Card>
      </div>
      {modal === 'edit' && (
        <HospitalFormModal
          hospital={h}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null)
            toast.success('Hospital updated')
            hospital.reload()
          }}
        />
      )}
      {modal === 'user' && (
        <AddPortalUserModal
          hospital={h}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null)
            toast.success('Portal user created')
            users.reload()
          }}
        />
      )}
    </>
  )
}
