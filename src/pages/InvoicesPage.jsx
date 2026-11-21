import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { Card, EmptyState, ErrorState, Loading, PageHeader, Pagination, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { formatDate, humanize, INVOICE_STATUSES, money } from '../utils/format'

export default function InvoicesPage() {
  const { isInternal } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [overdue, setOverdue] = useState(params.get('overdue') === '1')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  const { data, loading, error, reload } = useAsync(
    () =>
      api
        .get('/invoices', {
          params: {
            page,
            page_size: 20,
            status: status || undefined,
            type: type || undefined,
            overdue: overdue || undefined,
            search: query || undefined,
          },
        })
        .then((r) => r.data),
    [page, status, type, overdue, query],
  )

  const resetPage = (fn) => (e) => {
    setPage(1)
    fn(e)
  }

  return (
    <>
      <PageHeader title="Invoices" subtitle="Proforma and tax invoices with payment status" />
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          setPage(1)
          setQuery(search)
        }}
      >
        <input className="input search" placeholder="Invoice no., order no. or hospital…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={type} onChange={resetPage((e) => setType(e.target.value))}>
          <option value="">All types</option>
          <option value="PROFORMA">Proforma</option>
          <option value="TAX">Tax invoice</option>
        </select>
        <select value={status} onChange={resetPage((e) => setStatus(e.target.value))}>
          <option value="">All statuses</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        <label className="checkbox">
          <input type="checkbox" checked={overdue} onChange={resetPage((e) => setOverdue(e.target.checked))} />
          Overdue only
        </label>
        <button className="btn">Search</button>
      </form>
      <Card flush>
        <ErrorState error={error} onRetry={reload} />
        {loading && !data ? (
          <Loading />
        ) : data?.items.length === 0 ? (
          <EmptyState title="No invoices found" />
        ) : (
          data && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Order</th>
                    {isInternal && <th>Hospital</th>}
                    <th>Issued</th>
                    <th>Due</th>
                    <th className="num">Amount</th>
                    <th className="num">Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((inv) => (
                    <tr key={inv.id} className="clickable" onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <td>
                        <span className="strong">{inv.invoice_number}</span>{' '}
                        <StatusBadge value={inv.type} />
                      </td>
                      <td>{inv.order.order_number}</td>
                      {isInternal && <td>{inv.hospital.name}</td>}
                      <td>{formatDate(inv.issue_date)}</td>
                      <td>
                        {formatDate(inv.due_date)}
                        <span className="cell-sub">{inv.payment_terms_days}-day terms</span>
                      </td>
                      <td className="num">{money(inv.grand_total)}</td>
                      <td className={`num ${inv.balance_due > 0 ? 'strong' : 'muted'}`}>{money(inv.balance_due)}</td>
                      <td>
                        <StatusBadge value={inv.status} /> {inv.is_overdue && inv.status !== 'OVERDUE' && <StatusBadge value="OVERDUE" />}
                      </td>
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
