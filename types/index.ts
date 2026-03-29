export interface Profile {
  id: string
  full_name: string | null
  currency: string
  monthly_income_goal: number
  savings_goal_pct: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string | null
  name: string
  type: 'income' | 'expense'
  icon: string
  color: string
  is_system: boolean
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
  is_recurring: boolean
  recurring_day: number | null
  notes: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  category?: Category
}

export interface Debt {
  id: string
  user_id: string
  name: string
  total_amount: number
  current_balance: number
  interest_rate: number
  minimum_payment: number
  due_day: number | null
  status: 'active' | 'paid'
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
  status: 'active' | 'completed' | 'paused'
  created_at: string
  updated_at: string
}

export interface CategoryExpense {
  name: string
  amount: number
  percentage: number
  color: string
  icon: string
}

export interface MonthlyData {
  month: string
  income: number
  expenses: number
  savings: number
}