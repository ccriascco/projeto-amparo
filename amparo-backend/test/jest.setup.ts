import 'reflect-metadata';

// Os services constroem o cliente do Supabase no construtor (createClient),
// que valida a presença de URL/KEY mesmo quando o client real nunca chega a
// ser usado (os testes substituem `service.supabase` por um fake). Sem isso,
// qualquer `new XxxService()` em teste quebra por falta de env vars.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
