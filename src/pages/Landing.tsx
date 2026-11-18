import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/AppShell'
import { Icon } from '../components/Icon'
import { BalanceHero, BudgetMeter, UpcomingPanel } from '../components/Summary'
import { firstPaymentDate } from '../lib/cards'
import { formatIn } from '../lib/currency'
import { AppProvider, useApp } from '../state/AppState'
import { useAuth } from '../state/AuthState'

/* ---------------- Utilidades ---------------- */

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Marca el elemento con .is-visible cuando entra en pantalla, para que sus animaciones arranquen ahí. */
function useInView<T extends Element>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, visible] as const
}

function useDemoEntry() {
  const { enterDemo } = useAuth()
  const navigate = useNavigate()
  return () => {
    enterDemo()
    navigate('/app')
  }
}

/* ---------------- Página ---------------- */

export function Landing() {
  const { mode } = useAuth()
  const startDemo = useDemoEntry()

  useEffect(() => {
    document.title = 'Bolsillo — cuánto te queda hasta fin de mes'
  }, [])

  return (
    <div className="landing">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <header className="l-header">
        <div className="l-wrap l-header__inner">
          <Link to="/" className="brand" aria-label="Bolsillo, inicio">
            <BrandMark />
            <span className="brand__name">Bolsillo</span>
          </Link>
          <nav className="l-nav" aria-label="Página de inicio">
            <a href="#funciones">Funciones</a>
            <a href="#como-funciona">Cómo funciona</a>
          </nav>
          <div className="l-header__actions">
            {mode === 'cloud' || mode === 'demo' ? (
              <Link to="/app" className="btn btn--primary btn--small">
                Abrir la app
              </Link>
            ) : (
              <>
                <Link to="/ingresar" className="btn btn--ghost btn--small">
                  Ingresar
                </Link>
                <button type="button" className="btn btn--primary btn--small l-header__demo" onClick={startDemo}>
                  Probar la demo
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="contenido">
        <section className="l-hero" aria-labelledby="l-title">
          <div className="l-wrap l-hero__grid">
            <div className="l-hero__copy">
              <h1 id="l-title" className="l-hero__title">
                ¿Cuánto te queda hasta fin de mes?
              </h1>
              <p className="l-hero__lead">
                Bolsillo suma tus cuotas, tus gastos fijos y lo que ya tenés comprometido para el mes que viene. Pensado para cómo se paga en Argentina: con tarjeta, en cuotas y en dos monedas.
              </p>
              <div className="l-hero__ctas">
                <button type="button" className="btn btn--primary l-btn-lg" onClick={startDemo}>
                  Probar la demo sin registrarte
                </button>
                <Link to="/registrarse" className="btn btn--ghost l-btn-lg">
                  Crear cuenta gratis
                </Link>
              </div>
              <p className="l-hero__note">Gratis, desde el celular o la compu. La demo viene con datos de ejemplo.</p>
            </div>
            <div className="l-hero__visual">
              <AppProvider source="preview">
                <PhoneMockup />
              </AppProvider>
            </div>
          </div>
        </section>

        <section id="funciones" className="l-features" aria-labelledby="f-title">
          <div className="l-wrap">
            <h2 id="f-title" className="l-h2">
              Anotar no alcanza. Bolsillo hace las cuentas.
            </h2>
            <div className="l-feature-list">
              <Feature title="Cuotas que se acomodan solas" illustration={<CuotasIllustration />}>
                Cargás la compra una vez, con la tarjeta y la cantidad de cuotas. Bolsillo reparte cada cuota en el mes en que la pagás, según el cierre de tu tarjeta, y te dice cuánto ya tenés comprometido.
              </Feature>
              <Feature title="Fijos y vencimientos, sin acordarte" illustration={<FijosIllustration />} flip>
                Alquiler, prepaga, servicios, sueldo: los cargás una vez y aparecen solos cada mes. Ves qué vence en los próximos 30 días antes de que te agarre desprevenido.
              </Feature>
              <Feature title="En pesos o en dólares" illustration={<DolarIllustration />}>
                Mirá todo el mes convertido al dólar oficial o al blue con la cotización del día. Si la cotización no carga, la app sigue funcionando en pesos.
              </Feature>
              <Feature title="Lecturas que te avisan a tiempo" illustration={<LecturasIllustration />} flip>
                Frases cortas calculadas con tus datos: qué categoría se disparó, cómo cerrás el mes a este ritmo y cuánto te queda para el presupuesto.
              </Feature>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="l-steps" aria-labelledby="s-title">
          <div className="l-wrap">
            <h2 id="s-title" className="l-h2">
              Cómo funciona
            </h2>
            <ol className="l-steps__list">
              <li>
                <h3>Cargá tu sueldo y tus fijos</h3>
                <p>Una sola vez. Desde ahí se generan solos todos los meses.</p>
              </li>
              <li>
                <h3>Anotá gastos y compras en cuotas</h3>
                <p>En segundos desde el celular, con el botón que siempre está a mano.</p>
              </li>
              <li>
                <h3>Mirá cuánto te queda</h3>
                <p>El balance real del mes y lo que ya está comprometido para el que viene.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="l-cta" aria-labelledby="cta-title">
          <div className="l-wrap l-cta__inner">
            <h2 id="cta-title" className="l-cta__title">
              Ordená este mes en cinco minutos.
            </h2>
            <div className="l-hero__ctas">
              <button type="button" className="btn l-btn-lg l-cta__primary" onClick={startDemo}>
                Probar la demo
              </button>
              <Link to="/registrarse" className="btn l-btn-lg l-cta__secondary">
                Crear cuenta gratis
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="l-footer">
        <div className="l-wrap l-footer__inner">
          <span className="brand">
            <BrandMark size={22} />
            <span className="brand__name">Bolsillo</span>
          </span>
          <span className="muted">Hecho en Argentina. No es asesoramiento financiero.</span>
          <Link to="/ingresar">Ingresar</Link>
        </div>
      </footer>
    </div>
  )
}

/* ---------------- Mockup del celular con los componentes reales ---------------- */

/**
 * Una escena que se repite: aparece una compra en 12 cuotas con tarjeta, y "Lo que viene"
 * se actualiza con lo comprometido para el mes siguiente. Usa los mismos componentes que la app.
 */
function PhoneMockup() {
  const { data, addMovement, deleteMovement, todayDate } = useApp()
  const [toast, setToast] = useState<string | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    if (reducedMotion()) return
    const card = dataRef.current.cards[0]
    const amount = 780_000
    const timers: number[] = []
    const cycle = () => {
      timers.push(
        window.setTimeout(() => {
          setToast(`Smart TV en 12 cuotas de ${formatIn(amount / 12, 'ARS')}`)
          addMovement({ kind: 'gasto', amount, category: 'compras', date: todayDate, description: 'Smart TV', method: 'credito', installments: 12, ...(card ? { cardId: card.id, paymentStart: firstPaymentDate(todayDate, card) } : {}) })
        }, 1600),
        window.setTimeout(() => setToast(null), 4600),
        window.setTimeout(() => {
          const added = dataRef.current.movements.find((m) => m.description === 'Smart TV')
          if (added) deleteMovement(added.id)
        }, 7600),
      )
    }
    cycle()
    const loop = window.setInterval(cycle, 9000)
    return () => {
      window.clearInterval(loop)
      timers.forEach(window.clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="phone" role="img" aria-label="Vista de Bolsillo en un celular: muestra cuánto te queda hasta fin de mes, el presupuesto y lo comprometido para el mes siguiente.">
      <div className="phone__screen" inert>
        <div className="phone__status" aria-hidden="true">
          <span>9:41</span>
          <span className="phone__notch" />
          <span>100%</span>
        </div>
        <div className="phone__content">
          <BalanceHero />
          <BudgetMeter />
          <UpcomingPanel limit={2} />
        </div>
        <div className={`phone__toast${toast ? ' is-on' : ''}`} aria-hidden="true">
          <span className="phone__toast-icon"><Icon name="plus" size={14} /></span>
          {toast ?? ''}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Funciones ---------------- */

function Feature({ title, children, illustration, flip = false }: { title: string; children: ReactNode; illustration: ReactNode; flip?: boolean }) {
  const [ref, visible] = useInView<HTMLDivElement>()
  return (
    <article className={`l-feature${flip ? ' l-feature--flip' : ''}`}>
      <div className="l-feature__text">
        <h3 className="l-feature__title">{title}</h3>
        <p>{children}</p>
      </div>
      <div ref={ref} className={`l-illus${visible ? ' is-visible' : ''}`} aria-hidden="true">
        {illustration}
      </div>
    </article>
  )
}

function CuotasIllustration() {
  return (
    <div className="il-cuotas">
      <div className="il-cuotas__head">
        <span>Heladera</span>
        <span className="num">$ 95.000/mes</span>
      </div>
      <div className="il-cuotas__track">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} style={{ ['--i' as string]: i, ['--on' as string]: i < 6 ? 1 : 0 }} />
        ))}
      </div>
      <div className="il-cuotas__foot">
        <span>Cuota 6/12</span>
        <span>Faltan $ 570.000</span>
      </div>
    </div>
  )
}

function FijosIllustration() {
  const due = [5, 10, 18, 21]
  return (
    <div className="il-cal">
      <div className="il-cal__grid">
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i} className={due.includes(i + 1) ? 'is-due' : i + 1 === 15 ? 'is-today' : ''} style={{ ['--d' as string]: due.indexOf(i + 1) }}>
            {i + 1}
          </span>
        ))}
      </div>
      <div className="il-cal__pill">Luz vence en 3 días</div>
    </div>
  )
}

function DolarIllustration() {
  return (
    <div className="il-dolar">
      <span className="il-dolar__label">Te quedan</span>
      <span className="il-dolar__window">
        <span className="il-dolar__reel">
          <span>$ 239.400</span>
          <span>US$ 147</span>
          <span>$ 239.400</span>
        </span>
      </span>
      <span className="il-dolar__chips">
        <span>Pesos</span>
        <span>US$ blue</span>
      </span>
    </div>
  )
}

function LecturasIllustration() {
  return (
    <div className="il-lect">
      <p className="il-lect__line">
        <span className="il-lect__spark"><Icon name="sparkle" size={18} /></span>
        <span className="il-lect__text">En Salud ya llevás 68% más que tu promedio.</span>
      </p>
      <p className="il-lect__line il-lect__line--2">
        <span className="il-lect__spark"><Icon name="sparkle" size={18} /></span>
        <span className="il-lect__text">A este ritmo cerrás el mes dentro del presupuesto.</span>
      </p>
    </div>
  )
}
