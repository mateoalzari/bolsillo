import { RateNotice } from '../components/AppShell'
import { CategoryBreakdown, DaysChart, MonthsChart } from '../components/Charts'

export function ChartsPage() {
  return (
    <div className="page page--narrow">
      <RateNotice />
      <MonthsChart />
      <CategoryBreakdown />
      <DaysChart />
    </div>
  )
}
