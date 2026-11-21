import axios from 'axios'

const TOKEN_KEY = 'fmpms_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* storage unavailable: session will not survive a reload */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let unauthorizedHandler = null
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    if (error.response?.status === 401 && !url.endsWith('/auth/login') && unauthorizedHandler) {
      unauthorizedHandler()
    }
    return Promise.reject(error)
  },
)

/** True when the backend says the endpoint exists but is not built yet (HTTP 501). */
export function isNotImplemented(error) {
  return error?.response?.status === 501
}

export function notImplementedInfo(error) {
  const detail = error?.response?.data?.detail
  return {
    feature: detail?.feature || null,
    message: detail?.message || 'This feature is not available yet.',
  }
}

export function errorMessage(error) {
  if (!error) return ''
  if (!error.response) return 'Cannot reach the server. Is the backend running?'
  const detail = error.response.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = (d.loc || []).filter((p) => p !== 'body').join('.')
        const msg = (d.msg || '').replace(/^Value error, /, '')
        return field ? `${field}: ${msg}` : msg
      })
      .join('; ')
  }
  if (detail?.message) return detail.message
  return `Request failed (${error.response.status})`
}

/**
 * Download a file endpoint. Blob responses hide JSON error bodies, so parse
 * them back into the usual shape before re-throwing.
 */
export async function downloadFile(url, params, fallbackName) {
  try {
    const response = await api.get(url, { params, responseType: 'blob' })
    const disposition = response.headers['content-disposition'] || ''
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
    const name = match ? decodeURIComponent(match[1]) : fallbackName
    const href = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = href
    link.download = name
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
  } catch (error) {
    const data = error.response?.data
    if (data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await data.text())
      } catch {
        /* keep blob */
      }
    }
    throw error
  }
}
