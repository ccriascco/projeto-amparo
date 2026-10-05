# Amparo — Backend

API do aplicativo Amparo, que ajuda mulheres em situação de violência a registrar ocorrências, manter uma rede de guardiãs, acionar um botão de emergência e receber uma classificação de risco feita por inteligência artificial.

Feito com [NestJS](https://nestjs.com), [Supabase](https://supabase.com) (PostgreSQL e Storage) e autenticação própria com JWT.

## Funcionalidades

- **Usuárias:** cadastro com CPF validado (dígitos verificadores), login, login disfarçado (senha de disfarce), logout com revogação do token e exclusão da conta.
- **Guardiãs:** de 1 a 5 por usuária. A última guardiã não pode ser removida enquanto a conta existir.
- **Ocorrências:** registro com tipos de violência, upload de evidências (foto, vídeo ou áudio) com verificação do conteúdo real do arquivo, e listagem paginada.
- **Botão de emergência:** acionamento com notificação simulada das guardiãs, rastreamento de localização e encerramento. Acionamentos por engano (até 30 s) não contam para o risco.
- **Classificação de risco:** a cada ocorrência, o backend envia o histórico para o serviço de IA. Quando o risco passa a ser alto, as guardiãs são alertadas.

## Requisitos

- Node.js 20 ou mais recente
- Um projeto no Supabase com as tabelas e o bucket `evidencias_amparo` (ver [Banco de dados](#banco-de-dados))
- O serviço de IA rodando (pasta `amparo-ia`)

## Instalação

```bash
npm install
```

Crie o arquivo `.env` na raiz do backend. Ele não vai para o git.

```text
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
JWT_SECRET=um-segredo-longo-e-aleatorio
JWT_EXPIRES_IN=2h
IA_SHARED_SECRET=o-mesmo-valor-configurado-na-ia
IA_SERVICE_URL=http://127.0.0.1:8000
PORT=3000
```

| Variável | Para que serve |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de acesso do backend. Nunca envie para um cliente (ela ignora o RLS) |
| `JWT_SECRET` | Segredo para assinar os tokens. Use um valor aleatório e diferente em cada ambiente |
| `JWT_EXPIRES_IN` | Validade do token (padrão `2h`) |
| `IA_SHARED_SECRET` | Segredo compartilhado com o serviço de IA |
| `IA_SERVICE_URL` | Endereço do serviço de IA (padrão `http://127.0.0.1:8000`) |
| `PORT` | Porta da API (padrão `3000`) |

## Executar

```bash
npm run start:dev
```

Em produção:

```bash
npm run build
npm run start:prod
```

Para confirmar que a API está no ar, `GET /` sem token deve responder `401`.

## Rotas

Todas as rotas exigem o cabeçalho `Authorization: Bearer <token>`, exceto as marcadas como públicas.

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/usuarias` | Cadastro (público) |
| `POST` | `/usuarias/login` | Login (público) |
| `POST` | `/usuarias/login-disfarcado` | Login com a senha de disfarce (público) |
| `POST` | `/usuarias/logout` | Revoga o token atual |
| `DELETE` | `/usuarias/me` | Exclui a conta (exige a senha no corpo) |
| `POST` | `/guardioes` | Cadastra uma guardiã |
| `GET` | `/guardioes` | Lista as guardiãs da usuária |
| `PUT` | `/guardioes/:id` | Edita uma guardiã |
| `DELETE` | `/guardioes/:id` | Remove uma guardiã |
| `POST` | `/ocorrencias` | Registra uma ocorrência |
| `GET` | `/ocorrencias?limit=&offset=` | Lista as ocorrências (paginação: padrão 20, máximo 100) |
| `POST` | `/ocorrencias/:id/evidencias` | Anexa uma evidência (multipart, campo `arquivo`) |
| `DELETE` | `/ocorrencias/:id` | Remove a ocorrência e seus arquivos |
| `POST` | `/emergencias/acionar` | Aciona o botão de emergência |
| `POST` | `/emergencias/:id/localizacao` | Registra um ponto de localização |
| `POST` | `/emergencias/:id/encerrar` | Encerra a emergência |
| `GET` | `/emergencias/:id/rota` | Histórico de localização da emergência |
| `GET` | `/` | Verificação de conexão com o banco |

### Regras principais

- Cadastro exige de 1 a 5 guardiãs e CPF válido. A senha de disfarce precisa ser diferente da senha real.
- Só uma emergência ativa por usuária. Isso é garantido também por um índice único no banco.
- Acionar o botão em nome de outra usuária responde `403`.
- Uma ocorrência idêntica à anterior, criada nos últimos 30 segundos, é recusada com `409`.
- Erros do banco não chegam ao cliente. Os status são: `409` para duplicidade, `400` para violação de regra, `503` quando o banco está indisponível, e `500` para o resto.

## Banco de dados

Os scripts estão em `supabase/` e devem ser executados no SQL Editor do Supabase, nesta ordem:

1. `habilitar_rls.sql`: liga o RLS em todas as tabelas. O backend acessa o banco pela service role.
2. `cadastrar_usuaria_transacional.sql`: função que cadastra a usuária e as guardiãs em uma única transação.
3. `alertas_risco.sql`: tabela de alertas de risco alto.
4. `emergencia_unica_ativa.sql`: índice único de emergência ativa por usuária.
5. `logout_e_exclusao_conta.sql`: tabela de tokens revogados e função de exclusão de conta.

Além dos scripts, o bucket de Storage `evidencias_amparo` deve existir e ser **privado**, sem políticas liberando acesso para `anon` ou `public`.

## Testes

```bash
npm test          # testes unitários
npm run test:e2e  # testes de rotas (sem gravar dados no banco)
npm run lint      # análise estática
```

Os testes unitários usam um banco simulado. Os testes e2e exercitam apenas validação e autenticação, sem gravar nada no Supabase.

## Estrutura

```text
src/
  auth/            guard de JWT, revogação de tokens e decoradores
  common/          tratamento de erros, validação de arquivos e limite por usuária
  usuarias/        cadastro, login, logout e exclusão de conta
  guardioes/       CRUD das guardiãs
  ocorrencias/     ocorrências, evidências e análise de risco
  emergencias/     botão de emergência e rastreamento
supabase/          scripts SQL do banco
test/              testes e2e
```

## Segurança

- Autenticação por JWT com identificador por token (`jti`). O logout revoga o token.
- Limite de requisições por usuária autenticada. Login é limitado por IP e e-mail.
- Helmet ativo nos headers HTTP. CORS não é habilitado, porque ainda não há painel web.
- Evidências guardadas no Storage privado, com o nome original descartado.

## Serviço de IA

O backend chama `POST /classificar` no serviço de IA, enviando o histórico já resumido (sem nome, CPF ou localização textual) e o segredo `X-Internal-Secret`. Se o serviço estiver fora do ar, a ocorrência é registrada normalmente, mas a análise de risco daquela ocorrência não é refeita depois.
