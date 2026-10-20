-- Projeto Amparo - permissões das funções do banco (aplicado em produção em 20/10/2026).
-- Rode no SQL Editor do Supabase DEPOIS dos outros scripts (as funções já precisam existir).
-- Pode ser executado mais de uma vez sem efeito colateral.
--
-- As funções só são chamadas pelo backend, com a chave de serviço (service_role).
-- Sem isto, quem tivesse a chave pública (anon) poderia chamar /rest/v1/rpc/apagar_conta_usuaria
-- direto no Supabase e apagar qualquer conta (a função é SECURITY DEFINER e ignora o RLS).

REVOKE EXECUTE ON FUNCTION public.apagar_conta_usuaria(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apagar_conta_usuaria(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cadastrar_usuaria_com_guardioes(text, text, text, text, date, text, text, boolean, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cadastrar_usuaria_com_guardioes(text, text, text, text, date, text, text, boolean, text, jsonb) TO service_role;

-- Função de gatilho de evento (liga o RLS em tabelas novas): não é para ser chamada pela API.
-- Em bancos onde ela não existir, esta linha pode ser ignorada.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- search_path fixo, para a função não poder ser enganada por objetos com o mesmo nome em outro esquema
ALTER FUNCTION public.cadastrar_usuaria_com_guardioes(text, text, text, text, date, text, text, boolean, text, jsonb) SET search_path = public;
ALTER FUNCTION public.prevent_zero_guardians() SET search_path = public;

-- Conferência (deve mostrar anon = false e service_role = true nas três primeiras):
-- select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon,
--        has_function_privilege('service_role', p.oid, 'execute') as service_role
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public';
