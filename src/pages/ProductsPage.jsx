import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { Card, EmptyState, ErrorState, Field, FormError, Loading, Modal, PageHeader, Pagination, StatusBadge, useSubmit } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { humanize, money, PRODUCT_CATEGORIES } from '../utils/format'

const PAGE_SIZE = 20

function ProductModal({ product, onClose, onDone }) {
  const editing = Boolean(product)
  const manufacturers = useAsync(() => api.get('/manufacturers').then((r) => r.data), [])
  const [form, setForm] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    category: product?.category || 'EQUIPMENT',
    brand: product?.brand || '',
    hsn_code: product?.hsn_code || '',
    description: product?.description || '',
    unit_price: product?.unit_price ?? '',
    gst_rate: product?.gst_rate ?? 12,
    stock_quantity: 0,
    reorder_level: product?.reorder_level ?? 0,
    is_imported: product?.is_imported ?? false,
    lead_time_days: product?.lead_time_days ?? 7,
    manufacturer_id: product?.manufacturer_id ?? '',
  })
  const { busy, error, run } = useSubmit()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = (e) => {
    e.preventDefault()
    const body = {
      ...form,
      brand: form.brand || null,
      hsn_code: form.hsn_code || null,
      description: form.description || null,
      unit_price: Number(form.unit_price),
      gst_rate: Number(form.gst_rate),
      reorder_level: Number(form.reorder_level),
      lead_time_days: Number(form.lead_time_days),
      manufacturer_id: form.manufacturer_id ? Number(form.manufacturer_id) : null,
    }
    if (editing) {
      delete body.sku
      delete body.stock_quantity
    } else {
      body.stock_quantity = Number(form.stock_quantity)
    }
    run(() => (editing ? api.patch(`/products/${product.id}`, body) : api.post('/products', body)))
      .then(onDone)
      .catch(() => {})
  }

  return (
    <Modal
      wide
      title={editing ? `Edit ${product.name}` : 'Add product'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button form="product-form" className="btn btn-primary" disabled={busy}>
            Save
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="SKU" required>
            <input className="input" required disabled={editing} value={form.sku} onChange={set('sku')} />
          </Field>
          <Field label="Name" required>
            <input className="input" required value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={set('category')}>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {humanize(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Manufacturer">
            <select value={form.manufacturer_id} onChange={set('manufacturer_id')}>
              <option value="">—</option>
              {(manufacturers.data || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.country})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unit price (₹, excl. GST)" required>
            <input className="input" type="number" min="1" step="0.01" required value={form.unit_price} onChange={set('unit_price')} />
          </Field>
          <Field label="GST rate (%)">
            <input className="input" type="number" min="0" max="28" step="0.01" value={form.gst_rate} onChange={set('gst_rate')} />
          </Field>
          <Field label="HSN code">
            <input className="input" value={form.hsn_code} onChange={set('hsn_code')} />
          </Field>
          <Field label="Brand">
            <input className="input" value={form.brand} onChange={set('brand')} />
          </Field>
          {!editing && (
            <Field label="Opening stock">
              <input className="input" type="number" min="0" value={form.stock_quantity} onChange={set('stock_quantity')} />
            </Field>
          )}
          <Field label="Reorder level">
            <input className="input" type="number" min="0" value={form.reorder_level} onChange={set('reorder_level')} />
          </Field>
          <Field label="Lead time (days)">
            <input className="input" type="number" min="0" value={form.lead_time_days} onChange={set('lead_time_days')} />
          </Field>
          <Field label="Sourcing">
            <label className="checkbox">
              <input type="checkbox" checked={form.is_imported} onChange={set('is_imported')} />
              Imported / made to order (not stocked)
            </label>
          </Field>
          <div className="span-2">
            <Field label="Description">
              <textarea value={form.description} onChange={set('description')} />
            </Field>
          </div>
        </div>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

function AdjustStockModal({ product, onClose, onDone }) {
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const { busy, error, run } = useSubmit()
  const submit = (e) => {
    e.preventDefault()
    run(() => api.post(`/products/${product.id}/adjust-stock`, { delta: Number(delta), reason }))
      .then(onDone)
      .catch(() => {})
  }
  return (
    <Modal
      title={`Adjust stock · ${product.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button form="adj-form" className="btn btn-primary" disabled={busy}>
            Apply
          </button>
        </>
      }
    >
      <form id="adj-form" onSubmit={submit}>
        <p className="muted" style={{ marginBottom: 12 }}>
          Current stock: <strong>{product.stock_quantity}</strong>
        </p>
        <Field label="Change (+ to add, − to remove)" required>
          <input className="input" type="number" required value={delta} onChange={(e) => setDelta(e.target.value)} />
        </Field>
        <Field label="Reason" required>
          <input className="input" required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Goods received, damaged, stock count…" />
        </Field>
        <FormError error={error} />
      </form>
    </Modal>
  )
}

export default function ProductsPage() {
  const { isManager } = useAuth()
  const toast = useToast()
  const [params] = useSearchParams()
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('')
  const [lowStock, setLowStock] = useState(params.get('low') === '1')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(null)

  const { data, loading, error, reload } = useAsync(
    () =>
      api
        .get('/products', {
          params: { page, page_size: PAGE_SIZE, category: category || undefined, low_stock: lowStock || undefined, search: query || undefined },
        })
        .then((r) => r.data),
    [page, category, lowStock, query],
  )

  const close = () => setModal(null)
  const done = (msg) => () => {
    close()
    toast.success(msg)
    reload()
  }

  return (
    <>
      <PageHeader
        title="Stock & products"
        subtitle="Catalogue, stock levels and imported units"
        actions={
          isManager && (
            <button className="btn btn-primary" onClick={() => setModal({ type: 'product' })}>
              ＋ Add product
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
        <input className="input search" placeholder="Search name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select
          value={category}
          onChange={(e) => {
            setPage(1)
            setCategory(e.target.value)
          }}
        >
          <option value="">All categories</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {humanize(c)}
            </option>
          ))}
        </select>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => {
              setPage(1)
              setLowStock(e.target.checked)
            }}
          />
          Low stock only
        </label>
        <button className="btn">Search</button>
      </form>
      <Card flush>
        <ErrorState error={error} onRetry={reload} />
        {loading && !data ? (
          <Loading />
        ) : data && data.items.length === 0 ? (
          <EmptyState title="No products found" />
        ) : (
          data && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Manufacturer</th>
                    <th className="num">Price (excl. GST)</th>
                    <th className="num">GST</th>
                    <th className="num">Stock</th>
                    <th>Sourcing</th>
                    {isManager && <th />}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="strong">{p.name}</span>
                        <span className="cell-sub mono">{p.sku}</span>
                      </td>
                      <td>{humanize(p.category)}</td>
                      <td>
                        {p.manufacturer ? (
                          <>
                            {p.manufacturer.name}
                            <span className="cell-sub">{p.manufacturer.country}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="num">{money(p.unit_price)}</td>
                      <td className="num">{p.gst_rate}%</td>
                      <td className="num">
                        <span className="strong">{p.stock_quantity}</span>
                        {p.is_low_stock && (
                          <span className="cell-sub">
                            <StatusBadge tone="red">Low · reorder at {p.reorder_level}</StatusBadge>
                          </span>
                        )}
                      </td>
                      <td>
                        {p.is_imported ? <StatusBadge tone="violet">Import · {p.lead_time_days}d</StatusBadge> : <StatusBadge tone="green">Stocked</StatusBadge>}
                      </td>
                      {isManager && (
                        <td className="nowrap">
                          <button className="btn btn-sm" onClick={() => setModal({ type: 'adjust', product: p })}>
                            Adjust stock
                          </button>{' '}
                          <button className="btn btn-sm btn-ghost" onClick={() => setModal({ type: 'product', product: p })}>
                            Edit
                          </button>
                        </td>
                      )}
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
      {modal?.type === 'product' && <ProductModal product={modal.product} onClose={close} onDone={done('Product saved')} />}
      {modal?.type === 'adjust' && <AdjustStockModal product={modal.product} onClose={close} onDone={done('Stock updated')} />}
    </>
  )
}
