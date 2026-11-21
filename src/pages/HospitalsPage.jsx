import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import HospitalFormModal from '../components/HospitalForm'
import { Card, EmptyState, ErrorState, Loading, PageHeader, Pagination, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { humanize } from '../utils/format'

const PAGE_SIZE = 10

export default function HospitalsPage() {
  const { isManager } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const { data, loading, error, reload } = useAsync(
    () => api.get('/hospitals', { params: { page, page_size: PAGE_SIZE, search: query || undefined } }).then((r) => r.data),
    [page, query],
  )

  return (
    <>
      <PageHeader
        title="Hospitals & institutions"
        subtitle="Customer accounts that place orders"
        actions={
          isManager && (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              ＋ Add hospital
            </button>
          )
        }
      />
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          setPage(1)
          setQuery(search)
        }}
      >
        <input className="input search" placeholder="Search name, city or code…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn">Search</button>
      </form>
      <Card flush>
        <ErrorState error={error} onRetry={reload} />
        {loading && !data ? (
          <Loading />
        ) : data && data.items.length === 0 ? (
          <EmptyState title="No hospitals found" />
        ) : (
          data && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Contact</th>
                    <th>City</th>
                    <th className="num">Terms</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((h) => (
                    <tr key={h.id} className="clickable" onClick={() => navigate(`/hospitals/${h.id}`)}>
                      <td className="mono">{h.code}</td>
                      <td className="strong">{h.name}</td>
                      <td>{humanize(h.type)}</td>
                      <td>
                        {h.contact_person}
                        <span className="cell-sub">{h.email}</span>
                      </td>
                      <td>
                        {h.city}
                        <span className="cell-sub">{h.state}</span>
                      </td>
                      <td className="num">{h.default_payment_terms_days} days</td>
                      <td>{h.is_active ? <StatusBadge tone="green">Active</StatusBadge> : <StatusBadge tone="gray">Inactive</StatusBadge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {data && (
          <div style={{ padding: '0 14px' }}>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
          </div>
        )}
      </Card>
      {creating && (
        <HospitalFormModal
          onClose={() => setCreating(false)}
          onDone={(h) => {
            setCreating(false)
            toast.success(`${h.name} added`)
            navigate(`/hospitals/${h.id}`)
          }}
        />
      )}
    </>
  )
}
