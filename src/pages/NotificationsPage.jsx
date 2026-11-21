import { Fragment, useState } from 'react'
import { api } from '../api/client'
import { Card, EmptyState, ErrorState, FormError, Loading, PageHeader, Pagination, StatusBadge, useSubmit } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { formatDateTime, humanize, NOTIFICATION_CATEGORIES } from '../utils/format'

export default function NotificationsPage() {
  const { isManager } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(null)
  const dispatcher = useSubmit()

  const { data, loading, error, reload } = useAsync(
    () =>
      api
        .get('/notifications', { params: { page, page_size: 25, category: category || undefined, status: status || undefined } })
        .then((r) => r.data),
    [page, category, status],
  )

  const sendQueued = () =>
    dispatcher
      .run(() => api.post('/notifications/dispatch'))
      .then(({ data: r }) => {
        toast.success(`Sent ${r.sent} of ${r.attempted} emails${r.failed ? ` · ${r.failed} failed` : ''}`)
        reload()
      })
      .catch(() => {})

  return (
    <>
      <PageHeader
        title="Email outbox"
        subtitle="Every email the system sends to hospitals and to our team"
        actions={
          isManager && (
            <button className="btn btn-primary" onClick={sendQueued} disabled={dispatcher.busy}>
              {dispatcher.busy ? 'Sending…' : 'Send queued emails'}
            </button>
          )
        }
      />
      <FormError error={dispatcher.error} />
      <div className="toolbar">
        <select
          value={category}
          onChange={(e) => {
            setPage(1)
            setCategory(e.target.value)
          }}
        >
          <option value="">All categories</option>
          {NOTIFICATION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {humanize(c)}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
        >
          <option value="">Any delivery status</option>
          {['QUEUED', 'SENT', 'FAILED'].map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
      </div>
      <Card flush>
        <ErrorState error={error} onRetry={reload} />
        {loading && !data ? (
          <Loading />
        ) : data?.items.length === 0 ? (
          <EmptyState title="No emails" />
        ) : (
          data && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>To</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((n) => (
                    <Fragment key={n.id}>
                      <tr className="clickable" onClick={() => setOpen(open === n.id ? null : n.id)}>
                        <td className="nowrap">{formatDateTime(n.created_at)}</td>
                        <td>{n.recipient_email}</td>
                        <td className="strong">{n.subject}</td>
                        <td>
                          <StatusBadge tone="gray">{humanize(n.category)}</StatusBadge>
                        </td>
                        <td>
                          <StatusBadge value={n.status} />
                          {n.sent_at && <span className="cell-sub">{formatDateTime(n.sent_at)}</span>}
                        </td>
                      </tr>
                      {open === n.id && (
                        <tr>
                          <td colSpan={5}>
                            <div className="email-body">{n.body}</div>
                            {n.error && <div className="notice notice-error compact" style={{ marginTop: 8 }}>{n.error}</div>}
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
            <Pagination page={page} pageSize={25} total={data.total} onChange={setPage} />
          </div>
        )}
      </Card>
    </>
  )
}
