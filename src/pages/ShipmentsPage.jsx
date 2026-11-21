import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { TrackingEventModal } from '../components/modals'
import { Card, EmptyState, ErrorState, Loading, PageHeader, Pagination, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { formatDateTime, humanize, SHIPMENT_STATUSES } from '../utils/format'

export default function ShipmentsPage() {
  const { isManager, isInternal } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [tracking, setTracking] = useState(null)

  const { data, loading, error, reload } = useAsync(
    () => api.get('/shipments', { params: { page, page_size: 20, status: status || undefined, search: query || undefined } }).then((r) => r.data),
    [page, status, query],
  )

  return (
    <>
      <PageHeader title="Dispatch & tracking" subtitle="Courier and hand deliveries with tracking history" />
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          setPage(1)
          setQuery(search)
        }}
      >
        <input className="input search" placeholder="Tracking ID, order no. or hospital…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
        >
          <option value="">All statuses</option>
          {SHIPMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        <button className="btn">Search</button>
      </form>
      <Card flush>
        <ErrorState error={error} onRetry={reload} />
        {loading && !data ? (
          <Loading />
        ) : data?.items.length === 0 ? (
          <EmptyState title="No shipments found" />
        ) : (
          data && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tracking</th>
                    <th>Order</th>
                    {isInternal && <th>Hospital</th>}
                    <th>Method</th>
                    <th>Dispatched</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((s) => (
                    <Fragment key={s.id}>
                      <tr className="clickable" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                        <td className="mono strong">{s.tracking_number}</td>
                        <td>
                          <Link to={`/orders/${s.order.id}`} onClick={(e) => e.stopPropagation()}>
                            {s.order.order_number}
                          </Link>
                        </td>
                        {isInternal && <td>{s.order.hospital.name}</td>}
                        <td>
                          {s.method === 'COURIER' ? s.courier_name : 'Hand delivery'}
                          {s.delivery_person && <span className="cell-sub">{s.delivery_person}</span>}
                        </td>
                        <td>{formatDateTime(s.dispatched_at)}</td>
                        <td>
                          <StatusBadge value={s.status} />
                        </td>
                        <td className="nowrap right">
                          {isManager && ['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status) && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={(e) => {
                                e.stopPropagation()
                                setTracking(s)
                              }}
                            >
                              Update
                            </button>
                          )}{' '}
                          <span className="muted">{expanded === s.id ? '▲' : '▼'}</span>
                        </td>
                      </tr>
                      {expanded === s.id && (
                        <tr>
                          <td colSpan={isInternal ? 7 : 6} style={{ background: 'var(--surface-2)' }}>
                            <ul className="timeline">
                              {[...s.events].reverse().map((e) => (
                                <li key={e.id}>
                                  <div className="t-title">
                                    {humanize(e.status)}
                                    {e.location && <span className="muted"> · {e.location}</span>}
                                  </div>
                                  {e.note && <div>{e.note}</div>}
                                  <div className="t-meta">{formatDateTime(e.created_at)}</div>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
      {tracking && (
        <TrackingEventModal
          shipment={tracking}
          onClose={() => setTracking(null)}
          onDone={() => {
            setTracking(null)
            toast.success('Tracking updated')
            reload()
          }}
        />
      )}
    </>
  )
}
