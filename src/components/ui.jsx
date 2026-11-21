import { useEffect, useState } from 'react'
import { errorMessage, isNotImplemented, notImplementedInfo } from '../api/client'
import { humanize } from '../utils/format'

const TONES = {
  PENDING: 'amber',
  ACCEPTED: 'blue',
  PROCESSING: 'indigo',
  DISPATCHED: 'violet',
  IN_TRANSIT: 'violet',
  OUT_FOR_DELIVERY: 'violet',
  DELIVERED: 'teal',
  COMPLETED: 'green',
  REJECTED: 'red',
  CANCELLED: 'gray',
  FAILED: 'red',
  UNPAID: 'amber',
  PARTIALLY_PAID: 'orange',
  PAID: 'green',
  OVERDUE: 'red',
  PROFORMA: 'gray',
  TAX: 'blue',
  PENDING_SIGNATURE: 'amber',
  ISSUE_REPORTED: 'red',
  SIGNED: 'green',
  OPEN: 'red',
  ENGINEER_ASSIGNED: 'blue',
  IN_PROGRESS: 'indigo',
  RESOLVED: 'green',
  CLOSED: 'gray',
  PLACED: 'amber',
  CONFIRMED: 'blue',
  SHIPPED: 'violet',
  RECEIVED: 'green',
  QUEUED: 'gray',
  SENT: 'green',
  URGENT: 'red',
  NORMAL: 'gray',
  LOW: 'gray',
  MEDIUM: 'amber',
  HIGH: 'orange',
  CRITICAL: 'red',
  ADMIN: 'violet',
  STAFF: 'blue',
  ENGINEER: 'teal',
  HOSPITAL: 'amber',
}

export function StatusBadge({ value, tone, children }) {
  if (!value && !children) return null
  return <span className={`badge badge-${tone || TONES[value] || 'gray'}`}>{children || humanize(value)}</span>
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="page-header">
      <div>
        {back}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function Card({ title, actions, children, className = '', flush = false }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-header">
          {title && <h2>{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className={flush ? 'card-body flush' : 'card-body'}>{children}</div>
    </section>
  )
}

export function Modal({ title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  )
}

export function Field({ label, hint, children, required }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="req">*</span>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="state">
      <span className="spinner" aria-hidden="true" /> {label}
    </div>
  )
}

export function EmptyState({ title = 'Nothing here yet', children }) {
  return (
    <div className="state empty">
      <strong>{title}</strong>
      {children && <div className="muted">{children}</div>}
    </div>
  )
}

/** Shown wherever the backend answers 501: the UI is ready, the API is not. */
export function NotImplementedNotice({ error, compact = false }) {
  const { feature, message } = notImplementedInfo(error)
  return (
    <div className={`notice notice-pending ${compact ? 'compact' : ''}`}>
      <span className="notice-icon" aria-hidden="true">
        🚧
      </span>
      <div>
        <strong>Coming soon{feature ? ` · ${feature}` : ''}</strong>
        <div>{message}</div>
      </div>
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  if (!error) return null
  if (isNotImplemented(error)) return <NotImplementedNotice error={error} />
  return (
    <div className="notice notice-error">
      <span>{errorMessage(error)}</span>
      {onRetry && (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

export function FormError({ error }) {
  if (!error) return null
  if (isNotImplemented(error)) return <NotImplementedNotice error={error} compact />
  return <div className="notice notice-error compact">{errorMessage(error)}</div>
}

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil((total || 0) / pageSize))
  if (!total) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <div className="pagination">
      <span className="muted">
        Showing {from}–{to} of {total}
      </span>
      <div className="pagination-buttons">
        <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ‹ Prev
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button type="button" className="btn btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next ›
        </button>
      </div>
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={active === t.key}
          className={`tab ${active === t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function DefinitionList({ items }) {
  return (
    <dl className="dl">
      {items
        .filter(Boolean)
        .map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value ?? '—'}</dd>
          </div>
        ))}
    </dl>
  )
}

/** Busy/error bookkeeping for forms and action buttons. */
export function useSubmit() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      setError(e)
      throw e
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run, setError }
}
