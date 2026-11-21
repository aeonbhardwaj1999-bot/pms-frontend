import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { RecordPaymentModal } from '../components/modals'
import { Card, EmptyState, ErrorState, Loading, PageHeader, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { daysFromToday, formatDate, formatDateTime, money } from '../utils/format'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const { isManager } = useAuth()
  const toast = useToast()
  const [paying, setPaying] = useState(false)
  const invoice = useAsync(() => api.get(`/invoices/${id}`).then((r) => r.data), [id])
  const company = useAsync(() => api.get('/dashboard/company').then((r) => r.data), [])

  if (invoice.loading && !invoice.data) return <Loading />
  if (invoice.error) return <ErrorState error={invoice.error} onRetry={invoice.reload} />
  const inv = invoice.data
  const co = company.data || {}
  const dueIn = daysFromToday(inv.due_date)
  const payable = isManager && !['PAID', 'CANCELLED'].includes(inv.status)

  const cancel = async () => {
    if (!window.confirm(`Cancel invoice ${inv.invoice_number}?`)) return
    try {
      await api.post(`/invoices/${inv.id}/cancel`)
      toast.success('Invoice cancelled')
      invoice.reload()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader
        back={<Link to="/invoices" className="back-link">← Invoices</Link>}
        title={
          <span className="row">
            {inv.invoice_number} <StatusBadge value={inv.status} />
            {inv.is_overdue && inv.status !== 'OVERDUE' && <StatusBadge value="OVERDUE" />}
          </span>
        }
        subtitle={
          <>
            For order <Link to={`/orders/${inv.order.id}`}>{inv.order.order_number}</Link> · balance {money(inv.balance_due)}
          </>
        }
        actions={
          <>
            {payable && (
              <button className="btn btn-primary" onClick={() => setPaying(true)}>
                Record payment
              </button>
            )}
            <button className="btn" onClick={() => window.print()}>
              Print
            </button>
            {isManager && inv.status !== 'CANCELLED' && Number(inv.amount_paid) === 0 && (
              <button className="btn btn-danger" onClick={cancel}>
                Cancel invoice
              </button>
            )}
          </>
        }
      />

      <div className="detail-grid">
        <Card className="invoice-doc">
          <div className="invoice-head">
            <div>
              <h2>{co.name || 'FM Medical Systems Pvt. Ltd.'}</h2>
              <div className="muted small">{co.address}</div>
              <div className="muted small">
                GSTIN {co.gstin} · {co.email} · {co.phone}
              </div>
            </div>
            <div className="invoice-title">
              <div className="doc-type">{inv.type === 'TAX' ? 'Tax invoice' : 'Proforma invoice'}</div>
              <div className="strong">{inv.invoice_number}</div>
              <div className="small">Date: {formatDate(inv.issue_date)}</div>
            </div>
          </div>
          <div className="invoice-parties">
            <div>
              <div className="muted small strong">BILL TO</div>
              <div className="strong">{inv.hospital.name}</div>
              <div className="small">{[inv.hospital.address_line, inv.hospital.city, inv.hospital.state, inv.hospital.pincode].filter(Boolean).join(', ')}</div>
              <div className="small">GSTIN: {inv.hospital.gstin || '—'}</div>
              <div className="small">Attn: {inv.hospital.contact_person}</div>
            </div>
            <div>
              <div className="muted small strong">PAYMENT TERMS</div>
              <div>Within {inv.payment_terms_days} days of invoice date</div>
              <div className="strong">Due on {formatDate(inv.due_date)}</div>
              {!['PAID', 'CANCELLED'].includes(inv.status) && dueIn !== null && (
                <div className={`small ${dueIn < 0 ? 'danger-text strong' : 'muted'}`}>
                  {dueIn < 0 ? `${-dueIn} days overdue` : dueIn === 0 ? 'Due today' : `${dueIn} days left`}
                </div>
              )}
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th>HSN</th>
                  <th className="num">Qty</th>
                  <th className="num">Rate</th>
                  <th className="num">Taxable value</th>
                  <th className="num">GST</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {inv.items.map((it, idx) => (
                  <tr key={it.id}>
                    <td>{idx + 1}</td>
                    <td>{it.description}</td>
                    <td className="mono">{it.hsn_code || '—'}</td>
                    <td className="num">{it.quantity}</td>
                    <td className="num">{money(it.unit_price)}</td>
                    <td className="num">{money(it.taxable_value)}</td>
                    <td className="num">
                      {money(it.tax_amount)}
                      <span className="cell-sub">@ {it.gst_rate}%</span>
                    </td>
                    <td className="num strong">{money(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="totals" style={{ marginTop: 14 }}>
            <div>
              <span className="muted">Taxable value</span>
              <span>{money(inv.subtotal)}</span>
            </div>
            <div>
              <span className="muted">GST</span>
              <span>{money(inv.tax_total)}</span>
            </div>
            <div className="grand">
              <span>Grand total</span>
              <span>{money(inv.grand_total)}</span>
            </div>
            <div>
              <span className="muted">Paid</span>
              <span>{money(inv.amount_paid)}</span>
            </div>
            <div className="strong">
              <span>Balance due</span>
              <span>{money(inv.balance_due)}</span>
            </div>
          </div>
          {inv.notes && <p className="small" style={{ marginTop: 12 }}>Notes: {inv.notes}</p>}
        </Card>

        <div className="stack no-print">
          <Card title="Payments received">
            {inv.payments.length === 0 ? (
              <EmptyState title="No payments yet" />
            ) : (
              <ul className="list-plain">
                {inv.payments.map((p) => (
                  <li key={p.id}>
                    <div>
                      <div className="strong">{money(p.amount)}</div>
                      <div className="muted small">
                        {p.method}
                        {p.reference_number && ` · ${p.reference_number}`}
                      </div>
                      {p.notes && <div className="small">{p.notes}</div>}
                    </div>
                    <span className="small">{formatDate(p.payment_date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Reminders">
            <p className="small">
              Last payment reminder: <strong>{inv.last_reminder_at ? formatDateTime(inv.last_reminder_at) : 'never'}</strong>
            </p>
            <p className="muted small" style={{ marginTop: 6 }}>
              Reminders are sent by the payment reminder job (Payments → Run reminders).
            </p>
          </Card>
        </div>
      </div>
      {paying && (
        <RecordPaymentModal
          invoice={inv}
          onClose={() => setPaying(false)}
          onDone={() => {
            setPaying(false)
            toast.success('Payment recorded — receipt emailed')
            invoice.reload()
          }}
        />
      )}
    </>
  )
}
