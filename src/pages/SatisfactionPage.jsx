import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, downloadFile, errorMessage, isNotImplemented, notImplementedInfo } from '../api/client'
import { ReportIssueModal, SignReportModal, UploadSignedCopyModal } from '../components/modals'
import { Card, EmptyState, ErrorState, Loading, PageHeader, Pagination, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { formatDateTime, humanize, SATISFACTION_STATUSES } from '../utils/format'

export default function SatisfactionPage() {
  const { isManager, isHospital } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [modal, setModal] = useState(null)

  const { data, loading, error, reload } = useAsync(
    () => api.get('/satisfaction-reports', { params: { page, page_size: 20, status: status || undefined } }).then((r) => r.data),
    [page, status],
  )

  const download = async (path, name) => {
    try {
      await downloadFile(path, null, name)
    } catch (e) {
      if (isNotImplemented(e)) toast.warn(`🚧 ${notImplementedInfo(e).message}`)
      else toast.error(errorMessage(e))
    }
  }
  const resend = async (r) => {
    try {
      await api.post(`/satisfaction-reports/${r.id}/resend`)
      toast.success('Satisfaction letter re-sent to hospital')
      reload()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const openIssue = async (r) => {
    const { data: order } = await api.get(`/orders/${r.order.id}`)
    setModal({ type: 'issue', report: r, order })
  }
  const close = () => setModal(null)
  const done = (msg) => () => {
    close()
    toast.success(msg)
    reload()
  }

  return (
    <>
      <PageHeader
        title="Satisfaction letters"
        subtitle={
          isHospital
            ? 'Please sign & stamp the satisfaction letter once products are working fine, or report any problem.'
            : 'Signed & stamped confirmation from hospitals after delivery / installation'
        }
      />
      <div className="toolbar">
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
        >
          <option value="">All statuses</option>
          {SATISFACTION_STATUSES.map((s) => (
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
          <EmptyState title="No satisfaction letters" />
        ) : (
          data && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    {!isHospital && <th>Hospital</th>}
                    <th>Sent</th>
                    <th>Status</th>
                    <th>Signed by</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link to={`/orders/${r.order.id}`} className="strong">
                          {r.order.order_number}
                        </Link>
                      </td>
                      {!isHospital && <td>{r.hospital.name}</td>}
                      <td>{formatDateTime(r.sent_at)}</td>
                      <td>
                        <StatusBadge value={r.status} />
                      </td>
                      <td>
                        {r.signed_by_name ? (
                          <>
                            {r.signed_by_name}
                            <span className="cell-sub">
                              {r.signed_by_designation} {formatDateTime(r.signed_at)}
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="nowrap right">
                        <button className="btn btn-sm btn-ghost" onClick={() => download(`/satisfaction-reports/${r.id}/letter`, `${r.order.order_number}-satisfaction.pdf`)}>
                          Letter PDF
                        </button>
                        {r.signed_document_path && (
                          <button className="btn btn-sm btn-ghost" onClick={() => download(`/satisfaction-reports/${r.id}/signed-copy`, `${r.order.order_number}-signed`)}>
                            Signed copy
                          </button>
                        )}
                        {r.status === 'PENDING_SIGNATURE' && (isManager || isHospital) && (
                          <>
                            <button className="btn btn-sm btn-primary" onClick={() => setModal({ type: 'sign', report: r })}>
                              {isHospital ? 'Sign' : 'Record signed'}
                            </button>{' '}
                            <button className="btn btn-sm" onClick={() => setModal({ type: 'upload', report: r })}>
                              Upload scan
                            </button>
                          </>
                        )}
                        {r.status !== 'SIGNED' && (isManager || isHospital) && (
                          <button className="btn btn-sm btn-ghost danger-text" onClick={() => openIssue(r)}>
                            Report problem
                          </button>
                        )}
                        {isManager && r.status === 'PENDING_SIGNATURE' && (
                          <button className="btn btn-sm btn-ghost" onClick={() => resend(r)}>
                            Re-send
                          </button>
                        )}
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
      {modal?.type === 'sign' && <SignReportModal report={modal.report} onClose={close} onDone={done('Satisfaction letter signed')} />}
      {modal?.type === 'upload' && <UploadSignedCopyModal report={modal.report} onClose={close} onDone={done('Signed copy uploaded')} />}
      {modal?.type === 'issue' && (
        <ReportIssueModal order={modal.order} report={modal.report} onClose={close} onDone={(i) => done(`Issue ${i.issue_number} registered`)()} />
      )}
    </>
  )
}
