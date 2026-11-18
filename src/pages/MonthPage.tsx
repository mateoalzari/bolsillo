import { RateNotice } from '../components/AppShell'
import { CategoryBreakdown, MonthsChart } from '../components/Charts'
import { MovementList } from '../components/MovementList'
import { BalanceHero, BudgetMeter, InsightsList, UpcomingPanel } from '../components/Summary'

/**
 * Celular: todo en una columna, del resumen a la lista.
 * Escritorio: la lista a la izquierda y el resumen con gráficos al costado.
 */
export function MonthPage() {
  return (
    <div className="month-layout">
      <div className="month-layout__summary">
        <RateNotice />
        <BalanceHero />
        <BudgetMeter />
        <InsightsList />
        <UpcomingPanel />
      </div>
      <div className="month-layout__list">
        <MovementList />
      </div>
      <aside className="month-layout__charts" aria-label="Gráficos del mes">
        <MonthsChart />
        <CategoryBreakdown />
      </aside>
    </div>
  )
}
