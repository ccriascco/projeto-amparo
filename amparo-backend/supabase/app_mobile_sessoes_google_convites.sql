-- Projeto Amparo - mudanças para o app mobile (aprovadas em 13/10/2026).
-- Rode no SQL Editor do Supabase ANTES de subir a nova versão do backend.
-- Pode ser executado mais de uma vez sem efeito colateral.
--
--  1) Código de 4 números do Modo Disfarce, login com Google e data da última troca de senha
--  2) Sessão do aparelho (refresh token) para reabrir o app e entrar só com o código no disfarce
--  3) Convite das guardiãs com confirmação
--  4) Aviso de cada pedido de ajuda por guardiã, com confirmação
--  5) Cadastro transacional e exclusão de conta atualizados

-- 1) usuarias -------------------------------------------------------------------------
-- Contas criadas pelo Google podem não ter senha; o código do disfarce é opcional.
ALTER TABLE public.usuarias ALTER COLUMN senha_hash DROP NOT NULL;
ALTER TABLE public.usuarias ALTER COLUMN senha_app DROP NOT NULL;
-- O código de 4 números fica numa coluna nova. A coluna antiga senha_app (8+ caracteres,
-- usada pelo login-disfarcado que foi removido) não é mais lida nem gravada; quem tinha o
-- disfarce ligado vai cadastrar o código novo pelo app.
ALTER TABLE public.usuarias ADD COLUMN IF NOT EXISTS codigo_disfarce_hash text;
ALTER TABLE public.usuarias ADD COLUMN IF NOT EXISTS google_sub text;
ALTER TABLE public.usuarias ADD COLUMN IF NOT EXISTS senha_alterada_em timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS usuarias_google_sub_unico ON public.usuarias (google_sub) WHERE google_sub IS NOT NULL;

-- 2) sessões do aparelho ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessoes_aparelho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuaria_id uuid NOT NULL REFERENCES public.usuarias (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  ultimo_uso_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL,
  tentativas_codigo integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sessoes_aparelho_usuaria ON public.sessoes_aparelho (usuaria_id);
ALTER TABLE public.sessoes_aparelho ENABLE ROW LEVEL SECURITY;

-- 3) convite das guardiãs ----------------------------------------------------------------
ALTER TABLE public.guardioes ADD COLUMN IF NOT EXISTS status_convite text NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE public.guardioes ADD COLUMN IF NOT EXISTS convite_token_hash text;
ALTER TABLE public.guardioes ADD COLUMN IF NOT EXISTS convidado_em timestamptz DEFAULT now();
ALTER TABLE public.guardioes ADD COLUMN IF NOT EXISTS confirmado_em timestamptz;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guardioes_status_convite_valido') THEN
    ALTER TABLE public.guardioes
      ADD CONSTRAINT guardioes_status_convite_valido CHECK (status_convite IN ('PENDENTE', 'CONFIRMADO'));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS guardioes_convite_token_unico ON public.guardioes (convite_token_hash) WHERE convite_token_hash IS NOT NULL;

-- 4) avisos de emergência por guardiã ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.avisos_emergencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emergencia_id uuid NOT NULL REFERENCES public.emergencias (id) ON DELETE CASCADE,
  -- Se a guardiã for removida depois, o histórico do aviso continua (com o nome guardado)
  guardiao_id uuid REFERENCES public.guardioes (id) ON DELETE SET NULL,
  usuaria_id uuid NOT NULL REFERENCES public.usuarias (id) ON DELETE CASCADE,
  nome_guardia text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  confirmado_em timestamptz
);
CREATE INDEX IF NOT EXISTS avisos_emergencia_emergencia ON public.avisos_emergencia (emergencia_id);
ALTER TABLE public.avisos_emergencia ENABLE ROW LEVEL SECURITY;

-- 5a) cadastro transacional: código do disfarce, Google e token do convite de cada guardiã
DROP FUNCTION IF EXISTS public.cadastrar_usuaria_com_guardioes(text, text, text, text, date, text, text, boolean, jsonb);

CREATE OR REPLACE FUNCTION public.cadastrar_usuaria_com_guardioes(
  p_cpf text,
  p_email text,
  p_telefone text,
  p_nome_completo text,
  p_data_nascimento date,
  p_senha_hash text,
  p_codigo_disfarce_hash text,
  p_modo_disfarcado boolean,
  p_google_sub text,
  p_guardioes jsonb
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_usuaria_id uuid;
BEGIN
  INSERT INTO public.usuarias (
    cpf, email, telefone, nome_completo, data_nascimento,
    senha_hash, codigo_disfarce_hash, modo_disfarcado, google_sub, senha_alterada_em
  )
  VALUES (
    p_cpf, p_email, p_telefone, p_nome_completo, p_data_nascimento,
    p_senha_hash, p_codigo_disfarce_hash, p_modo_disfarcado, p_google_sub,
    CASE WHEN p_senha_hash IS NULL THEN NULL ELSE now() END
  )
  RETURNING id INTO v_usuaria_id;

  INSERT INTO public.guardioes (
    usuaria_id, nome_completo, telefone, email, parentesco_relacao,
    status_convite, convite_token_hash, convidado_em
  )
  SELECT
    v_usuaria_id,
    g->>'nome_completo',
    g->>'telefone',
    g->>'email',
    g->>'parentesco_relacao',
    'PENDENTE',
    g->>'convite_token_hash',
    now()
  FROM jsonb_array_elements(p_guardioes) AS g;

  RETURN v_usuaria_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cadastrar_usuaria_com_guardioes(text, text, text, text, date, text, text, boolean, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cadastrar_usuaria_com_guardioes(text, text, text, text, date, text, text, boolean, text, jsonb) TO service_role;

-- 5b) exclusão de conta: apaga também sessões e avisos (LGPD)
CREATE OR REPLACE FUNCTION public.apagar_conta_usuaria(p_usuaria_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ALTER TABLE public.guardioes DISABLE TRIGGER USER;

  DELETE FROM public.avisos_emergencia WHERE usuaria_id = p_usuaria_id;
  DELETE FROM public.sessoes_aparelho WHERE usuaria_id = p_usuaria_id;
  DELETE FROM public.rastreamento_gps
    WHERE emergencia_id IN (SELECT id FROM public.emergencias WHERE usuaria_id = p_usuaria_id);
  DELETE FROM public.evidencias
    WHERE ocorrencia_id IN (SELECT id FROM public.ocorrencias WHERE usuaria_id = p_usuaria_id);
  DELETE FROM public.alertas_risco WHERE usuaria_id = p_usuaria_id;
  DELETE FROM public.emergencias WHERE usuaria_id = p_usuaria_id;
  DELETE FROM public.ocorrencias WHERE usuaria_id = p_usuaria_id;
  DELETE FROM public.guardioes WHERE usuaria_id = p_usuaria_id;
  DELETE FROM public.tokens_revogados WHERE usuaria_id = p_usuaria_id;

  ALTER TABLE public.guardioes ENABLE TRIGGER USER;

  DELETE FROM public.usuarias WHERE id = p_usuaria_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apagar_conta_usuaria(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apagar_conta_usuaria(uuid) TO service_role;
