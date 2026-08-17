-- ===================================================================
-- Calféx — Schema Oficial do Banco de Dados em Nuvem (Supabase)
-- Execute este script no SQL Editor do seu projeto Supabase
-- ===================================================================

-- 1. Criação da Tabela de Estudantes (Contas, Notas, Disciplinas e Configurações)
CREATE TABLE IF NOT EXISTS public.calfex_students (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  order_number TEXT,
  class_room TEXT,
  course TEXT,
  school_name TEXT,
  academic_year TEXT,
  gender TEXT,
  password_hash TEXT,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  security_settings JSONB NOT NULL DEFAULT '{"mode": "none"}'::jsonb,
  target_grade NUMERIC DEFAULT 14,
  schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  pauta_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Criação da Tabela de Códigos de Redefinição de Senha e Verificação por E-mail
CREATE TABLE IF NOT EXISTS public.calfex_password_resets (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  student_id TEXT,
  student_name TEXT,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Índices de Alta Performance para Busca Rápida de Login
CREATE INDEX IF NOT EXISTS idx_calfex_students_email ON public.calfex_students (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_calfex_students_name ON public.calfex_students (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_calfex_students_order_number ON public.calfex_students (order_number);

-- 4. Função e Gatilho para Atualização Automática de 'updated_at'
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_calfex_students_updated_at ON public.calfex_students;
CREATE TRIGGER tr_calfex_students_updated_at
BEFORE UPDATE ON public.calfex_students
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 5. Habilitar Segurança por Linha (Row Level Security)
ALTER TABLE public.calfex_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calfex_password_resets ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acesso Seguro (Permite leitura/gravação autenticada ou via Service Role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'calfex_students' AND policyname = 'Allow service_role or backend access'
  ) THEN
    CREATE POLICY "Allow service_role or backend access" ON public.calfex_students
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'calfex_password_resets' AND policyname = 'Allow password reset access'
  ) THEN
    CREATE POLICY "Allow password reset access" ON public.calfex_password_resets
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
