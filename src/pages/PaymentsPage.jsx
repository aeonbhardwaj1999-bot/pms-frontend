import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, downloadFile } from '../api/client'
import { Card, EmptyState, ErrorState, Field, FormError, Loading, PageHeader, Pagination, useSubmit } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { formatDate, money, todayISO } from '../utils/format'

function firstOfMonth() {
  return `${todayISO().slice(0, 8)}01`
}

export default function PaymentsPage() {
  const { isManager, isInternal } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [range, setRange] = useState({ from: firstOfMonth(), to: todayISO() })
  const reminders = useSubmit()
  const exporter = useSubmit()

  const { data, loading, error, reload } = useAsync(
    () => api.get('/payments', { params: { page, page_size: 20 } }).then((r) => r.data),
    [page],
  )

  const runReminders = () =>
    reminders
      .run(() => api.post('/payments/reminders/run'))
      .then(({ data: r }) =>
        toast.success(`Checked ${r.checked} invoices · ${r.reminders_queued} reminders queued · ${r.marked_overdue} marked overdue`),
      )
      .catch(() => {})

  const exportCsv = (e) => {
    e.preventDefault()
    exporter
      .run(() => downloadFile('/reports/sales.csv', { date_from: range.from, date_to: range.to }, `sales-${range.from}-to-${range.to}.csv`))
      .catch(() => {})
  }

  return (
    <>
      <PageHeader title="Payments" subtitle="Payments received against proforma and tax invoices" />
      {isManager && (
        <div className="grid-2" style={{ marginBottom: 16 }}>
          <Card title="Payment reminders">
            <p className="muted small" style={{ marginBottom: 12 }}>
              Emails hospitals whose invoices are due within 3 days or already overdue, and flags overdue invoices.
            </p>
            <FormError error={reminders.error} />
            <button className="btn btn-primary" onClick={runReminders} disabled={reminders.busy}>
              {reminders.busy ? 'Running…' : 'Run payment reminders now'}
            </button>
          </Card>
          <Card title="Sales report (CSV)">
            <form onSubmit={exportCsv}>
              <div className="form-grid">
                <Field label="From">
                  <input className="input" type="date" required value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
                </Field>
                <Field label="To">
                  <input className="input" type="date" required value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
                </Field>
              </div>
              <FormError error={exporter.error} />
              <button className="btn" disabled={exporter.busy}>
                {exporter.busy ? 'Preparing…' : 'Download CSV'}
              </button>
            </form>
          </Card>
        </div>
      )}
      <Card flush title="Payment history">
        <ErrorState error={error} onRetry={reload} />
        {loading && !data ? (
          <Loading />
        ) : data?.items.length === 0 ? (
          <EmptyState title="No payments recorded" />
        ) : (
          data && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice</th>
                    {isInternal && <th>Hospital</th>}
                    <th>Method</th>
                    <th>Reference</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDate(p.payment_date)}</td>
                      <td>
                        <Link to={`/invoices/${p.invoice.id}`}>{p.invoice.invoice_number}</Link>
                      </td>
                      {isInternal && <td>{p.invoice.hospital.name}</td>}
                      <td>{p.method}</td>
                      <td className="mono">{p.reference_number || '—'}</td>
                      <td className="num strong">{money(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {data && (
          <div style={{ padding: '0 14px' }}>
            <Pagination page={page} pageSize={20} total={data.total} onChange={setPage} />
          </div>
        )}
      </Card>
    </>
  )
}
