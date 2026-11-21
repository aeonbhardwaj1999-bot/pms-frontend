import { useState } from 'react'
import { api } from '../api/client'
import { Card, DefinitionList, Field, FormError, PageHeader, StatusBadge, useSubmit } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatDate } from '../utils/format'

export default function ProfilePage() {
  const { user } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [mismatch, setMismatch] = useState(false)
  const { busy, error, run } = useSubmit()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    if (form.new_password !== form.confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    run(() => api.post('/auth/change-password', { current_password: form.current_password, new_password: form.new_password }))
      .then(() => {
        toast.success('Password updated')
        setForm({ current_password: '', new_password: '', confirm: '' })
      })
      .catch(() => {})
  }

  return (
    <>
      <PageHeader title="My profile" />
      <div className="grid-2">
        <Card title="Account">
          <DefinitionList
            items={[
              ['Name', user.full_name],
              ['Email', user.email],
              ['Phone', user.phone],
              ['Role', <StatusBadge value={user.role} />],
              user.hospital && ['Hospital', user.hospital.name],
              ['Member since', formatDate(user.created_at)],
            ]}
          />
        </Card>
        <Card title="Change password">
          <form onSubmit={submit}>
            <Field label="Current password" required>
              <input className="input" type="password" required value={form.current_password} onChange={set('current_password')} />
            </Field>
            <Field label="New password" required hint="At least 8 characters">
              <input className="input" type="password" required minLength={8} value={form.new_password} onChange={set('new_password')} />
            </Field>
            <Field label="Confirm new password" required>
              <input className="input" type="password" required value={form.confirm} onChange={set('confirm')} />
            </Field>
            {mismatch && <div className="notice notice-error compact">Passwords do not match.</div>}
            <FormError error={error} />
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </Card>
      </div>
    </>
  )
}
