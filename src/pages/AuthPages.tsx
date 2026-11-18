import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/AppShell'
import { Icon } from '../components/Icon'
import { cloudEnabled, supabase } from '../lib/supabase'
import { authErrorMessage, useAuth } from '../state/AuthState'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · Bolsillo`
  }, [title])
  return (
    <div className="auth">
      <Link to="/" className="brand auth__brand" aria-label="Bolsillo, ir al inicio">
        <BrandMark />
        <span className="brand__name">Bolsillo</span>
      </Link>
      <main className="auth__card" id="contenido">
        <h1 className="auth__title">{title}</h1>
        {subtitle && <p className="auth__subtitle">{subtitle}</p>}
        {children}
      </main>
      {footer && <div className="auth__footer">{footer}</div>}
    </div>
  )
}

function DemoButton() {
  const { enterDemo } = useAuth()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className="btn btn--ghost btn--block"
      onClick={() => {
        enterDemo()
        navigate('/app')
      }}
    >
      Entrar con la cuenta demo
    </button>
  )
}

function GoogleButton() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <>
      <button
        type="button"
        className="btn btn--ghost btn--block"
        disabled={busy}
        onClick={async () => {
          if (!supabase) return
          setBusy(true)
          setError('')
          const { error: err } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/app` } })
          if (err) {
            setError(authErrorMessage(err))
            setBusy(false)
          }
        }}
      >
        <GoogleMark />
        Continuar con Google
      </button>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
    </svg>
  )
}

function Divider() {
  return (
    <div className="auth__divider" role="separator">
      <span>o</span>
    </div>
  )
}

function CloudUnavailable() {
  return (
    <p className="notice notice--warn" role="status">
      <Icon name="alert" size={18} />
      <span>Las cuentas no están disponibles en este momento. Podés usar la demo, que guarda los datos en este navegador.</span>
    </p>
  )
}

/* ---------------- Ingresar ---------------- */

export function LoginPage() {
  const { mode } = useAuth()
  const navigate = useNavigate()
  const ids = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (mode === 'cloud') return <Navigate to="/app" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) return setError('Ingresá un email válido, por ejemplo nombre@gmail.com')
    if (!password) return setError('Ingresá tu contraseña')
    if (!supabase) return
    setBusy(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (err) return setError(authErrorMessage(err))
    navigate('/app')
  }

  return (
    <AuthLayout
      title="Ingresar"
      subtitle="Tus movimientos, en cualquier dispositivo."
      footer={
        <>
          ¿No tenés cuenta? <Link to="/registrarse">Crear una gratis</Link>
        </>
      }
    >
      {!cloudEnabled && <CloudUnavailable />}
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${ids}-email`}>Email</label>
          <input id={`${ids}-email`} type="email" name="email" autoComplete="email" inputMode="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <div className="field__labelrow">
            <label htmlFor={`${ids}-pass`}>Contraseña</label>
            <Link to="/recuperar" className="field__link">
              ¿La olvidaste?
            </Link>
          </div>
          <input id={`${ids}-pass`} type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy || !cloudEnabled}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
      {cloudEnabled && (
        <>
          <Divider />
          <GoogleButton />
        </>
      )}
      <DemoButton />
    </AuthLayout>
  )
}

/* ---------------- Registrarse ---------------- */

export function SignupPage() {
  const { mode } = useAuth()
  const navigate = useNavigate()
  const ids = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (mode === 'cloud') return <Navigate to="/app" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) return setError('Ingresá un email válido, por ejemplo nombre@gmail.com')
    if (password.length < 8) return setError('La contraseña tiene que tener al menos 8 caracteres')
    if (!supabase) return
    setBusy(true)
    setError('')
    const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${location.origin}/app` } })
    setBusy(false)
    if (err) return setError(authErrorMessage(err))
    if (data.session) navigate('/app')
    else setSentTo(email.trim())
  }

  if (sentTo)
    return (
      <AuthLayout title="Revisá tu email" footer={<Link to="/ingresar">Ir a ingresar</Link>}>
        <div className="auth__sent">
          <Icon name="check" size={28} />
          <p>
            Te mandamos un link a <strong>{sentTo}</strong> para confirmar tu cuenta. Abrilo desde cualquier dispositivo y listo.
          </p>
          <p className="muted">Si no llega en unos minutos, revisá la carpeta de spam.</p>
        </div>
      </AuthLayout>
    )

  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle="Gratis. Tus datos quedan guardados en la nube y solo los ves vos."
      footer={
        <>
          ¿Ya tenés cuenta? <Link to="/ingresar">Ingresar</Link>
        </>
      }
    >
      {!cloudEnabled && <CloudUnavailable />}
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${ids}-email`}>Email</label>
          <input id={`${ids}-email`} type="email" name="email" autoComplete="email" inputMode="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${ids}-pass`}>Contraseña</label>
          <input id={`${ids}-pass`} type="password" name="new-password" autoComplete="new-password" aria-describedby={`${ids}-hint`} value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="field__hint" id={`${ids}-hint`}>
            Al menos 8 caracteres.
          </p>
        </div>
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy || !cloudEnabled}>
          {busy ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
      {cloudEnabled && (
        <>
          <Divider />
          <GoogleButton />
        </>
      )}
      <DemoButton />
    </AuthLayout>
  )
}

