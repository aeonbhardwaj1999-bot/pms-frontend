import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Card, EmptyState, ErrorState, Loading, PageHeader, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { compactMoney, daysFromToday, formatDate, humanize, money, ORDER_STATUSES } from '../utils/format'

function Kpi({ label, value, sub, to, alert }) {
  const content = (
    <>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </>
  )
  const cls = `kpi ${alert ? 'alert' : ''}`
  return to ? (
    <Link to={to} className={cls}>
      {content}
    </Link>
  ) : (
    <div className={cls}>{content}</div>
  )
}

function OrdersTable({ orders, empty, showEta }) {
  const navigate = useNavigate()
  if (!orders.length) return <EmptyState title={empty} />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Hospital</th>
            <th>Status</th>
            <th className="num">{showEta ? 'Expected' : 'Value'}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const days = daysFromToday(o.expected_delivery_date)
            return (
              <tr key={o.id} className="clickable" onClick={() => navigate(`/orders/${o.id}`)}>
                <td>
                  <span className="strong">{o.order_number}</span>
                  {o.priority === 'URGENT' && (
                    <>
                      {' '}
                      <StatusBadge value="URGENT" />
                    </>
                  )}
                </td>
                <td>{o.hospital.name}</td>
                <td>
                  <StatusBadge value={o.status} />
                </td>
                <td className="num">
                  {showEta ? (
                    <>
                      {formatDate(o.expected_delivery_date)}
                      {days !== null && (
                        <span className={`cell-sub ${days < 0 ? 'danger-text' : ''}`}>
                          {days < 0 ? `${-days} days late` : `in ${days} days`}
                        </span>
                      )}
                    </>
                  ) : (
                    compactMoney(o.grand_total)
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function DashboardPage() {
  const { user, isHospital, isEngineer } = useAuth()
  const { data, loading, error, reload } = useAsync(() => api.get('/dashboard').then((r) => r.data), [])

  if (loading && !data) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const totalOrders = Object.values(data.orders_by_status).reduce((a, b) => a + b, 0)

  return (
    <>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${user.full_name.split(' ')[0]}`}
        subtitle={isHospital ? `Orders and payments for ${user.hospital?.name}` : 'Overview of orders, dispatch, billing and service'}
        actions={
          !isEngineer && (
            <Link className="btn btn-primary" to="/orders/new">
              ＋ New order
            </Link>
          )
        }
      />

      <div className="kpis">
        <Kpi label="Pending orders" value={data.pending_orders} sub="Awaiting stock check / acceptance" to="/orders?status=PENDING" />
        <Kpi label="Active orders" value={data.active_orders} sub="Accepted, processing or dispatched" to="/orders" />
        <Kpi label="In transit" value={data.in_transit_shipments} sub="Shipments on the way" to="/shipments" />
        <Kpi
          label="Overdue invoices"
          value={data.overdue_invoices}
          sub={`${money(data.overdue_amount)} overdue`}
          to={isEngineer ? undefined : '/invoices?overdue=1'}
          alert={data.overdue_invoices > 0}
        />
        <Kpi label="Outstanding" value={compactMoney(data.outstanding_amount)} sub="Unpaid invoice balance" />
        <Kpi label="Collected this month" value={compactMoney(data.collected_this_month)} sub="Payments received" />
        <Kpi label="Satisfaction letters pending" value={data.pending_signatures} sub="Awaiting sign & stamp" to="/satisfaction" />
        <Kpi label="Open service issues" value={data.open_issues} sub="Engineer visits / complaints" to="/issues?open=1" alert={data.open_issues > 0} />
        {data.low_stock_products !== null && (
          <Kpi label="Low stock products" value={data.low_stock_products} sub="At or below reorder level" to="/products?low=1" alert={data.low_stock_products > 0} />
        )}
      </div>

      <div className="detail-grid">
        <div className="stack">
          <Card title="Upcoming deliveries" actions={<Link to="/orders">All orders →</Link>} flush>
            <OrdersTable orders={data.upcoming_deliveries} empty="No deliveries scheduled" showEta />
          </Card>
          <Card title="Recent orders" flush>
            <OrdersTable orders={data.recent_orders} empty="No orders yet" />
          </Card>
        </div>
        <Card title="Orders by status">
          {totalOrders === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <div className="bars">
              {ORDER_STATUSES.map((s) => {
                const count = data.orders_by_status[s] || 0
                return (
                  <div className="bar-row" key={s}>
                    <span>{humanize(s)}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(count / totalOrders) * 100}%` }} />
                    </div>
                    <span className="right strong">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
