import { useMemo } from 'react'
import { addMonths } from '../lib/dates'
import { buildInsights } from '../lib/insights'
import { entriesForMonth } from '../lib/ledger'
import { upcomingDue } from '../lib/recurring'
import { balanceOf, budgetState, committedFor, compareWithPreviousMonth, comparisonDay } from '../lib/stats'
import { useApp, useFormat } from './AppState'

/** Todo lo que se calcula para el mes elegido, memorizado para no recalcular en cada render. */
export function useMonthData() {
  const { data, month, currentMonth, todayDate } = useApp()
  const format = useFormat()
  return useMemo(() => {
    const entries = entriesForMonth(data.movements, month)
    const balance = balanceOf(entries)
    const day = comparisonDay(month, todayDate)
    const isCurrent = month === currentMonth
    const isFuture = month > currentMonth
    return {
      entries,
      balance,
      isCurrent,
      isFuture,
      comparison: isFuture ? null : compareWithPreviousMonth(data.movements, month, day),
      budget: budgetState(data.budget, balance.expenses),
      committedNext: committedFor(data.movements, data.recurring, addMonths(month, 1)),
      /** Para meses futuros: lo ya comprometido (cuotas + fijos que se van a generar) */
      committedThis: isFuture ? committedFor(data.movements, data.recurring, month) : null,
      insights: isFuture ? [] : buildInsights({ movements: data.movements, rules: data.recurring, budget: data.budget, month, day, isCurrentMonth: isCurrent, format }),
      upcoming: isCurrent ? upcomingDue(data.recurring, todayDate, 30) : [],
    }
  }, [data, month, currentMonth, todayDate, format])
}
