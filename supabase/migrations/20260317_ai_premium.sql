-- ================================================================
-- FinTrack Pro — Migration: AI + Premium
-- Fecha: 2026-03-17
-- ================================================================

-- 1. Campo is_premium en profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS premium_since      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_messages_used   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_messages_limit  INTEGER DEFAULT 5; -- free: 5 mensajes/mes

-- 2. Tabla: ai_conversations — historial de conversaciones IA
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT,              -- Generado automáticamente del primer mensaje
  model       TEXT DEFAULT 'claude-haiku-4-5',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_conversations_own" ON public.ai_conversations
  FOR ALL USING (auth.uid() = user_id);

-- 3. Tabla: ai_messages — mensajes de cada conversación
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  tokens_used     INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_messages_own" ON public.ai_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ai_messages_conversation ON public.ai_messages(conversation_id, created_at ASC);

-- 4. Tabla: ai_quick_insights — insights pre-generados del sistema
CREATE TABLE IF NOT EXISTS public.ai_quick_insights (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year  TEXT NOT NULL,   -- 'YYYY-MM'
  content     TEXT NOT NULL,   -- Texto generado por IA
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

ALTER TABLE public.ai_quick_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_quick_insights_own" ON public.ai_quick_insights
  FOR ALL USING (auth.uid() = user_id);

-- 5. Función: resetear contador mensual de mensajes IA
-- (llamar vía cron job el 1ro de cada mes)
CREATE OR REPLACE FUNCTION public.reset_ai_message_counts()
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET ai_messages_used = 0
  WHERE NOT is_premium OR is_premium IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grants
GRANT ALL ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_quick_insights TO authenticated;
