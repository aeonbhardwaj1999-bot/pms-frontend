import { useState } from 'react'
import { api } from '../api/client'
import { HOSPITAL_TYPES, humanize } from '../utils/format'
import { Field, FormError, Modal, useSubmit } from './ui'

const EMPTY = {
  name: '',
  type: 'HOSPITAL',
  contact_person: '',
  email: '',
  phone: '',
  gstin: '',
  address_line: '',
  city: '',
  state: '',
  pincode: '',
  default_payment_terms_days: 15,
}

/** Create (with optional portal login) or edit a hospital account. */
export default function HospitalFormModal({ hospital, onClose, onDone }) {
  const editing = Boolean(hospital)
  const [form, setForm] = useState(() =>
    editing ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, hospital[k] ?? ''])) : EMPTY,
  )
  const [withPortal, setWithPortal] = useState(!editing)
  const [portal, setPortal] = useState({ full_name: '', email: '', password: '' })
  const { busy, error, run } = useSubmit()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]))
    body.default_payment_terms_days = Number(form.default_payment_terms_days)
    if (!editing && withPortal) body.portal_user = portal
    run(() => (editing ? api.patch(`/hospitals/${hospital.id}`, body) : api.post('/hospitals', body)))
      .then(({ data }) => onDone(data))
      .catch(() => {})
  }

  return (
    <Modal
      wide
      title={editing ? `Edit ${hospital.name}` : 'Add hospital / institution'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button form="hospital-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create account'}
          </button>
        </>
      }
    >
      <form id="hospital-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Name" required>
            <input className="input" required value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Type">
            <select value={form.type} onChange={set('type')}>
              {HOSPITAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contact person" required>
            <input className="input" required value={form.contact_person} onChange={set('contact_person')} />
          </Field>
          <Field label="Email (receives all notifications)" required>
            <input className="input" type="email" required value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="GSTIN">
            <input className="input" maxLength={15} value={form.gstin} onChange={set('gstin')} />
          </Field>
          <Field label="Address">
            <input className="input" value={form.address_line} onChange={set('address_line')} />
          </Field>
          <Field label="City" required>
            <input className="input" required value={form.city} onChange={set('city')} />
          </Field>
          <Field label="State" required>
            <input className="input" required value={form.state} onChange={set('state')} />
          </Field>
          <Field label="PIN code">
            <input className="input" value={form.pincode} onChange={set('pincode')} />
          </Field>
          <Field label="Default payment terms (days)" hint="Used on invoices unless overridden">
            <input className="input" type="number" min="0" max="180" value={form.default_payment_terms_days} onChange={set('default_payment_terms_days')} />
          </Field>
        </div>
        {!editing && (
          <>
            <label className="checkbox" style={{ margin: '6px 0 12px' }}>
              <input type="checkbox" checked={withPortal} onChange={(e) => setWithPortal(e.target.checked)} />
              Create a portal login so the hospital can place orders itself
            </label>
            {withPortal && (
              <div className="form-grid">
                <Field label="Portal user name" required>
                  <input className="input" required value={portal.full_name} onChange={(e) => setPortal({ ...portal, full_name: e.target.value })} />
                </Field>
                <Field label="Login email" required>
                  <input className="input" type="email" required value={portal.email} onChange={(e) => setPortal({ ...portal, email: e.target.value })} />
                </Field>
                <Field label="Temporary password" required hint="At least 8 characters">
                  <input className="input" required minLength={8} value={portal.password} onChange={(e) => setPortal({ ...portal, password: e.target.value })} />
                </Field>
              </div>
            )}
          </>
        )}
        <FormError error={error} />
      </form>
    </Modal>
  )
}
