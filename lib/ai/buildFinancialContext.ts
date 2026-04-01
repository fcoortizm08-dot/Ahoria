import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'

export interface FinancialContext {
  userName: string
  currency: string
  currentMonth: {
    label: string
    totalIncome: number
    totalExpenses: number
    balance: number
    savingsRate: number
    daysElapsed: number
    daysTotal: number
  }
  topCategories: Array<{ name: string; icon: string; amount: number; pct: number }>
  last3Months: Array<{ month: string; income: number; expenses: number; savings: number }>
  debts: Array<{ name: string; balance: number; interest: number; minPayment: number }>
  goals: Array<{ name: string; icon: string; target: number; current: number; pct: number; daysLeft: number }>
  streak: number
  totalDebt: number
  netWorthEstimate: number
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export async function buildFinancialContext(userId: string): Promise<FinancialContext> {
  const supabase = await createClient()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthStart = new Date(year, month, 1).toISOString().split('T')[0]
  const monthEnd   = new Date(year, month + 1, 0).toISOString().split('T')[0]
  const threeMonthsAgo = new Date(year, month - 2, 1).toISOString().split('T')[0]
  const daysTotal   = new Date(year, month + 1, 0).getDate()
  const daysElapsed = now.getDate()

  const [
    { data: profile },
    { data: allTxs },
    { data: debts },
    { data: goals },
    { data: streak },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, currency').eq('id', userId).single(),
    supabase.from('transactions')
      .select('type, amount, date, category:categories(name, icon, color)')
      .eq('user_id', userId).is('deleted_at', null)
      .gte('date', threeMonthsAgo).lte('date', monthEnd),
    supabase.from('debts')
      .select('name, current_balance, interest_rate, minimum_payment')
      .eq('user_id', userId).eq('status', 'active'),
    supabase.from('goals')
      .select('name, icon, target_amount, current_amount, target_date')
      .eq('user_id', userId).eq('status', 'active'),
    supabase.from('streaks')
      .select('current_streak').eq('user_id', userId).maybeSingle(),
  ])

  const txs = allTxs ?? []
  const monthTxs = txs.filter(t => t.date >= monthStart && t.date <= monthEnd)

  const totalIncome   = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance       = totalIncome - totalExpenses
  const savingsRate   = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0

