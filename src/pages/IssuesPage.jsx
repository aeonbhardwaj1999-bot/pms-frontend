import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { AssignEngineerModal, IssueStatusModal } from '../components/modals'
import { Card, DefinitionList, EmptyState, ErrorState, Loading, Modal, PageHeader, Pagination, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { formatDate, formatDateTime, humanize, ISSUE_STATUSES } from '../utils/format'

function IssueDetail({ issue, onClose, onAssign, onStatus, canAssign, canUpdate }) {
  return (
    <Modal
      wide
      title={`${issue.issue_number} · ${issue.title}`}
      onClose={onClose}
      footer={
        <>
          {canAssign && issue.status !== 'RESOLVED' && issue.status !== 'CLOSED' && (
            <button className="btn" onClick={onAssign}>
              {issue.assigned_engineer ? 'Re-assign engineer' : 'Assign engineer'}
            </button>
          )}
          {canUpdate && issue.status !== 'CLOSED' && (
            <button className="btn btn-primary" onClick={onStatus}>
              Update status
            </button>
          )}
        </>
      }
    >
      <div className="row" style={{ marginBottom: 14 }}>
        <StatusBadge value={issue.status} />
        <StatusBadge value={issue.priority} />
        <span className="muted small">Reported via {humanize(issue.reported_via)} · {formatDateTime(issue.created_at)}</span>
      </div>
      <p style={{ whiteSpace: 'pre-wrap', marginBottom: 16 }}>{issue.description}</p>
      <DefinitionList
        items={[
          ['Hospital', issue.hospital.name],
          ['Order', <Link to={`/orders/${issue.order.id}`}>{issue.order.order_number}</Link>],
          ['Product', issue.product?.name || 'Whole order'],
          ['Engineer', issue.assigned_engineer?.full_name || 'Not assigned'],
          ['Visit date', formatDate(issue.visit_date)],
          ['Resolved', formatDateTime(issue.resolved_at)],
        ]}
      />
      {issue.resolution_notes && (
        <div style={{ marginTop: 16 }}>
          <div className="muted small strong">Resolution notes</div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{issue.resolution_notes}</p>
        </div>
      )}
    </Modal>
  )
}

export default function IssuesPage() {
  const { isManager, isEngineer, isInternal, isHospital } = useAuth()
  const toast = useToast()
  const [params] = useSearchParams()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [openOnly, setOpenOnly] = useState(params.get('open') === '1')
  const [mine, setMine] = useState(false)
  const [selected, setSelected] = useState(null)
  const [action, setAction] = useState(null)

  const { data, loading, error, reload } = useAsync(
    () =>
      api
        .get('/issues', {
          params: { page, page_size: 20, status: status || undefined, open_only: openOnly || undefined, assigned_to_me: mine || undefined },
        })
        .then((r) => r.data),
    [page, status, openOnly, mine],
  )

  // Deep link from the order page: /issues?focus=<id>
  useEffect(() => {
    const focus = params.get('focus')
    if (focus) api.get(`/issues/${focus}`).then((r) => setSelected(r.data)).catch(() => {})
  }, [params])

  const updated = (msg) => (issue) => {
    setAction(null)
    setSelected(issue)
    toast.success(msg)
    reload()
  }

  return (
    <>
      <PageHeader
        title="Service issues"
        subtitle={isHospital ? 'Problems you reported with delivered products' : 'Complaints after delivery and engineer visits'}
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
          {ISSUE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        <label className="checkbox">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /> Open only
        </label>
        {isEngineer && (
          <label className="checkbox">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Assigned to me
          </label>
        )}
      </div>
      <Card flush>
        <ErrorState error={error} onRetry={reload} />
        {loading && !data ? (
          <Loading />
        ) : data?.items.length === 0 ? (
          <EmptyState title="No service issues">Issues are raised from a delivered order or its satisfaction letter.</EmptyState>
        ) : (
          data && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Issue</th>
                    {isInternal && <th>Hospital</th>}
                    <th>Order</th>
                    <th>Priority</th>
                    <th>Engineer</th>
                    <th>Reported</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((i) => (
                    <tr key={i.id} className="clickable" onClick={() => setSelected(i)}>
                      <td>
                        <span className="strong">{i.issue_number}</span>
                        <span className="cell-sub">{i.title}</span>
                      </td>
                      {isInternal && <td>{i.hospital.name}</td>}
                      <td>{i.order.order_number}</td>
                      <td>
                        <StatusBadge value={i.priority} />
                      </td>
                      <td>
                        {i.assigned_engineer?.full_name || <span className="muted">Unassigned</span>}
                        {i.visit_date && <span className="cell-sub">Visit {formatDate(i.visit_date)}</span>}
                      </td>
                      <td>{formatDate(i.created_at)}</td>
                      <td>
                        <StatusBadge value={i.status} />
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
      {selected && !action && (
        <IssueDetail
          issue={selected}
          canAssign={isManager}
          canUpdate={isInternal}
          onClose={() => setSelected(null)}
          onAssign={() => setAction('assign')}
          onStatus={() => setAction('status')}
        />
      )}
      {selected && action === 'assign' && (
        <AssignEngineerModal issue={selected} onClose={() => setAction(null)} onDone={updated('Engineer assigned — hospital informed')} />
      )}
      {selected && action === 'status' && <IssueStatusModal issue={selected} onClose={() => setAction(null)} onDone={updated('Issue updated')} />}
    </>
  )
}
