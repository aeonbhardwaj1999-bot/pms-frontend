import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import {
  humanize,
  ISSUE_PRIORITIES,
  money,
  PAYMENT_METHODS,
  REPORTED_VIA,
  SHIPMENT_STATUSES,
  todayISO,
} from '../utils/format'
import { ErrorState, Field, FormError, Loading, Modal, StatusBadge, useSubmit } from './ui'

function Footer({ onClose, busy, label, danger, form }) {
  return (
    <>
      <button type="button" className="btn" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" form={form} className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy}>
        {busy ? 'Saving…' : label}
      </button>
    </>
  )
}

/** Generic "give a reason" dialog used for reject / cancel. */
export function ReasonModal({ title, label = 'Reason', confirmLabel, danger, onSubmit, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const { busy, error, run } = useSubmit()
  const submit = (e) => {
    e.preventDefault()
    run(() => onSubmit(reason))
      .then(onDone)
      .catch(() => {})
  }
  return (
    <Modal title={title} onClose={onClose} footer={<Footer form="reason-form" onClose={onClose} busy={busy} label={confirmLabel} danger={danger} />}>
      <form id="reason-form" onSubmit={submit}>
        <Field label={label} required>
          <textarea required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

export function AcceptOrderModal({ order, onClose, onDone }) {
  const check = useAsync(() => api.get(`/orders/${order.id}/stock-check`).then((r) => r.data), [order.id])
  const [minDays, setMinDays] = useState(7)
  const [maxDays, setMaxDays] = useState(15)
  const [note, setNote] = useState('')
  const { busy, error, run } = useSubmit()

  useEffect(() => {
    if (check.data) {
      setMinDays(check.data.suggested_min_days)
      setMaxDays(check.data.suggested_max_days)
    }
  }, [check.data])

  const submit = (e) => {
    e.preventDefault()
    run(() =>
      api.post(`/orders/${order.id}/accept`, {
        delivery_window_min_days: Number(minDays),
        delivery_window_max_days: Number(maxDays),
        note: note || null,
      }),
    )
      .then(onDone)
      .catch(() => {})
  }

  const preset = (a, b) => {
    setMinDays(a)
    setMaxDays(b)
  }

  return (
    <Modal wide title={`Accept ${order.order_number}`} onClose={onClose} footer={<Footer form="accept-form" onClose={onClose} busy={busy} label="Accept order" />}>
      <h3 style={{ fontSize: 14, marginBottom: 8 }}>Stock check</h3>
      {check.loading ? (
        <Loading />
      ) : check.error ? (
        <ErrorState error={check.error} />
      ) : (
        <>
          <div className={`notice ${check.data.all_available ? 'notice-info' : 'notice-pending'} compact`}>
            {check.data.all_available
              ? 'All items are available in stock. They will be reserved for this order on acceptance.'
              : 'Some items are not in stock. Available units are reserved now; raise an import / purchase order for the shortfall after accepting.'}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Required</th>
                  <th className="num">In stock</th>
                  <th className="num">Shortfall</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {check.data.lines.map((l) => (
                  <tr key={l.order_item_id}>
                    <td>
                      {l.name}
                      <span className="cell-sub mono">{l.sku}</span>
                    </td>
                    <td className="num">{l.required}</td>
                    <td className="num">{l.available}</td>
                    <td className={`num ${l.shortfall ? 'danger-text strong' : ''}`}>{l.shortfall}</td>
                    <td>
                      {l.is_imported ? <StatusBadge tone="violet">Import · {l.lead_time_days}d</StatusBadge> : <StatusBadge tone="green">Local stock</StatusBadge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <form id="accept-form" onSubmit={submit} style={{ marginTop: 18 }}>
        <Field label="Delivery commitment to hospital">
          <div className="row">
            <div className="segmented">
              <button type="button" className={minDays == 7 && maxDays == 15 ? 'active' : ''} onClick={() => preset(7, 15)}>
                7–15 days (in stock)
              </button>
              <button type="button" className={minDays == 30 && maxDays == 60 ? 'active' : ''} onClick={() => preset(30, 60)}>
                30–60 days (import)
              </button>
            </div>
            <input className="input" style={{ width: 80 }} type="number" min="1" value={minDays} onChange={(e) => setMinDays(e.target.value)} aria-label="Minimum days" />
            <span>to</span>
            <input className="input" style={{ width: 80 }} type="number" min="1" value={maxDays} onChange={(e) => setMaxDays(e.target.value)} aria-label="Maximum days" />
            <span className="muted">days</span>
          </div>
        </Field>
        <Field label="Note to hospital (optional)">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

export function DispatchModal({ order, onClose, onDone }) {
  const [form, setForm] = useState({
    method: 'COURIER',
    courier_name: '',
    tracking_number: '',
    delivery_person: '',
    delivery_person_phone: '',
    dispatch_location: '',
    notes: '',
  })
  const { busy, error, run } = useSubmit()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const courier = form.method === 'COURIER'

  const submit = (e) => {
    e.preventDefault()
    const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]))
    run(() => api.post(`/orders/${order.id}/dispatch`, body))
      .then(onDone)
      .catch(() => {})
  }

  return (
    <Modal title={`Dispatch ${order.order_number}`} onClose={onClose} footer={<Footer form="dispatch-form" onClose={onClose} busy={busy} label="Dispatch & notify hospital" />}>
      <form id="dispatch-form" onSubmit={submit}>
        <Field label="Delivery method">
          <div className="segmented">
            <button type="button" className={courier ? 'active' : ''} onClick={() => setForm({ ...form, method: 'COURIER' })}>
              Courier
            </button>
            <button type="button" className={!courier ? 'active' : ''} onClick={() => setForm({ ...form, method: 'OFFICE_DELIVERY' })}>
              Office delivery (hand)
            </button>
          </div>
        </Field>
        <div className="form-grid">
          {courier ? (
            <>
              <Field label="Courier company" required>
                <input className="input" required value={form.courier_name} onChange={set('courier_name')} placeholder="Blue Dart, DTDC, Delhivery…" />
              </Field>
              <Field label="Tracking ID" required>
                <input className="input" required value={form.tracking_number} onChange={set('tracking_number')} />
              </Field>
            </>
          ) : (
            <>
              <Field label="Delivered by" required>
                <input className="input" required value={form.delivery_person} onChange={set('delivery_person')} placeholder="Office boy / staff name" />
              </Field>
              <Field label="Phone">
                <input className="input" value={form.delivery_person_phone} onChange={set('delivery_person_phone')} />
              </Field>
            </>
          )}
          <Field label="Dispatched from">
            <input className="input" value={form.dispatch_location} onChange={set('dispatch_location')} placeholder="FM Medical warehouse, New Delhi" />
          </Field>
          {!courier && (
            <Field label="Reference" hint="Auto-generated for hand delivery">
              <input className="input" value={form.tracking_number} onChange={set('tracking_number')} placeholder="Auto" />
            </Field>
          )}
          <Field label="Notes">
            <input className="input" value={form.notes} onChange={set('notes')} />
          </Field>
        </div>
        <p className="muted small">The hospital receives an email with the tracking details.</p>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

export function TrackingEventModal({ shipment, onClose, onDone }) {
  const options = SHIPMENT_STATUSES.filter((s) => s !== 'DISPATCHED')
  const [status, setStatus] = useState(shipment.status === 'DISPATCHED' ? 'IN_TRANSIT' : 'OUT_FOR_DELIVERY')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const { busy, error, run } = useSubmit()
  const submit = (e) => {
    e.preventDefault()
    run(() => api.post(`/shipments/${shipment.id}/events`, { status, location: location || null, note: note || null }))
      .then(onDone)
      .catch(() => {})
  }
  return (
    <Modal title={`Tracking update · ${shipment.tracking_number}`} onClose={onClose} footer={<Footer form="track-form" onClose={onClose} busy={busy} label="Save & email hospital" />}>
      <form id="track-form" onSubmit={submit}>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {options.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location">
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Hub / city" />
        </Field>
        <Field label="Note">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {status === 'DELIVERED' && (
          <div className="notice notice-info compact">
            Marking delivered sends the satisfaction letter and payment-due reminder to the hospital.
          </div>
        )}
        <FormError error={error} />
      </form>
    </Modal>
  )
}

export function InvoiceModal({ order, onClose, onDone }) {
  const hasProforma = order.invoices.some((i) => i.type === 'PROFORMA' && i.status !== 'CANCELLED')
  const [type, setType] = useState(hasProforma ? 'TAX' : 'PROFORMA')
  const [terms, setTerms] = useState('')
  const [issueDate, setIssueDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const { busy, error, run } = useSubmit()
  const submit = (e) => {
    e.preventDefault()
    run(() =>
      api.post('/invoices', {
        order_id: order.id,
        type,
        payment_terms_days: terms === '' ? null : Number(terms),
        issue_date: issueDate || null,
        notes: notes || null,
      }),
    )
      .then(({ data }) => onDone(data))
      .catch(() => {})
  }
  return (
    <Modal title={`Raise invoice · ${order.order_number}`} onClose={onClose} footer={<Footer form="inv-form" onClose={onClose} busy={busy} label="Create & email invoice" />}>
      <form id="inv-form" onSubmit={submit}>
        <Field label="Invoice type">
          <div className="segmented">
            {['PROFORMA', 'TAX'].map((t) => (
              <button type="button" key={t} className={type === t ? 'active' : ''} onClick={() => setType(t)}>
                {t === 'TAX' ? 'Tax invoice' : 'Proforma invoice'}
              </button>
            ))}
          </div>
        </Field>
        <div className="form-grid">
          <Field label="Payment terms (days)" hint="Leave blank to use the hospital's default terms">
            <input className="input" type="number" min="0" max="180" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Hospital default" />
          </Field>
          <Field label="Invoice date">
            <input className="input" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
        </div>
        <div className="row" style={{ marginBottom: 12 }}>
          <span className="muted small">Quick terms:</span>
          {[7, 15, 30].map((d) => (
            <button type="button" key={d} className="btn btn-sm" onClick={() => setTerms(String(d))}>
              {d} days
            </button>
          ))}
        </div>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

export function PurchaseOrderModal({ order, onClose, onDone }) {
  const manufacturers = useAsync(() => api.get('/manufacturers').then((r) => r.data), [])
  const products = useAsync(() => api.get('/products/options').then((r) => r.data), [])
  const stock = useAsync(
    () => (order ? api.get(`/orders/${order.id}/stock-check`).then((r) => r.data) : Promise.resolve(null)),
    [order?.id],
  )
  const [manufacturerId, setManufacturerId] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [arrival, setArrival] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([{ product_id: '', quantity: 1, unit_cost: '' }])
  const { busy, error, run } = useSubmit()

  const productById = useMemo(() => Object.fromEntries((products.data || []).map((p) => [p.id, p])), [products.data])

  // Pre-fill the shortfall of the customer order.
  useEffect(() => {
    if (!stock.data || !products.data) return
    const short = stock.data.lines.filter((l) => l.shortfall > 0)
    if (!short.length) return
    setLines(short.map((l) => ({ product_id: String(l.product_id), quantity: l.shortfall, unit_cost: '' })))
    const maker = productById[short[0].product_id]?.manufacturer_id
    if (maker) setManufacturerId(String(maker))
  }, [stock.data, products.data, productById])

  const setLine = (i, changes) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...changes } : l)))
  const submit = (e) => {
    e.preventDefault()
    run(() =>
      api.post('/purchase-orders', {
        manufacturer_id: Number(manufacturerId),
        order_id: order ? order.id : null,
        currency,
        expected_arrival_date: arrival || null,
        notes: notes || null,
        items: lines.map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity), unit_cost: Number(l.unit_cost || 0) })),
      }),
    )
      .then(({ data }) => onDone(data))
      .catch(() => {})
  }

  if (manufacturers.loading || products.loading) {
    return (
      <Modal title="New purchase order" onClose={onClose}>
        <Loading />
      </Modal>
    )
  }

  return (
    <Modal
      wide
      title={order ? `Import / purchase order for ${order.order_number}` : 'New purchase order'}
      onClose={onClose}
      footer={<Footer form="po-form" onClose={onClose} busy={busy} label="Place purchase order" />}
    >
      <form id="po-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Manufacturer" required>
            <select required value={manufacturerId} onChange={(e) => setManufacturerId(e.target.value)}>
              <option value="">Select…</option>
              {(manufacturers.data || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.country})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Expected arrival at warehouse">
            <input className="input" type="date" value={arrival} onChange={(e) => setArrival(e.target.value)} />
          </Field>
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {['INR', 'EUR', 'USD', 'CNY', 'KRW'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Incoterms, port, etc." />
          </Field>
        </div>
        <div className="table-wrap line-items">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style={{ width: 100 }}>Qty</th>
                <th style={{ width: 160 }}>Unit cost ({currency})</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <select required value={l.product_id} onChange={(e) => setLine(i, { product_id: e.target.value })}>
                      <option value="">Select…</option>
                      {(products.data || []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input className="input" type="number" min="1" required value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                  </td>
                  <td>
                    <input className="input" type="number" min="0" step="0.01" value={l.unit_cost} onChange={(e) => setLine(i, { unit_cost: e.target.value })} />
                  </td>
                  <td>
                    {lines.length > 1 && (
                      <button type="button" className="icon-btn" onClick={() => setLines(lines.filter((_, idx) => idx !== i))}>
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="btn btn-sm" style={{ margin: '10px 0' }} onClick={() => setLines([...lines, { product_id: '', quantity: 1, unit_cost: '' }])}>
          ＋ Add line
        </button>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

export function SignReportModal({ report, onClose, onDone }) {
  const [form, setForm] = useState({ signed_by_name: '', signed_by_designation: '', remarks: '' })
  const { busy, error, run } = useSubmit()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    run(() =>
      api.post(`/satisfaction-reports/${report.id}/sign`, {
        signed_by_name: form.signed_by_name,
        signed_by_designation: form.signed_by_designation || null,
        remarks: form.remarks || null,
      }),
    )
      .then(onDone)
      .catch(() => {})
  }
  return (
    <Modal title="Record signed satisfaction letter" onClose={onClose} footer={<Footer form="sign-form" onClose={onClose} busy={busy} label="Mark as signed" />}>
      <form id="sign-form" onSubmit={submit}>
        <p className="muted" style={{ marginBottom: 12 }}>
          Record who signed and stamped the satisfaction letter at the hospital.
        </p>
        <div className="form-grid">
          <Field label="Signed by" required>
            <input className="input" required value={form.signed_by_name} onChange={set('signed_by_name')} />
          </Field>
          <Field label="Designation">
            <input className="input" value={form.signed_by_designation} onChange={set('signed_by_designation')} placeholder="Medical Superintendent" />
          </Field>
        </div>
        <Field label="Remarks">
          <textarea value={form.remarks} onChange={set('remarks')} />
        </Field>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

/** Report a product problem — through the satisfaction letter if unsigned, else as a fresh issue. */
export function ReportIssueModal({ order, report, onClose, onDone }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', reported_via: 'PORTAL', product_id: '' })
  const { busy, error, run } = useSubmit()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const items = order?.items || []
  const submit = (e) => {
    e.preventDefault()
    const body = { ...form, product_id: form.product_id ? Number(form.product_id) : null }
    const viaReport = report && report.status !== 'SIGNED'
    run(() =>
      viaReport
        ? api.post(`/satisfaction-reports/${report.id}/report-issue`, body)
        : api.post('/issues', { ...body, order_id: order.id }),
    )
      .then(({ data }) => onDone(data))
      .catch(() => {})
  }
  return (
    <Modal title="Report a problem with the products" onClose={onClose} footer={<Footer form="issue-form" onClose={onClose} busy={busy} label="Submit issue" />}>
      <form id="issue-form" onSubmit={submit}>
        {items.length > 0 && (
          <Field label="Product">
            <select value={form.product_id} onChange={set('product_id')}>
              <option value="">Whole order / not specific</option>
              {items.map((i) => (
                <option key={i.id} value={i.product.id}>
                  {i.product.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Title" required>
          <input className="input" required minLength={3} value={form.title} onChange={set('title')} placeholder="e.g. Monitor display flickers" />
        </Field>
        <Field label="Description" required>
          <textarea required minLength={3} value={form.description} onChange={set('description')} />
        </Field>
        <div className="form-grid">
          <Field label="Priority">
            <select value={form.priority} onChange={set('priority')}>
              {ISSUE_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {humanize(p)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reported via">
            <select value={form.reported_via} onChange={set('reported_via')}>
              {REPORTED_VIA.map((p) => (
                <option key={p} value={p}>
                  {humanize(p)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

export function UploadSignedCopyModal({ report, onClose, onDone }) {
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const { busy, error, run } = useSubmit()
  const submit = (e) => {
    e.preventDefault()
    const data = new FormData()
    data.append('file', file)
    data.append('signed_by_name', name)
    if (designation) data.append('signed_by_designation', designation)
    run(() => api.post(`/satisfaction-reports/${report.id}/signed-copy`, data))
      .then(onDone)
      .catch(() => {})
  }
  return (
    <Modal title="Upload signed & stamped letter" onClose={onClose} footer={<Footer form="upload-form" onClose={onClose} busy={busy} label="Upload" />}>
      <form id="upload-form" onSubmit={submit}>
        <Field label="Scanned letter" required hint="PDF, JPG or PNG up to 5 MB">
          <input className="input" type="file" required accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0] || null)} />
        </Field>
        <div className="form-grid">
          <Field label="Signed by" required>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Designation">
            <input className="input" value={designation} onChange={(e) => setDesignation(e.target.value)} />
          </Field>
        </div>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

export function RecordPaymentModal({ invoice, onClose, onDone }) {
  const [form, setForm] = useState({
    amount: invoice.balance_due,
    method: 'NEFT',
    payment_date: todayISO(),
    reference_number: '',
    notes: '',
  })
  const { busy, error, run } = useSubmit()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    run(() =>
      api.post('/payments', {
        invoice_id: invoice.id,
        amount: Number(form.amount),
        method: form.method,
        payment_date: form.payment_date || null,
        reference_number: form.reference_number || null,
        notes: form.notes || null,
      }),
    )
      .then(onDone)
      .catch(() => {})
  }
  return (
    <Modal title={`Record payment · ${invoice.invoice_number}`} onClose={onClose} footer={<Footer form="pay-form" onClose={onClose} busy={busy} label="Record payment" />}>
      <form id="pay-form" onSubmit={submit}>
        <div className="notice notice-info compact">
          Balance due: <strong>{money(invoice.balance_due)}</strong> of {money(invoice.grand_total)}
        </div>
        <div className="form-grid">
          <Field label="Amount (₹)" required>
            <input className="input" type="number" min="0.01" step="0.01" required value={form.amount} onChange={set('amount')} />
          </Field>
          <Field label="Method">
            <select value={form.method} onChange={set('method')}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment date">
            <input className="input" type="date" value={form.payment_date} onChange={set('payment_date')} />
          </Field>
          <Field label="UTR / cheque / reference no.">
            <input className="input" value={form.reference_number} onChange={set('reference_number')} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={form.notes} onChange={set('notes')} />
        </Field>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

export function AssignEngineerModal({ issue, onClose, onDone }) {
  const engineers = useAsync(() => api.get('/users', { params: { role: 'ENGINEER' } }).then((r) => r.data), [])
  const [engineerId, setEngineerId] = useState(issue.assigned_engineer?.id ? String(issue.assigned_engineer.id) : '')
  const [visitDate, setVisitDate] = useState(issue.visit_date || todayISO())
  const [note, setNote] = useState('')
  const { busy, error, run } = useSubmit()
  const submit = (e) => {
    e.preventDefault()
    run(() => api.post(`/issues/${issue.id}/assign`, { engineer_id: Number(engineerId), visit_date: visitDate, note: note || null }))
      .then(({ data }) => onDone(data))
      .catch(() => {})
  }
  return (
    <Modal title={`Assign engineer · ${issue.issue_number}`} onClose={onClose} footer={<Footer form="assign-form" onClose={onClose} busy={busy} label="Assign & inform hospital" />}>
      <form id="assign-form" onSubmit={submit}>
        <Field label="Engineer" required>
          <select required value={engineerId} onChange={(e) => setEngineerId(e.target.value)}>
            <option value="">Select engineer…</option>
            {(engineers.data || [])
              .filter((u) => u.is_active)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Visit date" required>
          <input className="input" type="date" required value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
        </Field>
        <Field label="Note to hospital">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

const NEXT_ISSUE_STATUS = {
  OPEN: ['IN_PROGRESS', 'CLOSED'],
  ENGINEER_ASSIGNED: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
}

export function IssueStatusModal({ issue, onClose, onDone }) {
  const options = NEXT_ISSUE_STATUS[issue.status] || []
  const [status, setStatus] = useState(options[0] || '')
  const [notes, setNotes] = useState(issue.resolution_notes || '')
  const { busy, error, run } = useSubmit()
  const submit = (e) => {
    e.preventDefault()
    run(() => api.post(`/issues/${issue.id}/status`, { status, resolution_notes: notes || null }))
      .then(({ data }) => onDone(data))
      .catch(() => {})
  }
  return (
    <Modal title={`Update ${issue.issue_number}`} onClose={onClose} footer={<Footer form="istatus-form" onClose={onClose} busy={busy} label="Update status" />}>
      <form id="istatus-form" onSubmit={submit}>
        <Field label="New status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {options.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Resolution / visit notes" required={status === 'RESOLVED'}>
          <textarea required={status === 'RESOLVED'} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

