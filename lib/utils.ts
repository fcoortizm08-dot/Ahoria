import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { HealthScoreData, MonthProjection, Transaction } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Formato ──────────────────────────────────────────────────

export function formatCurrency(
  amount: number | null | undefined,
  currency = 'CLP'
): string {
  if (amount == null || isNaN(amount)) return '$0'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(
  dateStr: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('es-CL', options ?? {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatRelativeDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Hoy'
  if (diff === -1) return 'Ayer'
  if (diff === 1) return 'Mañana'
  if (diff > -7 && diff < 0) return `Hace ${Math.abs(diff)} días`
  return formatDate(dateStr, { day: '2-digit', month: 'short' })
}

export function formatCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 1_000)}k`
  return String(amount)
}

// ── Tiempo ───────────────────────────────────────────────────

export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getDayOfMonth(): number {
  return new Date().getDate()
}

// ── Cálculos ─────────────────────────────────────────────────

export function calculatePercentage(part: number, total: number): number {
  if (!total || total === 0) return 0
  return Math.round((part / total) * 100)
}

/**
 * Calcula el Health Score (0-100) del usuario para el mes actual
 */
export function calculateHealthScore(params: {
  totalIncome: number
  totalExpenses: number
  hasActiveDebts: boolean
  debtCount: number
  hasGoals: boolean
  streakDays: number
}): HealthScoreData {
  const { totalIncome, totalExpenses, hasActiveDebts, debtCount, hasGoals, streakDays } = params
  let score = 0

  // 1. Tasa de ahorro (40 puntos máximo)
  const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0
  if (savingsRate >= 0.3) score += 40
  else if (savingsRate >= 0.2) score += 32
  else if (savingsRate >= 0.1) score += 20
  else if (savingsRate >= 0) score += 10
  else score += 0 // gastos > ingresos

  // 2. Estado de deudas (20 puntos)
  if (!hasActiveDebts) score += 20
  else if (debtCount === 1) score += 12
  else if (debtCount === 2) score += 6

  // 3. Tiene metas activas (20 puntos)
  if (hasGoals) score += 20

  // 4. Balance positivo (15 puntos)
  if (totalIncome > totalExpenses) score += 15

  // 5. Racha de registro (5 puntos bonus)
  if (streakDays >= 7) score += 5
  else if (streakDays >= 3) score += 3

  score = Math.max(0, Math.min(100, score))

  let label: HealthScoreData['label']
  let color: string
  if (score >= 80) { label = 'Excelente'; color = '#22c55e' }
  else if (score >= 60) { label = 'Buena'; color = '#84cc16' }
  else if (score >= 40) { label = 'Regular'; color = '#f59e0b' }
  else { label = 'Crítica'; color = '#ef4444' }

  return {
    score,
    label,
    color,
    savingsRate,
    hasGoals,
    hasActiveDebts,
    balancePositive: totalIncome >= totalExpenses,
  }
}

/**
 * Calcula la proyección de gastos para fin de mes
 */
export function calculateMonthProjection(params: {
  totalExpenses: number
  totalIncome: number
  year: number
  month: number
}): MonthProjection {
  const { totalExpenses, totalIncome, year, month } = params
  const today = new Date()
  const daysTotal = getDaysInMonth(year, month)

  // Si es mes pasado, ya terminó
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const daysElapsed = isCurrentMonth ? Math.max(1, today.getDate()) : daysTotal

  const dailyAvg = daysElapsed > 0 ? totalExpenses / daysElapsed : 0
  const projectedExpenses = isCurrentMonth ? dailyAvg * daysTotal : totalExpenses
  const projectedBalance = totalIncome - projectedExpenses
  const budgetLimit = totalIncome

  return {
    projectedExpenses,
    projectedBalance,
    daysElapsed,
    daysTotal,
    dailyAvg,
    isOverBudget: projectedExpenses > budgetLimit,
    budgetLimit,
  }
}

/**
 * Genera insights automáticos basados en datos del mes
 */
export function generateAutoInsights(params: {
  totalIncome: number
  totalExpenses: number
  categoryData: Array<{ name: string; amount: number; percentage: number; budget: number | null; icon: string }>
  projection: MonthProjection
  healthScore: HealthScoreData
  streakDays: number
}): Array<{ title: string; body: string; icon: string; type: string }> {
  const { totalIncome, totalExpenses, categoryData, projection, healthScore, streakDays } = params
  const insights: Array<{ title: string; body: string; icon: string; type: string }> = []

  // Insight 1: Proyección negativa
  if (projection.isOverBudget && totalIncome > 0) {
    const excess = _formatCurrency(projection.projectedExpenses - projection.budgetLimit)
    insights.push({
      type: 'projection',
      icon: '⚠️',
      title: 'Atención: podrías pasarte del presupuesto',
      body: `A este ritmo, terminarás el mes con ${excess} más de lo que ingresa. Quedan ${projection.daysTotal - projection.daysElapsed} días.`,
    })
  }

  // Insight 2: Categoría con mayor gasto relativo
  const overBudgetCats = categoryData.filter(c => c.budget && c.amount > c.budget * 0.8)
  if (overBudgetCats.length > 0) {
    const cat = overBudgetCats[0]
    const pct = cat.budget ? Math.round((cat.amount / cat.budget) * 100) : 0
    insights.push({
      type: 'spending_alert',
      icon: cat.icon,
      title: `${cat.name} al ${pct}% del presupuesto`,
      body: `Llevas ${_formatCurrency(cat.amount)} en ${cat.name} este mes. ${pct >= 100 ? '¡Superaste el límite!' : `Te quedan ${_formatCurrency(cat.budget! - cat.amount)}.`}`,
    })
  }

  // Insight 3: Racha
  if (streakDays >= 7) {
    insights.push({
      type: 'achievement',
      icon: '🔥',
      title: `¡${streakDays} días seguidos registrando!`,
      body: 'El hábito de registrar tus finanzas es la base del control financiero. ¡Sigue así!',
    })
  }

  // Insight 4: Salud financiera excelente
  if (healthScore.score >= 80) {
    insights.push({
      type: 'achievement',
      icon: '🏆',
      title: 'Tu salud financiera es excelente',
      body: `Score ${healthScore.score}/100. Tasa de ahorro: ${Math.round(healthScore.savingsRate * 100)}%. ¡Estás en el camino correcto!`,
    })
  }

  // Insight 5: Tip si score es bajo
  if (healthScore.score < 40) {
    insights.push({
      type: 'tip',
      icon: '💡',
      title: 'Tip: revisa tus gastos hormiga',
      body: 'Los pequeños gastos diarios pueden representar el 20-30% de tu presupuesto. Revisa categorías como Delivery y Café.',
    })
  }

  return insights.slice(0, 1) // Solo el más relevante en el dashboard
}

// Helper interno (no exportado para evitar conflicto con el export principal)
function _formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

// ── Textos de apoyo ──────────────────────────────────────────

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: '💵 Efectivo',
  card: '💳 Tarjeta',
  transfer: '🏦 Transferencia',
  bnpl: '📦 Cuotas',
}

export const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
export const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
