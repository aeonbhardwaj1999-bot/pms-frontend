import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { PurchaseOrderModal } from '../components/modals'
import { Card, EmptyState, ErrorState, Field, FormError, Loading, Modal, PageHeader, Pagination, StatusBadge, Tabs, useSubmit } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { formatDate, humanize, PO_STATUSES } from '../utils/format'

const NEXT = {
  PLACED: [['CONFIRMED', 'Confirmed by manufacturer'], ['SHIPPED', 'Mark shipped'], ['CANCELLED', 'Cancel']],
  CONFIRMED: [['SHIPPED', 'Mark shipped'], ['CANCELLED', 'Cancel']],
  SHIPPED: [['RECEIVED', 'Received at warehouse']],
}

function poMoney(amount, currency) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount}`
  }
}

function ManufacturerModal({ onClose, onDone }) {
  const [form, setForm] = useState({ name: '', country: '', contact_person: '', email: '', phone: '', website: '' })
  const { busy, error, run } = useSubmit()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || null]))
    run(() => api.post('/manufacturers', body))
      .then(onDone)
      .catch(() => {})
  }
  return (
    <Modal
      title="Add manufacturer"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button form="m-form" className="btn btn-primary" disabled={busy}>
            Save
          </button>
        </>
      }
    >
      <form id="m-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Name" required>
            <input className="input" required value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Country" required>
            <input className="input" required value={form.country} onChange={set('country')} placeholder="Germany, Italy, China, Korea…" />
          </Field>
          <Field label="Contact person">
            <input className="input" value={form.contact_person} onChange={set('contact_person')} />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Website">
            <input className="input" value={form.website} onChange={set('website')} />
          </Field>
        </div>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

export default function ProcurementPage() {
  const toast = useToast()
  const [tab, setTab] = useState('pos')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)

  const pos = useAsync(
    () => api.get('/purchase-orders', { params: { page, page_size: 20, status: status || undefined } }).then((r) => r.data),
    [page, status],
  )
  const manufacturers = useAsync(() => api.get('/manufacturers').then((r) => r.data), [])

  const advance = async (po, next) => {
    try {
      await api.post(`/purchase-orders/${po.id}/status`, { status: next })
      toast.success(`${po.po_number} → ${humanize(next)}${next === 'RECEIVED' ? ' · stock updated' : ''}`)
      pos.reload()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader
        title="Imports & purchase orders"
        subtitle="Orders placed with manufacturers in Germany, Italy, China, Korea and India"
        actions={
          tab === 'pos' ? (
            <button className="btn btn-primary" onClick={() => setModal('po')}>
              ＋ New purchase order
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setModal('maker')}>
              ＋ Add manufacturer
            </button>
          )
        }
      />
      <Tabs
        tabs={[
          { key: 'pos', label: 'Purchase orders' },
          { key: 'makers', label: 'Manufacturers' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'pos' ? (
        <>
          <div className="toolbar">
            <select
              value={status}
              onChange={(e) => {
                setPage(1)
                setStatus(e.target.value)
              }}
            >
              <option value="">All statuses</option>
              {PO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </select>
          </div>
          <Card flush>
            <ErrorState error={pos.error} onRetry={pos.reload} />
            {pos.loading && !pos.data ? (
              <Loading />
            ) : pos.data?.items.length === 0 ? (
              <EmptyState title="No purchase orders" />
            ) : (
              pos.data && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>PO</th>
                        <th>Manufacturer</th>
                        <th>Items</th>
                        <th>For order</th>
                        <th className="num">Value</th>
                        <th>Expected arrival</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {pos.data.items.map((po) => (
                        <tr key={po.id}>
                          <td>
                            <span className="strong">{po.po_number}</span>
                            <span className="cell-sub">{formatDate(po.order_date)}</span>
                          </td>
                          <td>
                            {po.manufacturer.name}
                            <span className="cell-sub">{po.manufacturer.country}</span>
                          </td>
                          <td>
                            {po.items.map((i) => (
                              <div key={i.id}>
                                {i.quantity} × {i.product.name}
                              </div>
                            ))}
                          </td>
                          <td>{po.order ? <Link to={`/orders/${po.order.id}`}>{po.order.order_number}</Link> : <span className="muted">Stock</span>}</td>
                          <td className="num">{poMoney(po.total_amount, po.currency)}</td>
                          <td>{po.received_at ? `Received ${formatDate(po.received_at)}` : formatDate(po.expected_arrival_date)}</td>
                          <td>
                            <StatusBadge value={po.status} />
                          </td>
                          <td className="nowrap">
                            {(NEXT[po.status] || []).map(([next, label]) => (
                              <button
                                key={next}
                                className={`btn btn-sm ${next === 'CANCELLED' ? 'btn-ghost danger-text' : ''}`}
                                style={{ marginRight: 4 }}
                                onClick={() => advance(po, next)}
                              >
                                {label}
                              </button>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
            {pos.data && (
              <div style={{ padding: '0 14px' }}>
                <Pagination page={page} pageSize={20} total={pos.data.total} onChange={setPage} />
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card flush>
          <ErrorState error={manufacturers.error} onRetry={manufacturers.reload} />
          {manufacturers.loading ? (
            <Loading />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Country</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {(manufacturers.data || []).map((m) => (
                    <tr key={m.id}>
                      <td className="strong">{m.name}</td>
                      <td>{m.country}</td>
                      <td>{m.contact_person || '—'}</td>
                      <td>{m.email || '—'}</td>
                      <td>{m.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {modal === 'po' && (
        <PurchaseOrderModal
          onClose={() => setModal(null)}
          onDone={(po) => {
            setModal(null)
            toast.success(`${po.po_number} placed`)
            pos.reload()
          }}
        />
      )}
      {modal === 'maker' && (
        <ManufacturerModal
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null)
            toast.success('Manufacturer added')
            manufacturers.reload()
          }}
        />
      )}
    </>
  )
}
