import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Card, ErrorState, Field, FormError, Loading, PageHeader, StatusBadge, useSubmit } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { humanize, money, PRODUCT_CATEGORIES } from '../utils/format'

let lineKey = 1
const newLine = () => ({ key: lineKey++, product_id: '', quantity: 1 })

export default function NewOrderPage() {
  const { isManager, user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { busy, error, run } = useSubmit()

  const [hospitalId, setHospitalId] = useState('')
  const [priority, setPriority] = useState('NORMAL')
  const [poReference, setPoReference] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([newLine()])

  const products = useAsync(() => api.get('/products/options').then((r) => r.data), [])
  const hospitals = useAsync(
    () => (isManager ? api.get('/hospitals/options').then((r) => r.data) : Promise.resolve([])),
    [isManager],
  )

  const byId = useMemo(() => Object.fromEntries((products.data || []).map((p) => [p.id, p])), [products.data])

  const totals = useMemo(() => {
    let subtotal = 0
    let tax = 0
    lines.forEach((l) => {
      const p = byId[l.product_id]
      if (!p) return
      const s = p.unit_price * Number(l.quantity || 0)
      subtotal += s
      tax += (s * p.gst_rate) / 100
    })
    return { subtotal, tax, total: subtotal + tax }
  }, [lines, byId])

  const setLine = (key, changes) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...changes } : l)))
  const chosen = new Set(lines.map((l) => String(l.product_id)))

  const submit = (e) => {
    e.preventDefault()
    const items = lines
      .filter((l) => l.product_id)
      .map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) }))
    run(() =>
      api.post('/orders', {
        hospital_id: isManager ? Number(hospitalId) || null : undefined,
        priority,
        po_reference: poReference || null,
        notes: notes || null,
        items,
      }),
    )
      .then(({ data }) => {
        toast.success(`Order ${data.order_number} placed`)
        navigate(`/orders/${data.id}`)
      })
      .catch(() => {})
  }

  if (products.loading) return <Loading />
  if (products.error) return <ErrorState error={products.error} onRetry={products.reload} />

  const grouped = PRODUCT_CATEGORIES.map((c) => [c, products.data.filter((p) => p.category === c)])

  return (
    <form onSubmit={submit}>
      <PageHeader
        back={<Link to="/orders" className="back-link">← Orders</Link>}
        title="New order"
        subtitle={
          isManager
            ? 'Place an order on behalf of a hospital'
            : `Order for ${user.hospital?.name}. We will confirm stock and delivery timeline by email.`
        }
      />
      <div className="detail-grid">
        <div className="stack">
          <Card title="Items">
            <div className="table-wrap line-items">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 280 }}>Product</th>
                    <th style={{ width: 100 }}>Qty</th>
                    <th className="num">Unit price</th>
                    <th className="num">GST</th>
                    <th className="num">Line total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const p = byId[l.product_id]
                    const lineTotal = p ? p.unit_price * l.quantity * (1 + p.gst_rate / 100) : 0
                    const inStock = p && !p.is_imported && p.stock_quantity >= Number(l.quantity)
                    return (
                      <tr key={l.key}>
                        <td>
                          <select required value={l.product_id} onChange={(e) => setLine(l.key, { product_id: e.target.value })}>
                            <option value="">Select a product…</option>
                            {grouped.map(([cat, list]) => (
                              <optgroup key={cat} label={humanize(cat)}>
                                {list.map((prod) => (
                                  <option key={prod.id} value={prod.id} disabled={chosen.has(String(prod.id)) && String(prod.id) !== String(l.product_id)}>
                                    {prod.name} ({prod.sku})
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          {p && (
                            <span className="cell-sub">
                              {inStock ? (
                                <StatusBadge tone="green">In stock</StatusBadge>
                              ) : p.is_imported ? (
                                <StatusBadge tone="violet">Imported · ~{p.lead_time_days} days</StatusBadge>
                              ) : (
                                <StatusBadge tone="amber">On order · ~{p.lead_time_days} days</StatusBadge>
                              )}{' '}
                              {p.manufacturer && `${p.manufacturer.name}, ${p.manufacturer.country}`}
                            </span>
                          )}
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            min="1"
                            required
                            value={l.quantity}
                            onChange={(e) => setLine(l.key, { quantity: e.target.value })}
                          />
                        </td>
                        <td className="num">{p ? money(p.unit_price) : '—'}</td>
                        <td className="num">{p ? `${p.gst_rate}%` : '—'}</td>
                        <td className="num strong">{p ? money(lineTotal) : '—'}</td>
                        <td>
                          {lines.length > 1 && (
                            <button type="button" className="icon-btn" aria-label="Remove line" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="row-between" style={{ marginTop: 14 }}>
              <button type="button" className="btn" onClick={() => setLines((ls) => [...ls, newLine()])}>
                ＋ Add item
              </button>
              <div className="totals">
                <div>
                  <span className="muted">Subtotal</span>
                  <span>{money(totals.subtotal)}</span>
                </div>
                <div>
                  <span className="muted">GST</span>
                  <span>{money(totals.tax)}</span>
                </div>
                <div className="grand">
                  <span>Estimated total</span>
                  <span>{money(totals.total)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card title="Order details">
          {isManager && (
            <Field label="Hospital" required>
              <select required value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}>
                <option value="">Select hospital…</option>
                {(hospitals.data || []).map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {h.city}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Priority">
            <div className="segmented">
              {['NORMAL', 'URGENT'].map((p) => (
                <button type="button" key={p} className={priority === p ? 'active' : ''} onClick={() => setPriority(p)}>
                  {humanize(p)}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Hospital PO / reference no." hint="Your internal purchase order number, if any">
            <input className="input" value={poReference} onChange={(e) => setPoReference(e.target.value)} maxLength={100} />
          </Field>
          <Field label="Notes" hint="Installation site, delivery instructions, contact person…">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <FormError error={error} />
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Placing order…' : 'Place order'}
          </button>
          <p className="muted small" style={{ marginTop: 10 }}>
            Prices are indicative; the final amount is confirmed on the proforma / tax invoice.
          </p>
        </Card>
      </div>
    </form>
  )
}
