import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { Card, ErrorState, Field, FormError, Loading, Modal, PageHeader, StatusBadge, useSubmit } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { formatDate, humanize } from '../utils/format'

function CreateUserModal({ onClose, onDone }) {
  const hospitals = useAsync(() => api.get('/hospitals/options').then((r) => r.data), [])
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', role: 'STAFF', hospital_id: '' })
  const { busy, error, run } = useSubmit()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    run(() =>
      api.post('/users', {
        ...form,
        phone: form.phone || null,
        hospital_id: form.role === 'HOSPITAL' ? Number(form.hospital_id) : null,
      }),
    )
      .then(onDone)
      .catch(() => {})
  }
  return (
    <Modal
      title="Create user"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button form="user-form" className="btn btn-primary" disabled={busy}>
            Create
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit}>
        <Field label="Role">
          <select value={form.role} onChange={set('role')}>
            {['ADMIN', 'STAFF', 'ENGINEER', 'HOSPITAL'].map((r) => (
              <option key={r} value={r}>
                {humanize(r)}
              </option>
            ))}
          </select>
        </Field>
        {form.role === 'HOSPITAL' && (
          <Field label="Hospital" required>
            <select required value={form.hospital_id} onChange={set('hospital_id')}>
              <option value="">Select…</option>
              {(hospitals.data || []).map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Full name" required>
          <input className="input" required value={form.full_name} onChange={set('full_name')} />
        </Field>
        <Field label="Email" required>
          <input className="input" type="email" required value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Phone">
          <input className="input" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Temporary password" required hint="At least 8 characters">
          <input className="input" required minLength={8} value={form.password} onChange={set('password')} />
        </Field>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const { data, loading, error, reload } = useAsync(() => api.get('/users').then((r) => r.data), [])

  const toggle = async (u) => {
    try {
      await api.patch(`/users/${u.id}`, { is_active: !u.is_active })
      toast.success(`${u.full_name} ${u.is_active ? 'deactivated' : 'activated'}`)
      reload()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Company staff, engineers and hospital portal logins"
        actions={
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            ＋ Create user
          </button>
        }
      />
      <Card flush>
        <ErrorState error={error} onRetry={reload} />
        {loading && !data ? (
          <Loading />
        ) : (
          data && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Hospital</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.map((u) => (
                    <tr key={u.id}>
                      <td className="strong">{u.full_name}</td>
                      <td>{u.email}</td>
                      <td>
                        <StatusBadge value={u.role} />
                      </td>
                      <td>{u.hospital?.name || '—'}</td>
                      <td>{formatDate(u.created_at)}</td>
                      <td>{u.is_active ? <StatusBadge tone="green">Active</StatusBadge> : <StatusBadge tone="gray">Disabled</StatusBadge>}</td>
                      <td className="right">
                        {u.id !== me.id && (
                          <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : ''}`} onClick={() => toggle(u)}>
                            {u.is_active ? 'Deactivate' : 'Activate'}
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
      </Card>
      {creating && (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false)
            toast.success('User created')
            reload()
          }}
        />
      )}
    </>
  )
}