/* ---------------- Recuperar contraseña ---------------- */

export function RecoverPage() {
  const ids = useId()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) return setError('Ingresá un email válido, por ejemplo nombre@gmail.com')
    if (!supabase) return
    setBusy(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/nueva-clave` })
    setBusy(false)
    if (err) return setError(authErrorMessage(err))
    setSent(true)
  }

  return (
    <AuthLayout title="Recuperar contraseña" subtitle={sent ? undefined : 'Te mandamos un link para elegir una nueva.'} footer={<Link to="/ingresar">Volver a ingresar</Link>}>
      {sent ? (
        <div className="auth__sent">
          <Icon name="check" size={28} />
          <p>
            Si hay una cuenta con <strong>{email.trim()}</strong>, te llega un link en unos minutos. Revisá también la carpeta de spam.
          </p>
        </div>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor={`${ids}-email`}>Email</label>
            <input id={`${ids}-email`} type="email" name="email" autoComplete="email" inputMode="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && (
            <p className="field__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy || !cloudEnabled}>
            {busy ? 'Enviando…' : 'Enviarme el link'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}

/* ---------------- Nueva contraseña (desde el link del mail) ---------------- */

export function NewPasswordPage() {
  const { mode } = useAuth()
  const navigate = useNavigate()
  const ids = useId()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (mode === 'loading')
    return (
      <AuthLayout title="Nueva contraseña">
        <p className="muted" role="status">
          Verificando el link…
        </p>
      </AuthLayout>
    )

  if (mode !== 'cloud')
    return (
      <AuthLayout title="El link no es válido" footer={<Link to="/ingresar">Volver a ingresar</Link>}>
        <p className="muted">El link venció o ya se usó. Pedí uno nuevo y abrilo apenas te llegue.</p>
        <Link to="/recuperar" className="btn btn--primary btn--block">
          Pedir otro link
        </Link>
      </AuthLayout>
    )

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('La contraseña tiene que tener al menos 8 caracteres')
    if (!supabase) return
    setBusy(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (err) return setError(authErrorMessage(err))
    navigate('/app')
  }

  return (
    <AuthLayout title="Elegí una contraseña nueva">
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${ids}-pass`}>Contraseña nueva</label>
          <input id={`${ids}-pass`} type="password" name="new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          <p className="field__hint">Al menos 8 caracteres.</p>
        </div>
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar y entrar'}
        </button>
      </form>
    </AuthLayout>
  )
}
