-- Projeto Amparo - Habilitação de Row Level Security (RLS)
-- Resolve P02: todas as tabelas estavam com RLS desativado, permitindo
-- leitura/escrita direta por qualquer pessoa que tivesse a chave anon.
--
-- Como o backend NestJS não usa o Supabase Auth (tem seu próprio JWT),
-- não existe auth.uid() para amarrar políticas por usuária aqui no banco.
-- A estratégia adotada é:
--   1. Habilitar RLS em todas as tabelas, SEM criar nenhuma política para
--      os papéis "anon" e "authenticated".
--   2. Isso bloqueia por padrão qualquer acesso que não seja via
--      "service_role" (que ignora RLS por definição no Supabase).
--   3. O backend passa a usar a Service Role Key (nunca exposta a
--      clientes). A autorização por usuária continua sendo feita no
--      NestJS, exatamente como já funciona hoje.
--
-- Execute este script completo no SQL Editor do Supabase.

ALTER TABLE public.usuarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rastreamento_gps ENABLE ROW LEVEL SECURITY;

-- Nenhuma política é criada de propósito: isso faz com que "anon" e
-- "authenticated" não consigam mais ler/escrever nada nessas tabelas.
-- Apenas a "service_role" (usada pelo backend) continua com acesso total.

-- ---------------------------------------------------------------------
-- STORAGE (bucket evidencias_amparo)
-- ---------------------------------------------------------------------
-- O RLS acima NÃO cobre o Storage. Faça manualmente, fora deste script:
--
-- 1. Painel Supabase > Storage > evidencias_amparo > Configuration
--    - Marque o bucket como PRIVADO (o toggle "Public bucket" deve
--      estar desligado). Se estiver marcado como público, qualquer
--      pessoa com o caminho do arquivo baixa a evidência sem
--      autenticação nenhuma, independente de RLS.
--
-- 2. Em Storage > Policies, confirme que não existe nenhuma policy
--    liberando leitura/escrita para "anon" ou "authenticated" no bucket
--    evidencias_amparo. O backend (service_role) não precisa de policy
--    para acessar - service_role sempre ignora RLS, incluindo as
--    policies de storage.objects.
--
-- ACHADO (05/10/2026): existia a policy "Permitir acesso completo ao
-- bucket de evidencias", comando ALL, aplicada ao papel "public" -
-- ou seja, qualquer pessoa com a chave anon conseguia listar e baixar
-- evidências reais sem autenticação. Essa policy precisa ser removida.
-- Pode ser feita pela UI (Storage > evidencias_amparo > Policies > ⋮ >
-- Delete) ou rodando o comando abaixo no SQL Editor:

DROP POLICY IF EXISTS "Permitir acesso completo ao bucket de evidencias" ON storage.objects;
