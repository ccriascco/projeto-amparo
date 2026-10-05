-- Projeto Amparo - novas colunas de ocorrência, PDF como evidência e LGPD na exclusão de conta.
-- Rode no SQL Editor do Supabase ANTES de subir a nova versão do backend.

-- 1) Ocorrências: data em que a violência aconteceu, risco calculado para a ocorrência
--    e data da última edição. Todas opcionais, então os registros antigos continuam válidos.
ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS data_ocorrencia date;
ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS nivel_risco text;
ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS atualizado_em timestamptz;

-- 2) Evidências: o backend passa a gravar o tipo 'DOCUMENTO' para PDFs.
--    Antes de seguir, confira se existe alguma restrição CHECK na tabela evidencias:
--
--      SELECT conname, pg_get_constraintdef(oid)
--      FROM pg_constraint
--      WHERE conrelid = 'public.evidencias'::regclass AND contype = 'c';
--
--    Se aparecer uma restrição que limite a coluna "tipo" a IMAGE/AUDIO/VIDEO,
--    ela precisa incluir 'DOCUMENTO'. Se a consulta não retornar nada, não há o que fazer.

-- 3) LGPD: a exclusão de conta passa a apagar também os tokens revogados da usuária,
--    para não restar o identificador dela no banco.
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
  DELETE FROM public.tokens_revogados WHERE usuaria_id = p_usuaria_id;

  ALTER TABLE public.guardioes ENABLE TRIGGER USER;

  DELETE FROM public.usuarias WHERE id = p_usuaria_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apagar_conta_usuaria(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apagar_conta_usuaria(uuid) TO service_role;

-- 4) Limpeza dos tokens revogados que já expiraram (não servem mais para nada).
DELETE FROM public.tokens_revogados WHERE expira_em < now();
