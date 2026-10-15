import { createClient } from '@supabase/supabase-js';

// Cliente do Supabase com a chave de serviço (só no servidor, nunca vai para o app).
// Cada service cria o seu ao ser instanciado, com as variáveis do .env.
export function criarClienteSupabase() {
  return createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
}
