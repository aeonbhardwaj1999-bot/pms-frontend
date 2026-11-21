const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

export function money(value) {
  if (value === null || value === undefined || value === '') return '—'
  return inrFormatter.format(Number(value))
}

/** ₹1.25 Cr / ₹4.50 L style amounts for tiles and big numbers. */
export function compactMoney(value) {
  const n = Number(value || 0)
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return money(n)
}

function toDate(value) {
  if (!value) return null
  // Plain dates ("2026-10-15") are calendar days, not instants.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(value)
}

export function formatDate(value) {
  const d = toDate(value)
  return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

export function formatDateTime(value) {
  const d = toDate(value)
  return d
    ? d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'
}

export function daysFromToday(value) {
  const d = toDate(value)
  if (!d) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((d - today) / 86400000)
}

export function todayISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function humanize(value) {
  if (!value) return ''
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export const ORDER_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'PROCESSING',
  'DISPATCHED',
  'DELIVERED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
]
export const INVOICE_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']
export const SHIPMENT_STATUSES = ['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED']
export const ISSUE_STATUSES = ['OPEN', 'ENGINEER_ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
export const ISSUE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
export const REPORTED_VIA = ['PORTAL', 'EMAIL', 'PHONE', 'OFFICE_VISIT']
export const PAYMENT_METHODS = ['NEFT', 'RTGS', 'IMPS', 'UPI', 'CHEQUE', 'DD', 'CASH']
export const PRODUCT_CATEGORIES = ['SURGICAL_UNIT', 'EQUIPMENT', 'INSTRUMENT', 'CONSUMABLE']
export const HOSPITAL_TYPES = ['HOSPITAL', 'PRIVATE_INSTITUTION', 'CLINIC', 'DIAGNOSTIC_CENTER']
export const PO_STATUSES = ['PLACED', 'CONFIRMED', 'SHIPPED', 'RECEIVED', 'CANCELLED']
export const SATISFACTION_STATUSES = ['PENDING_SIGNATURE', 'ISSUE_REPORTED', 'SIGNED']
export const NOTIFICATION_CATEGORIES = [
  'ORDER_PLACED',
  'ORDER_ACCEPTED',
  'ORDER_REJECTED',
  'ORDER_PROCESSING',
  'ORDER_CANCELLED',
  'ORDER_COMPLETED',
  'IMPORT_UPDATE',
  'SHIPMENT_UPDATE',
  'SATISFACTION_REQUEST',
  'SATISFACTION_SIGNED',
  'ISSUE_UPDATE',
  'INVOICE_ISSUED',
  'PAYMENT_DUE',
  'PAYMENT_REMINDER',
  'PAYMENT_RECEIVED',
]
