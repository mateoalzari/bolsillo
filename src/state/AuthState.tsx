import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export type AuthMode = 'loading' | 'anon' | 'demo' | 'cloud'

interface AuthState {
  mode: AuthMode
  user: User | null
  /** true mientras el usuario viene de un link de recuperación y tiene que elegir una contraseña nueva */
  recovering: boolean
  enterDemo: () => void
  exitDemo: () => void
  signOut: () => Promise<void>
}

const DEMO_KEY = 'bolsillo:demo'

function readDemo(): boolean {
  try {
    return localStorage.getItem(DEMO_KEY) === '1'
  } catch {
    return false
  }
}

function writeDemo(on: boolean) {
  try {
    if (on) localStorage.setItem(DEMO_KEY, '1')
    else localStorage.removeItem(DEMO_KEY)
  } catch {
    /* sin almacenamiento */
  }
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)
  const [demo, setDemo] = useState(readDemo)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      setReady(true)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'USER_UPDATED' || event === 'SIGNED_OUT') setRecovering(false)
    })
    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      mode: !ready ? 'loading' : session ? 'cloud' : demo ? 'demo' : 'anon',
      user: session?.user ?? null,
      recovering,
      enterDemo: () => {
        writeDemo(true)
        setDemo(true)
      },
      exitDemo: () => {
        writeDemo(false)
        setDemo(false)
      },
      signOut: async () => {
        writeDemo(false)
        setDemo(false)
        await supabase?.auth.signOut()
      },
    }),
    [ready, session, demo, recovering],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth fuera de AuthProvider')
  return v
}

/** Traduce los errores de Supabase Auth a mensajes claros en español. */
export function authErrorMessage(err: { message?: string; code?: string; status?: number } | null | undefined): string {
  const code = err?.code ?? ''
  const msg = (err?.message ?? '').toLowerCase()
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'El email o la contraseña no coinciden.'
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) return 'Todavía no confirmaste tu email. Revisá tu casilla (y la carpeta de spam).'
  if (code === 'user_already_exists' || msg.includes('already registered')) return 'Ya existe una cuenta con ese email. Probá ingresar o recuperar la contraseña.'
  if (code === 'weak_password' || msg.includes('password should be')) return 'La contraseña es muy débil: usá al menos 8 caracteres, con letras y números.'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || err?.status === 429) return 'Hiciste muchos intentos seguidos. Esperá unos minutos y volvé a probar.'
  if (code === 'validation_failed' || msg.includes('invalid email')) return 'Revisá el email: no parece válido.'
  if (msg.includes('provider is not enabled') || code === 'provider_disabled') return 'El ingreso con Google todavía no está activado. Por ahora usá email y contraseña.'
  if (code === 'same_password') return 'La contraseña nueva tiene que ser distinta de la anterior.'
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'No hay conexión. Revisá internet y probá de nuevo.'
  return 'Algo salió mal. Probá de nuevo en un momento.'
}