  // Top categorías
  const catMap = new Map<string, { name: string; icon: string; amount: number }>()
  monthTxs.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category as { name?: string; icon?: string } | null
    const key = cat?.name ?? 'Sin categoría'
    const icon = cat?.icon ?? '📦'
    const ex = catMap.get(key)
    if (ex) ex.amount += t.amount
    else catMap.set(key, { name: key, icon, amount: t.amount })
  })
  const topCategories = Array.from(catMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
    .map(c => ({ ...c, pct: totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 100) : 0 }))

  // Últimos 3 meses
  const last3Months = []
  for (let i = 2; i >= 0; i--) {
    const d  = new Date(year, month - i, 1)
    const mS = d.toISOString().split('T')[0]
    const mE = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const mt = txs.filter(t => t.date >= mS && t.date <= mE)
    const inc = mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const exp = mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    last3Months.push({ month: MONTHS[d.getMonth()], income: inc, expenses: exp, savings: Math.max(0, inc - exp) })
  }

  // Deudas
  const debtList = (debts ?? []).map(d => ({
    name: d.name,
    balance: d.current_balance,
    interest: d.interest_rate,
    minPayment: d.minimum_payment,
  }))
  const totalDebt = debtList.reduce((s, d) => s + d.balance, 0)

  // Metas
  const goalList = (goals ?? []).map(g => {
    const target = new Date(g.target_date)
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return {
      name: g.name, icon: g.icon,
      target: g.target_amount, current: g.current_amount,
      pct: g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0,
      daysLeft: Math.max(0, diffDays),
    }
  })

  const netWorthEstimate = (goals ?? []).reduce((s, g) => s + g.current_amount, 0) - totalDebt

  return {
    userName: profile?.full_name?.split(' ')[0] ?? 'Usuario',
    currency: profile?.currency ?? 'CLP',
    currentMonth: {
      label: `${MONTHS[month]} ${year}`,
      totalIncome, totalExpenses, balance, savingsRate,
      daysElapsed, daysTotal,
    },
    topCategories,
    last3Months,
    debts: debtList,
    goals: goalList,
    streak: streak?.current_streak ?? 0,
    totalDebt,
    netWorthEstimate,
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────
export function buildSystemPrompt(ctx: FinancialContext): string {
  const { currentMonth: cm } = ctx
  const fmt = (n: number) => formatCurrency(n, ctx.currency)

  const categoriesText = ctx.topCategories.length > 0
    ? ctx.topCategories.map(c => `  - ${c.icon} ${c.name}: ${fmt(c.amount)} (${c.pct}%)`).join('\n')
    : '  - Sin gastos registrados'

  const debtsText = ctx.debts.length > 0
    ? ctx.debts.map(d => `  - ${d.name}: saldo ${fmt(d.balance)}, interés ${d.interest}%, cuota mínima ${fmt(d.minPayment)}`).join('\n')
    : '  - Sin deudas activas'

  const goalsText = ctx.goals.length > 0
    ? ctx.goals.map(g => `  - ${g.icon} ${g.name}: ${fmt(g.current)} de ${fmt(g.target)} (${g.pct}%, ${g.daysLeft} días restantes)`).join('\n')
    : '  - Sin metas activas'

  const monthsText = ctx.last3Months.map(m =>
    `  - ${m.month}: ingresos ${fmt(m.income)}, gastos ${fmt(m.expenses)}, ahorro ${fmt(m.savings)}`
  ).join('\n')

  return `Eres el asistente financiero personal de ${ctx.userName}. Tu nombre es "Fin", eres parte de FinTrack Pro.

PERSONALIDAD:
- Directo, práctico y empático. No genérico.
- Hablas siempre en español, en tono cercano pero profesional.
- Cuando hay un problema, lo dices con claridad. Cuando hay un logro, lo celebras.
- Nunca inventas datos. Si no tienes información, lo dices.
- Respuestas concisas: máximo 3-4 párrafos. Usa bullet points cuando ayuda.
- Siempre termina con una acción concreta que el usuario puede tomar HOY.

DATOS FINANCIEROS ACTUALES DE ${ctx.userName.toUpperCase()}:

📅 MES ACTUAL: ${cm.label} (día ${cm.daysElapsed} de ${cm.daysTotal})
  - Ingresos: ${fmt(cm.totalIncome)}
  - Gastos: ${fmt(cm.totalExpenses)}
  - Balance disponible: ${fmt(cm.balance)}
  - Tasa de ahorro: ${cm.savingsRate}%
  - Ritmo: ${cm.daysElapsed > 0 ? fmt(Math.round(cm.totalExpenses / cm.daysElapsed)) : '$0'}/día promedio

💸 PRINCIPALES GASTOS DEL MES:
${categoriesText}

📊 ÚLTIMOS 3 MESES:
${monthsText}

💳 DEUDAS:
${debtsText}
${ctx.totalDebt > 0 ? `  Total adeudado: ${fmt(ctx.totalDebt)}` : ''}

🎯 METAS DE AHORRO:
${goalsText}

🔥 RACHA DE REGISTRO: ${ctx.streak} días consecutivos
💼 PATRIMONIO NETO ESTIMADO: ${fmt(ctx.netWorthEstimate)}

REGLAS IMPORTANTES:
- Usa los datos reales de arriba, no inventes cifras.
- Si el usuario pregunta "¿cuánto tengo?", la respuesta es el balance disponible (${fmt(cm.balance)}).
- Si pregunta por proyecciones, basate en el ritmo actual (${cm.daysElapsed > 0 ? fmt(Math.round(cm.totalExpenses / cm.daysElapsed)) : '$0'}/día).
- Sugiere acciones específicas, no consejos genéricos.
- Recuerda el contexto LATAM: salarios variables, inflación, deudas informales son normales.`
}
