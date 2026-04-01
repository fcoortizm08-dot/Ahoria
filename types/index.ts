// ============================================================
// FinTrack Pro — Types v2
// ============================================================

export interface Profile {
  id: string
  full_name: string | null
  currency: string
  monthly_income_goal: number
  savings_goal_pct: number
  onboarding_completed: boolean
  health_score_cache: number
  spending_alert_pct: number
  weekly_summary_day: number
  default_payment_method: PaymentMethod
  created_at: string
  updated_at: string
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'bnpl'
export type TransactionType = 'income' | 'expense'
export type DebtType = 'formal' | 'informal' | 'bnpl' | 'credit_card'
export type DebtStatus = 'active' | 'paid'
export type GoalStatus = 'active' | 'completed' | 'paused'
export type InsightType = 'spending_alert' | 'projection' | 'achievement' | 'tip' | 'weekly_summary'

export interface Category {
  id: string
  user_id: string | null
  name: string
  type: TransactionType
  icon: string
  color: string
  is_system: boolean
  monthly_budget: number | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  type: TransactionType
  amount: number
  description: string
  date: string
  is_recurring: boolean
  recurring_day: number | null
  notes: string | null
  payment_method: PaymentMethod
  installments: number
  installment_no: number
  location: string | null
  tags: string[]
  deleted_at: string | null
  created_at: string
  updated_at: string
  // JOIN
  category?: Category
}

export interface Debt {
  id: string
  user_id: string
  name: string
  debt_type: DebtType
  creditor_name: string | null
  total_amount: number
  current_balance: number
  interest_rate: number
  minimum_payment: number
  due_day: number | null
  status: DebtStatus
  notes: string | null
  color: string
  icon: string
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string
  icon: string
  color: string
  status: GoalStatus
  created_at: string
  updated_at: string
}

export interface BudgetLimit {
  id: string
  user_id: string
  category_id: string
  month_year: string // 'YYYY-MM'
  amount: number
  created_at: string
  updated_at: string
  // JOIN
  category?: Category
}

export interface Streak {
  id: string
  user_id: string
  current_streak: number
  longest_streak: number
  last_active_date: string | null
  total_days: number
  created_at: string
  updated_at: string
}

export interface Insight {
  id: string
  user_id: string
  type: InsightType
  title: string
  body: string
  icon: string
  priority: number
  is_read: boolean
  expires_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ── Aggregates ───────────────────────────────────────────────

export interface CategoryExpense {
  name: string
  amount: number
  percentage: number
  color: string
  icon: string
  budget: number | null
  category_id: string
}

export interface MonthlyData {
  month: string
  income: number
  expenses: number
  savings: number
}

export interface HealthScoreData {
  score: number
  label: 'Excelente' | 'Buena' | 'Regular' | 'Crítica'
  color: string
  savingsRate: number
  hasGoals: boolean
  hasActiveDebts: boolean
  balancePositive: boolean
}

export interface MonthProjection {
  projectedExpenses: number
  projectedBalance: number
  daysElapsed: number
  daysTotal: number
  dailyAvg: number
  isOverBudget: boolean
  budgetLimit: number
}

export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  balance: number
  savingsRate: number
  available: number
  healthScore: HealthScoreData
  projection: MonthProjection
  recentTransactions: Transaction[]
  monthlyData: MonthlyData[]
  categoryData: CategoryExpense[]
  streak: Streak | null
  topInsight: Insight | null
}
