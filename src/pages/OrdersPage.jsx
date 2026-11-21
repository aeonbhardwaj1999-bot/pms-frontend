import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { Card, EmptyState, ErrorState, Loading, PageHeader, Pagination, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { formatDate, humanize, money, ORDER_STATUSES } from '../utils/format'

const PAGE_SIZE = 20

export default function OrdersPage() {
  const { isInternal, isEngineer } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const hospitalId = params.get('hospital_id') || ''
  const page = Number(params.get('page') || 1)
  const [search, setSearch] = useState(params.get('search') || '')

  const update = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  const hospitals = useAsync(
    () => (isInternal ? api.get('/hospitals/options').then((r) => r.data) : Promise.resolve([])),
    [isInternal],
  )

  const { data, loading, error, reload } = useAsync(
    () =>
      api
        .get('/orders', {
          params: {
            page,
            page_size: PAGE_SIZE,
            status: status || undefined,
            hospital_id: hospitalId || undefined,
            search: params.get('search') || undefined,
          },
        })
        .then((r) => r.data),
    [page, status, hospitalId, params.get('search')],
  )

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Every order from placement to completion"
        actions={
          !isEngineer && (
            <Link className="btn btn-primary" to="/orders/new">
              ＋ New order
            </Link>
          )
        }
      />
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          update({ search })
        }}
      >
        <input
          className="input search"
          placeholder="Search order no., hospital, PO ref…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => update({ status: e.target.value })}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        {isInternal && (
          <select value={hospitalId} onChange={(e) => update({ hospital_id: e.target.value })}>
            <option value="">All hospitals</option>
            {(hospitals.data || []).map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        )}
        <button className="btn">Search</button>
        {(status || hospitalId || params.get('search')) && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setSearch('')
              setParams(new URLSearchParams())
            }}
          >
            Clear filters
          </button>
        )}
      </form>

      <Card flush>
        <ErrorState error={error} onRetry={reload} />
        {loading && !data ? (
          <Loading />
        ) : data && data.items.length === 0 ? (
          <EmptyState title="No orders match these filters" />
        ) : (
          data && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    {isInternal && <th>Hospital</th>}
                    <th>Status</th>
                    <th>Priority</th>
                    <th className="num">Items</th>
                    <th className="num">Value</th>
                    <th>Expected delivery</th>
                    <th>Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((o) => (
                    <tr key={o.id} className="clickable" onClick={() => navigate(`/orders/${o.id}`)}>
                      <td className="strong">{o.order_number}</td>
                      {isInternal && (
                        <td>
                          {o.hospital.name}
                          <span className="cell-sub">{o.hospital.code}</span>
                        </td>
                      )}
                      <td>
                        <StatusBadge value={o.status} />
                      </td>
                      <td>
                        <StatusBadge value={o.priority} />
                      </td>
                      <td className="num">{o.item_count}</td>
                      <td className="num">{money(o.grand_total)}</td>
                      <td>{formatDate(o.expected_delivery_date)}</td>
                      <td>{formatDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {data && (
          <div style={{ padding: '0 14px' }}>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={(p) => update({ page: String(p) })} />
          </div>
        )}
      </Card>
    </>
  )
}
