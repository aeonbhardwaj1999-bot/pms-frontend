import { useState } from 'react'
import { errorMessage } from '../api/client'
import { Field } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const DEMO = [
  ['Admin', 'admin@fmmedical.example.com', 'Admin@123'],
  ['Staff', 'staff@fmmedical.example.com', 'Staff@123'],
  ['Engineer', 'engineer@fmmedical.example.com', 'Engineer@123'],
  ['Hospital (Shanti)', 'portal@shanti.example.com', 'Hospital@123'],
  ['Hospital (Sunrise)', 'portal@sunrise.example.com', 'Hospital@123'],
]

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <div>
          <div className="brand" style={{ padding: 0 }}>
            <span className="brand-mark">✚</span>
            <div>
              <strong>FMPMS</strong>
              <small>FM Medical Systems</small>
            </div>
          </div>
          <h1>Hospital orders, from purchase request to signed satisfaction letter.</h1>
          <ul>
            <li>Hospitals place orders for surgical units, equipment and instruments</li>
            <li>Stock check, acceptance and 7–15 / 30–60 day delivery commitments</li>
            <li>Import tracking with manufacturers in Germany, Italy, China and Korea</li>
            <li>Dispatch by courier or hand delivery with email tracking updates</li>
            <li>Satisfaction letters, engineer visits, invoices and payment follow-up</li>
          </ul>
        </div>
        <small style={{ opacity: 0.7 }}>© FM Medical Systems Pvt. Ltd.</small>
      </div>
      <div className="login-panel">
        <form className="login-box" onSubmit={submit}>
          <h2>Sign in</h2>
          <p className="muted" style={{ marginBottom: 20 }}>
            Use your company or hospital portal account.
          </p>
          {error && <div className="notice notice-error compact">{error}</div>}
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Field label="Password">
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="demo-accounts">
            <div className="muted small" style={{ marginBottom: 8 }}>
              Demo accounts (seed data) — click to fill
            </div>
            {DEMO.map(([label, e, p]) => (
              <button
                type="button"
                key={e}
                onClick={() => {
                  setEmail(e)
                  setPassword(p)
                }}
              >
                <span className="strong">{label}</span>
                <span className="muted">{e}</span>
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  )
}
