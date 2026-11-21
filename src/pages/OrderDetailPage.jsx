import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, downloadFile, errorMessage, isNotImplemented, notImplementedInfo } from '../api/client'
import {
  AcceptOrderModal,
  DispatchModal,
  InvoiceModal,
  PurchaseOrderModal,
  ReasonModal,
  ReportIssueModal,
  SignReportModal,
  TrackingEventModal,
  UploadSignedCopyModal,
} from '../components/modals'
import { Card, DefinitionList, EmptyState, ErrorState, Loading, NotImplementedNotice, PageHeader, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { daysFromToday, formatDate, formatDateTime, humanize, money } from '../utils/format'

const FLOW = ['PENDING', 'ACCEPTED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'COMPLETED']
const FLOW_LABELS = ['Placed', 'Accepted', 'Processing', 'Dispatched', 'Delivered', 'Completed']

function Stepper({ order }) {
  if (['REJECTED', 'CANCELLED'].includes(order.status)) {
    const reason = order.rejection_reason || order.cancellation_reason
    return (
      <div className="notice notice-error">
        <span>
          <strong>Order {humanize(order.status).toLowerCase()}.</strong> {reason}
        </span>
      </div>
    )
  }
  const current = FLOW.indexOf(order.status)
  return (
    <div className="stepper">
      {FLOW.map((s, i) => (
        <div key={s} className={`step ${i <= current ? 'done' : ''} ${i === current ? 'current' : ''}`}>
          <span className="dot" />
          {FLOW_LABELS[i]}
        </div>
      ))}
    </div>
  )
}

function Timeline({ orderId }) {
  const { data, loading, error } = useAsync(() => api.get(`/orders/${orderId}/timeline`).then((r) => r.data), [orderId])
  if (loading) return <Loading />
  if (error) return isNotImplemented(error) ? <NotImplementedNotice error={error} compact /> : <ErrorState error={error} />
  if (!data.length) return <EmptyState title="No history yet" />
  return (
    <ul className="timeline">
      {data.map((e) => (
        <li key={e.id}>
          <div className="t-title">{humanize(e.to_status)}</div>
          {e.note && <div>{e.note}</div>}
          <div className="t-meta">
            {formatDateTime(e.created_at)}
            {e.changed_by_name && ` · ${e.changed_by_name}`}
          </div>
        </li>
      ))}
    </ul>
  )
}

function ShipmentCard({ shipment, canUpdate, onUpdate }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="row-between">
        <div>
          <span className="strong mono">{shipment.tracking_number}</span>{' '}
          <StatusBadge value={shipment.status} />
          <div className="muted small">
            {shipment.method === 'COURIER'
              ? `Courier · ${shipment.courier_name}`
              : `Hand delivery · ${shipment.delivery_person}${shipment.delivery_person_phone ? ` (${shipment.delivery_person_phone})` : ''}`}
            {' · dispatched '}
            {formatDateTime(shipment.dispatched_at)}
          </div>
        </div>
        {canUpdate && ['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(shipment.status) && (
          <button className="btn btn-sm btn-primary" onClick={() => onUpdate(shipment)}>
            Add tracking update
          </button>
        )}
      </div>
      <ul className="timeline" style={{ marginTop: 12 }}>
        {[...shipment.events].reverse().map((e) => (
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
    </div>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const { isManager, isHospital, isInternal } = useAuth()
  const toast = useToast()
  const [modal, setModal] = useState(null)
  const { data: order, loading, error, reload } = useAsync(() => api.get(`/orders/${id}`).then((r) => r.data), [id])

  if (loading && !order) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const close = () => setModal(null)
  const done = (message) => () => {
    setModal(null)
    toast.success(message)
    reload()
  }
  const act = async (fn, message) => {
    try {
      await fn()
      toast.success(message)
      reload()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const download = async (path, name) => {
    try {
      await downloadFile(path, null, name)
    } catch (e) {
      if (isNotImplemented(e)) toast.warn(`🚧 ${notImplementedInfo(e).message}`)
      else toast.error(errorMessage(e))
    }
  }

  const s = order.status
  const report = order.satisfaction_report
  const canInvoice = isManager && ['ACCEPTED', 'PROCESSING', 'DISPATCHED', 'DELIVERED'].includes(s)
  const shortItems = order.items.filter((i) => i.reserved_quantity < i.quantity)
  const etaDays = daysFromToday(order.expected_delivery_date)

  return (
    <>
      <PageHeader
        back={<Link to="/orders" className="back-link">← Orders</Link>}
        title={
          <span className="row">
            {order.order_number} <StatusBadge value={s} />
            {order.priority === 'URGENT' && <StatusBadge value="URGENT" />}
          </span>
        }
        subtitle={
          <>
            {isInternal ? <Link to={`/hospitals/${order.hospital.id}`}>{order.hospital.name}</Link> : order.hospital.name}
            {' · placed '}
            {formatDateTime(order.created_at)}
            {order.created_by && ` by ${order.created_by.full_name}`}
          </>
        }
        actions={
          <>
            {isManager && s === 'PENDING' && (
              <>
                <button className="btn btn-primary" onClick={() => setModal({ type: 'accept' })}>
                  Check stock & accept
                </button>
                <button className="btn btn-danger" onClick={() => setModal({ type: 'reject' })}>
                  Reject
                </button>
              </>
            )}
            {isManager && s === 'ACCEPTED' && (
              <button className="btn btn-primary" onClick={() => act(() => api.post(`/orders/${id}/start-processing`, {}), 'Processing started')}>
                Start processing
              </button>
            )}
            {isManager && ['ACCEPTED', 'PROCESSING'].includes(s) && (
              <>
                <button className="btn btn-primary" onClick={() => setModal({ type: 'dispatch' })}>
                  Dispatch
                </button>
                <button className="btn" onClick={() => setModal({ type: 'po' })}>
                  Raise import PO
                </button>
              </>
            )}
            {canInvoice && (
              <button className="btn" onClick={() => setModal({ type: 'invoice' })}>
                Raise invoice
              </button>
            )}
            {((isManager && ['PENDING', 'ACCEPTED', 'PROCESSING'].includes(s)) || (isHospital && s === 'PENDING')) && (
              <button className="btn btn-danger" onClick={() => setModal({ type: 'cancel' })}>
                Cancel order
              </button>
            )}
            {(isHospital || isManager) && ['DISPATCHED', 'DELIVERED', 'COMPLETED'].includes(s) && (
              <button className="btn" onClick={() => setModal({ type: 'issue' })}>
                Report a problem
              </button>
            )}
          </>
        }
      />

      <Stepper order={order} />

      <div className="detail-grid">
        <div className="stack">
          <Card title="Summary">
            <DefinitionList
              items={[
                ['Expected delivery', order.expected_delivery_date ? (
                  <>
                    {formatDate(order.expected_delivery_date)}
                    {etaDays !== null && !['DELIVERED', 'COMPLETED'].includes(s) && (
                      <span className={`cell-sub ${etaDays < 0 ? 'danger-text' : ''}`}>
                        {etaDays < 0 ? `${-etaDays} days overdue` : `in ${etaDays} days`}
                      </span>
                    )}
                  </>
                ) : 'To be confirmed'],
                ['Delivery window', order.delivery_window_max_days ? `${order.delivery_window_min_days}–${order.delivery_window_max_days} days` : '—'],
                ['Hospital PO ref.', order.po_reference],
                ['Accepted', formatDateTime(order.accepted_at)],
                ['Dispatched', formatDateTime(order.dispatched_at)],
                ['Delivered', formatDateTime(order.delivered_at)],
                order.completed_at && ['Completed', formatDateTime(order.completed_at)],
              ]}
            />
            {order.notes && (
              <div style={{ marginTop: 14 }}>
                <div className="muted small strong">Notes</div>
                <div>{order.notes}</div>
              </div>
            )}
          </Card>

          <Card title="Items" flush>
            {isManager && shortItems.length > 0 && ['ACCEPTED', 'PROCESSING'].includes(s) && (
              <div className="notice notice-pending compact" style={{ margin: 14 }}>
                Waiting for stock: {shortItems.map((i) => `${i.product.name} (${i.quantity - i.reserved_quantity} short)`).join(', ')}. Receive the
                import PO to allocate stock before dispatch.
              </div>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">Qty</th>
                    {isInternal && <th className="num">Reserved</th>}
                    <th className="num">Unit price</th>
                    <th className="num">GST</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.product.name}
                        <span className="cell-sub mono">
                          {i.product.sku} · {humanize(i.product.category)}
                          {i.product.is_imported && ' · imported'}
                        </span>
                      </td>
                      <td className="num">{i.quantity}</td>
                      {isInternal && (
                        <td className={`num ${i.reserved_quantity < i.quantity ? 'danger-text' : 'success-text'}`}>{i.reserved_quantity}</td>
                      )}
                      <td className="num">{money(i.unit_price)}</td>
                      <td className="num">
                        {i.gst_rate}%<span className="cell-sub">{money(i.line_tax)}</span>
                      </td>
                      <td className="num strong">{money(i.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={isInternal ? 5 : 4} className="num">
                      Subtotal {money(order.subtotal)} · GST {money(order.tax_total)}
                    </td>
                    <td className="num">{money(order.grand_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card title="Dispatch & tracking">
            {order.shipments.length === 0 ? (
              <EmptyState title="Not dispatched yet">Tracking details appear here once the order is dispatched.</EmptyState>
            ) : (
              order.shipments.map((sh) => (
                <ShipmentCard key={sh.id} shipment={sh} canUpdate={isManager} onUpdate={(shipment) => setModal({ type: 'track', shipment })} />
              ))
            )}
          </Card>

          <Card title="Order history">
            <Timeline orderId={order.id} />
          </Card>
        </div>

        <div className="stack">
          <Card title="Invoices">
            {order.invoices.length === 0 ? (
              <p className="muted">No invoices yet.</p>
            ) : (
              <ul className="list-plain">
                {order.invoices.map((inv) => (
                  <li key={inv.id}>
                    <div>
                      <Link to={`/invoices/${inv.id}`} className="strong">
                        {inv.invoice_number}
                      </Link>{' '}
                      <StatusBadge value={inv.type} />
                      <div className="muted small">Due {formatDate(inv.due_date)}</div>
                    </div>
                    <div className="right">
                      {money(inv.grand_total)}
                      <div>
                        <StatusBadge value={inv.status} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Satisfaction letter">
            {!report ? (
              <p className="muted">Sent to the hospital automatically when the order is delivered.</p>
            ) : (
              <>
                <div className="row-between" style={{ marginBottom: 10 }}>
                  <StatusBadge value={report.status} />
                  <span className="muted small">Sent {formatDateTime(report.sent_at)}</span>
                </div>
                {report.status === 'SIGNED' && <p className="small">Signed {formatDateTime(report.signed_at)}</p>}
                <div className="row">
                  <button className="btn btn-sm" onClick={() => download(`/satisfaction-reports/${report.id}/letter`, `${order.order_number}-satisfaction.pdf`)}>
                    Download letter
                  </button>
                  {report.status === 'PENDING_SIGNATURE' && !isInternal && (
                    <button className="btn btn-sm btn-primary" onClick={() => setModal({ type: 'sign', report })}>
                      Confirm satisfied & sign
                    </button>
                  )}
                  {report.status === 'PENDING_SIGNATURE' && isManager && (
                    <>
                      <button className="btn btn-sm btn-primary" onClick={() => setModal({ type: 'sign', report })}>
                        Record signed copy
                      </button>
                      <button className="btn btn-sm" onClick={() => setModal({ type: 'upload', report })}>
                        Upload scan
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </Card>

          <Card title="Service issues">
            {order.issues.length === 0 ? (
              <p className="muted">No issues reported.</p>
            ) : (
              <ul className="list-plain">
                {order.issues.map((i) => (
                  <li key={i.id}>
                    <div>
                      <Link to={`/issues?focus=${i.id}`} className="strong">
                        {i.issue_number}
                      </Link>
                      <div className="small">{i.title}</div>
                    </div>
                    <StatusBadge value={i.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {isInternal && (
            <Card title="Import / purchase orders">
              {order.purchase_orders.length === 0 ? (
                <p className="muted">No purchase orders linked.</p>
              ) : (
                <ul className="list-plain">
                  {order.purchase_orders.map((po) => (
                    <li key={po.id}>
                      <div>
                        <Link to="/procurement" className="strong">
                          {po.po_number}
                        </Link>
                        <div className="muted small">ETA {formatDate(po.expected_arrival_date)}</div>
                      </div>
                      <StatusBadge value={po.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>

      {modal?.type === 'accept' && <AcceptOrderModal order={order} onClose={close} onDone={done('Order accepted — hospital notified')} />}
      {modal?.type === 'reject' && (
        <ReasonModal
          title={`Reject ${order.order_number}`}
          label="Reason (sent to the hospital)"
          confirmLabel="Reject order"
          danger
          onSubmit={(reason) => api.post(`/orders/${id}/reject`, { reason })}
          onClose={close}
          onDone={done('Order rejected')}
        />
      )}
      {modal?.type === 'cancel' && (
        <ReasonModal
          title={`Cancel ${order.order_number}`}
          label="Cancellation reason"
          confirmLabel="Cancel order"
          danger
          onSubmit={(reason) => api.post(`/orders/${id}/cancel`, { reason })}
          onClose={close}
          onDone={done('Order cancelled')}
        />
      )}
      {modal?.type === 'dispatch' && <DispatchModal order={order} onClose={close} onDone={done('Order dispatched — tracking emailed')} />}
      {modal?.type === 'track' && <TrackingEventModal shipment={modal.shipment} onClose={close} onDone={done('Tracking updated')} />}
      {modal?.type === 'invoice' && <InvoiceModal order={order} onClose={close} onDone={(inv) => done(`Invoice ${inv.invoice_number} created`)()} />}
      {modal?.type === 'po' && <PurchaseOrderModal order={order} onClose={close} onDone={(po) => done(`Purchase order ${po.po_number} placed`)()} />}
      {modal?.type === 'sign' && <SignReportModal report={modal.report} onClose={close} onDone={done('Satisfaction letter signed')} />}
      {modal?.type === 'upload' && <UploadSignedCopyModal report={modal.report} onClose={close} onDone={done('Signed copy uploaded')} />}
      {modal?.type === 'issue' && (
        <ReportIssueModal order={order} report={report} onClose={close} onDone={(issue) => done(`Issue ${issue.issue_number} registered`)()} />
      )}
    </>
  )
}
