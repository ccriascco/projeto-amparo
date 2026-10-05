-- Projeto Amparo - Cadastro atômico de usuária + guardiãs (P11)
-- Antes, o backend fazia 2 inserts separados e, se o segundo falhasse,
-- tentava "desfazer" o primeiro manualmente (rollback na mão) - se esse
-- delete de compensação também falhasse, ficava uma usuária órfã sem
-- guardiã nenhuma. Esta função coloca os dois inserts na mesma transação
-- do Postgres: se qualquer parte falhar, tudo é desfeito automaticamente.
--
-- Execute este script no SQL Editor do Supabase.

CREATE OR REPLACE FUNCTION public.cadastrar_usuaria_com_guardioes(
  p_cpf text,
  p_email text,
  p_telefone text,
  p_nome_completo text,
  p_data_nascimento date,
  p_senha_hash text,
  p_senha_app text,
  p_modo_disfarcado boolean,
  p_guardioes jsonb
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_usuaria_id uuid;
BEGIN
  INSERT INTO public.usuarias (
    cpf, email, telefone, nome_completo, data_nascimento,
    senha_hash, senha_app, modo_disfarcado
  )
  VALUES (
    p_cpf, p_email, p_telefone, p_nome_completo, p_data_nascimento,
    p_senha_hash, p_senha_app, p_modo_disfarcado
  )
  RETURNING id INTO v_usuaria_id;

  INSERT INTO public.guardioes (usuaria_id, nome_completo, telefone, email, parentesco_relacao)
  SELECT
    v_usuaria_id,
    g->>'nome_completo',
    g->>'telefone',
    g->>'email',
    g->>'parentesco_relacao'
  FROM jsonb_array_elements(p_guardioes) AS g;

  RETURN v_usuaria_id;
END;
$$;

-- Garante que o backend (service_role) pode chamar a função via RPC.
GRANT EXECUTE ON FUNCTION public.cadastrar_usuaria_com_guardioes TO service_role;
