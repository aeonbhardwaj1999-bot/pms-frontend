import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)
let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (kind, text, timeout = 4500) => {
      const id = nextId++
      setToasts((list) => [...list, { id, kind, text }])
      if (timeout) setTimeout(() => dismiss(id), timeout)
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      success: (text) => push('success', text),
      error: (text) => push('error', text, 7000),
      info: (text) => push('info', text),
      warn: (text) => push('warn', text, 7000),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} onClick={() => dismiss(t.id)}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
