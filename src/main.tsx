import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import '@fontsource-variable/bricolage-grotesque/wght.css'
import '@fontsource-variable/inter/wght.css'
import './styles/tokens.css'
import './styles/app.css'
import { AppShell } from './components/AppShell'
import { ChartsPage } from './pages/ChartsPage'
import { FixedPage } from './pages/FixedPage'
import { MonthPage } from './pages/MonthPage'
import { AppProvider } from './state/AppState'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<MonthPage />} />
            <Route path="graficos" element={<ChartsPage />} />
            <Route path="fijos" element={<FixedPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  </StrictMode>,
)
