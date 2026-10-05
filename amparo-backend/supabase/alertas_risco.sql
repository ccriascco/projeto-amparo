-- Projeto Amparo - Tabela de alertas de risco (P10)
-- Guarda o histórico de alertas automáticos enviados às guardiãs quando
-- o nível de risco de uma usuária sobe para "Alto".
--
-- Execute este script no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS public.alertas_risco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuaria_id uuid NOT NULL REFERENCES public.usuarias(id) ON DELETE CASCADE,
  nivel_risco text NOT NULL,
  latitude double precision,
  longitude double precision,
  mensagem text NOT NULL,
  guardioes_notificados integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Segue a mesma estratégia de segurança do resto do projeto (ver
-- habilitar_rls.sql): RLS habilitado, sem política para anon/authenticated,
-- acesso só via service_role (usado pelo backend).
ALTER TABLE public.alertas_risco ENABLE ROW LEVEL SECURITY;
