-- ================================================================
-- FinTrack Pro — Migration: Product Improvements v2
-- Fecha: 2026-03-17
-- Descripción: Nuevas tablas y columnas para Health Score,
--              presupuestos por categoría, rachas, métodos de pago,
--              deudas informales, cuotas y configuración avanzada
-- ================================================================

-- ----------------------------------------------------------------
-- 1. TABLA: budget_limits
-- Presupuesto mensual por categoría (más flexible que límite en categories)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budget_limits (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  month_year  TEXT NOT NULL, -- formato: '2026-03' (YYYY-MM)
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id, month_year)
);

ALTER TABLE public.budget_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_limits_own" ON public.budget_limits
  FOR ALL USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 2. TABLA: streaks
-- Rastrea rachas diarias de registro del usuario
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.streaks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak  INTEGER DEFAULT 0,
  longest_streak  INTEGER DEFAULT 0,
  last_active_date TEXT, -- 'YYYY-MM-DD'
  total_days      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "streaks_own" ON public.streaks
  FOR ALL USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 3. TABLA: insights
-- Insights generados automáticamente (IA o reglas)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.insights (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL, -- 'spending_alert' | 'projection' | 'achievement' | 'tip' | 'weekly_summary'
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  icon        TEXT DEFAULT '💡',
  priority    INTEGER DEFAULT 5, -- 1=alta, 10=baja
  is_read     BOOLEAN DEFAULT FALSE,
  expires_at  TIMESTAMPTZ,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insights_own" ON public.insights
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS insights_user_unread ON public.insights(user_id, is_read, created_at DESC);

-- ----------------------------------------------------------------
-- 4. COLUMNAS NUEVAS EN profiles
-- ----------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS health_score_cache   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spending_alert_pct   INTEGER DEFAULT 80, -- Alerta al X% del presupuesto
  ADD COLUMN IF NOT EXISTS weekly_summary_day   INTEGER DEFAULT 1,   -- 1=Lunes
  ADD COLUMN IF NOT EXISTS default_payment_method TEXT DEFAULT 'card'; -- 'cash' | 'card' | 'transfer'

-- ----------------------------------------------------------------
-- 5. COLUMNAS NUEVAS EN transactions
-- Método de pago, cuotas (BNPL/tarjeta)
-- ----------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_method   TEXT DEFAULT 'card', -- 'cash' | 'card' | 'transfer' | 'bnpl'
  ADD COLUMN IF NOT EXISTS installments     INTEGER DEFAULT 1,    -- Número de cuotas (1 = pago único)
  ADD COLUMN IF NOT EXISTS installment_no   INTEGER DEFAULT 1,    -- Cuota actual (ej: 3 de 12)
  ADD COLUMN IF NOT EXISTS location         TEXT,                  -- Opcional: lugar del gasto
  ADD COLUMN IF NOT EXISTS tags             TEXT[] DEFAULT '{}';  -- Tags libres

-- ----------------------------------------------------------------
-- 6. COLUMNAS NUEVAS EN debts
-- Tipo de deuda: formal, informal, BNPL, tarjeta
-- ----------------------------------------------------------------
ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS debt_type     TEXT DEFAULT 'formal', -- 'formal' | 'informal' | 'bnpl' | 'credit_card'
  ADD COLUMN IF NOT EXISTS creditor_name TEXT,   -- Nombre de quien se le debe (para informal)
  ADD COLUMN IF NOT EXISTS notes         TEXT,
  ADD COLUMN IF NOT EXISTS color         TEXT DEFAULT '#ef4444',
  ADD COLUMN IF NOT EXISTS icon          TEXT DEFAULT '💳';

-- ----------------------------------------------------------------
-- 7. COLUMNAS NUEVAS EN categories
-- Presupuesto mensual sugerido y límite de alerta
-- ----------------------------------------------------------------
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS monthly_budget  NUMERIC(12,2),  -- Presupuesto mensual sugerido
  ADD COLUMN IF NOT EXISTS sort_order      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN DEFAULT TRUE;

-- ----------------------------------------------------------------
-- 8. FUNCIÓN: calcular Health Score
-- Retorna 0-100 basado en comportamiento financiero del mes
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_health_score(p_user_id UUID, p_month_year TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_income       NUMERIC := 0;
  v_expenses     NUMERIC := 0;
  v_savings_rate NUMERIC := 0;
  v_debt_count   INTEGER := 0;
  v_goals_active INTEGER := 0;
  v_score        NUMERIC := 0;
  v_start_date   TEXT;
  v_end_date     TEXT;
BEGIN
  -- Calcular rango de fechas
  v_start_date := p_month_year || '-01';
  v_end_date   := (TO_DATE(p_month_year || '-01', 'YYYY-MM-DD') + INTERVAL '1 month - 1 day')::TEXT;

  -- Ingresos del mes
  SELECT COALESCE(SUM(amount), 0) INTO v_income
  FROM public.transactions
  WHERE user_id = p_user_id AND type = 'income' AND is_deleted_at IS NULL
    AND date BETWEEN v_start_date AND v_end_date;

  -- Gastos del mes
  SELECT COALESCE(SUM(amount), 0) INTO v_expenses
  FROM public.transactions
  WHERE user_id = p_user_id AND type = 'expense' AND deleted_at IS NULL
    AND date BETWEEN v_start_date AND v_end_date;

  -- Tasa de ahorro (40 puntos máximo)
  IF v_income > 0 THEN
    v_savings_rate := (v_income - v_expenses) / v_income;
    IF v_savings_rate >= 0.3 THEN
      v_score := v_score + 40;
    ELSIF v_savings_rate >= 0.15 THEN
      v_score := v_score + 25;
    ELSIF v_savings_rate >= 0 THEN
      v_score := v_score + 10;
    END IF;
  END IF;

  -- Deudas activas (20 puntos: sin deudas = 20, con deudas = 0-10)
  SELECT COUNT(*) INTO v_debt_count FROM public.debts
  WHERE user_id = p_user_id AND status = 'active';
  IF v_debt_count = 0 THEN
    v_score := v_score + 20;
  ELSIF v_debt_count <= 2 THEN
    v_score := v_score + 10;
  END IF;

  -- Metas activas (20 puntos: tener metas activas es positivo)
  SELECT COUNT(*) INTO v_goals_active FROM public.goals
  WHERE user_id = p_user_id AND status = 'active';
  IF v_goals_active > 0 THEN
    v_score := v_score + 20;
  END IF;

  -- Bonus por ingresos vs gastos equilibrados (20 puntos)
  IF v_income > 0 AND v_expenses <= v_income THEN
    v_score := v_score + 20;
  END IF;

  RETURN GREATEST(0, LEAST(100, v_score::INTEGER));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- 9. FUNCIÓN: actualizar racha del usuario
-- Se llama cada vez que el usuario registra una transacción
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_today        TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
  v_yesterday    TEXT := TO_CHAR(NOW() - INTERVAL '1 day', 'YYYY-MM-DD');
  v_streak       RECORD;
BEGIN
  SELECT * INTO v_streak FROM public.streaks WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.streaks(user_id, current_streak, longest_streak, last_active_date, total_days)
    VALUES (p_user_id, 1, 1, v_today, 1);
    RETURN;
  END IF;

  -- Ya registró hoy
  IF v_streak.last_active_date = v_today THEN
    RETURN;
  END IF;

  -- Continuó la racha desde ayer
  IF v_streak.last_active_date = v_yesterday THEN
    UPDATE public.streaks SET
      current_streak  = v_streak.current_streak + 1,
      longest_streak  = GREATEST(v_streak.longest_streak, v_streak.current_streak + 1),
      last_active_date = v_today,
      total_days      = v_streak.total_days + 1,
      updated_at      = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- Rompió la racha
    UPDATE public.streaks SET
      current_streak   = 1,
      last_active_date = v_today,
      total_days       = v_streak.total_days + 1,
      updated_at       = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- 10. TRIGGER: actualizar racha automáticamente al insertar transacción
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_update_streak()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.update_streak(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_transaction_insert ON public.transactions;
CREATE TRIGGER on_transaction_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_streak();

-- ----------------------------------------------------------------
-- 11. CATEGORÍAS DEL SISTEMA para LATAM (si no existen)
-- ----------------------------------------------------------------
INSERT INTO public.categories (id, user_id, name, type, icon, color, is_system, sort_order, monthly_budget)
SELECT gen_random_uuid(), NULL, name, type, icon, color, TRUE, sort_order, monthly_budget
FROM (VALUES
  -- GASTOS
  ('Supermercado',          'expense', '🛒', '#10b981', TRUE, 1,  150000),
  ('Restaurantes',          'expense', '🍽️', '#f59e0b', TRUE, 2,  80000),
  ('Delivery',              'expense', '🛵', '#f97316', TRUE, 3,  50000),
  ('Transporte',            'expense', '🚗', '#3b82f6', TRUE, 4,  60000),
  ('Arriendo',              'expense', '🏠', '#8b5cf6', TRUE, 5,  NULL),
  ('Servicios básicos',     'expense', '💡', '#06b6d4', TRUE, 6,  50000),
  ('Salud',                 'expense', '🏥', '#ec4899', TRUE, 7,  30000),
  ('Educación',             'expense', '📚', '#6366f1', TRUE, 8,  NULL),
  ('Ropa y calzado',        'expense', '👕', '#84cc16', TRUE, 9,  40000),
  ('Entretenimiento',       'expense', '🎮', '#a855f7', TRUE, 10, 30000),
  ('Suscripciones',         'expense', '📱', '#14b8a6', TRUE, 11, 20000),
  ('Mascota',               'expense', '🐾', '#f59e0b', TRUE, 12, 30000),
  ('Viajes',                'expense', '✈️', '#0ea5e9', TRUE, 13, NULL),
  ('Gimnasio',              'expense', '💪', '#22c55e', TRUE, 14, 30000),
  ('Farmacia',              'expense', '💊', '#ef4444', TRUE, 15, 20000),
  ('Peluquería y estética', 'expense', '💈', '#d946ef', TRUE, 16, 20000),
  ('Regalos',               'expense', '🎁', '#fb923c', TRUE, 17, NULL),
  ('Combustible',           'expense', '⛽', '#64748b', TRUE, 18, 50000),
  ('Otro gasto',            'expense', '📦', '#94a3b8', TRUE, 99, NULL),
  -- INGRESOS
  ('Sueldo',                'income',  '💼', '#22c55e', TRUE, 1,  NULL),
  ('Freelance',             'income',  '💻', '#3b82f6', TRUE, 2,  NULL),
  ('Negocio',               'income',  '🏪', '#f59e0b', TRUE, 3,  NULL),
  ('Inversiones',           'income',  '📈', '#8b5cf6', TRUE, 4,  NULL),
  ('Bonos',                 'income',  '🎯', '#ec4899', TRUE, 5,  NULL),
  ('Arriendo cobrado',      'income',  '🏘️', '#06b6d4', TRUE, 6,  NULL),
  ('Otro ingreso',          'income',  '➕', '#94a3b8', TRUE, 99, NULL)
) AS t(name, type, icon, color, is_system, sort_order, monthly_budget)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE name = t.name AND is_system = TRUE
);

-- ----------------------------------------------------------------
-- 12. RLS para nuevas tablas (budget_limits ya tiene RLS)
-- ----------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.budget_limits TO authenticated;
GRANT ALL ON public.streaks TO authenticated;
GRANT ALL ON public.insights TO authenticated;
