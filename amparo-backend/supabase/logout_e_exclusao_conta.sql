-- Projeto Amparo - logout com revogação de token e exclusão de conta.
-- Execute no SQL Editor do Supabase.

-- 1) Tokens revogados pelo logout. Sem FK para usuarias de propósito:
--    a linha pode sobreviver à conta e expira junto com o próprio token.
CREATE TABLE IF NOT EXISTS public.tokens_revogados (
  jti uuid PRIMARY KEY,
  usuaria_id uuid NOT NULL,
  expira_em timestamptz NOT NULL,
  revogado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tokens_revogados ENABLE ROW LEVEL SECURITY;

-- 2) Exclusão da conta. A regra "toda usuária tem ao menos 1 guardiã" é uma
--    trigger em guardioes; ela é desligada SOMENTE dentro desta transação, e a
--    transação inteira é desfeita se qualquer passo falhar (inclusive o religamento).
CREATE OR REPLACE FUNCTION public.apagar_conta_usuaria(p_usuaria_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ALTER TABLE public.guardioes DISABLE TRIGGER USER;

  DELETE FROM public.rastreamento_gps
    WHERE emergencia_id IN (SELECT id FROM public.emergencias WHERE usuaria_id = p_usuaria_id);
  DELETE FROM public.evidencias
    WHERE ocorrencia_id IN (SELECT id FROM public.ocorrencias WHERE usuaria_id = p_usuaria_id);
  DELETE FROM public.alertas_risco WHERE usuaria_id = p_usuaria_id;
  DELETE FROM public.emergencias WHERE usuaria_id = p_usuaria_id;
  DELETE FROM public.ocorrencias WHERE usuaria_id = p_usuaria_id;
  DELETE FROM public.guardioes WHERE usuaria_id = p_usuaria_id;

  ALTER TABLE public.guardioes ENABLE TRIGGER USER;

  DELETE FROM public.usuarias WHERE id = p_usuaria_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apagar_conta_usuaria(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apagar_conta_usuaria(uuid) TO service_role;
