import { RateNotice } from '../components/AppShell'
import { CategoryBreakdown, DaysChart, MonthsChart } from '../components/Charts'
import { usePageTitle } from '../hooks/usePageTitle'

export function ChartsPage() {
  usePageTitle('Gráficos')
  return (
    <div className="page page--narrow">
      <RateNotice />
      <MonthsChart />
      <CategoryBreakdown />
      <DaysChart />
    </div>
  )
}
