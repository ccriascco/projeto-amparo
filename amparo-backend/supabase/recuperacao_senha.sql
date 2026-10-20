-- Projeto Amparo - recuperação de senha (aprovada em 20/10/2026).
-- Rode no SQL Editor do Supabase ANTES de subir a nova versão do backend.
-- Pode ser executado mais de uma vez sem efeito colateral.
--
-- Um pedido aberto por usuária: o código de 6 números (guardado só como hash) vale 15 minutos,
-- serve uma vez e é invalidado depois de 5 tentativas erradas. Pedir um código novo apaga o anterior.

CREATE TABLE IF NOT EXISTS public.recuperacoes_senha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuaria_id uuid NOT NULL REFERENCES public.usuarias (id) ON DELETE CASCADE,
  codigo_hash text NOT NULL,
  canal text NOT NULL CHECK (canal IN ('email', 'sms')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL,
  tentativas integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS recuperacoes_senha_usuaria ON public.recuperacoes_senha (usuaria_id);

-- Só o backend (chave de serviço) lê e grava; o app nunca acessa esta tabela diretamente.
ALTER TABLE public.recuperacoes_senha ENABLE ROW LEVEL SECURITY;
