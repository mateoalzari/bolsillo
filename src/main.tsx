import { lazy, StrictMode, Suspense, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import '@fontsource-variable/bricolage-grotesque/wght.css'
import '@fontsource-variable/inter/wght.css'
import './styles/tokens.css'
import './styles/app.css'
import './styles/landing.css'
import { Landing } from './pages/Landing'
import { AppProvider } from './state/AppState'
import { AuthProvider, useAuth } from './state/AuthState'

// La portada carga primero; la app y las pantallas de cuenta se descargan cuando se usan
const AppShell = lazy(() => import('./components/AppShell').then((m) => ({ default: m.AppShell })))
const MonthPage = lazy(() => import('./pages/MonthPage').then((m) => ({ default: m.MonthPage })))
const ChartsPage = lazy(() => import('./pages/ChartsPage').then((m) => ({ default: m.ChartsPage })))
const FixedPage = lazy(() => import('./pages/FixedPage').then((m) => ({ default: m.FixedPage })))
const LoginPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.SignupPage })))
const RecoverPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.RecoverPage })))
const NewPasswordPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.NewPasswordPage })))

function PageLoading() {
  return (
    <div className="loading loading--page" role="status">
      <span className="loading__bar" aria-hidden="true" />
      Abriendo Bolsillo…
    </div>
  )
}

/** La app necesita una sesión o el modo demo; si no, manda a ingresar. */
function ProtectedApp({ children }: { children: ReactNode }) {
  const { mode, user } = useAuth()
  const location = useLocation()
  if (mode === 'loading') return <PageLoading />
  if (mode === 'anon') return <Navigate to="/ingresar" replace state={{ from: location.pathname }} />
  // key: al cambiar de usuario o de demo a cuenta, el estado arranca de cero
  return mode === 'cloud' && user ? (
    <AppProvider key={user.id} source="cloud" userId={user.id}>
      {children}
    </AppProvider>
  ) : (
    <AppProvider key="demo" source="demo">
      {children}
    </AppProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route index element={<Landing />} />
          <Route path="ingresar" element={<LoginPage />} />
          <Route path="registrarse" element={<SignupPage />} />
          <Route path="recuperar" element={<RecoverPage />} />
          <Route path="nueva-clave" element={<NewPasswordPage />} />
          <Route
            path="app"
            element={
              <ProtectedApp>
                <AppShell />
              </ProtectedApp>
            }
          >
            <Route index element={<MonthPage />} />
            <Route path="graficos" element={<ChartsPage />} />
            <Route path="fijos" element={<FixedPage />} />
          </Route>
          {/* Rutas de la Fase 1 */}
          <Route path="graficos" element={<Navigate to="/app/graficos" replace />} />
          <Route path="fijos" element={<Navigate to="/app/fijos" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
