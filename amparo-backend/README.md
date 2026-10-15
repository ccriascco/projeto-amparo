# Amparo — Backend

API do aplicativo Amparo, que ajuda mulheres em situação de violência a registrar ocorrências, manter uma rede de guardiãs, acionar um botão de emergência e receber uma classificação de risco feita por inteligência artificial.

Feito com [NestJS](https://nestjs.com), [Supabase](https://supabase.com) (PostgreSQL e Storage) e autenticação própria com JWT.

## Funcionalidades

- **Usuárias:** cadastro com CPF validado (dígitos verificadores) por e-mail e senha ou pelo Google, sessão do aparelho (o app reabre sem nova senha; com o Modo Disfarce ligado, só com o código de 4 números), perfil, troca de senha e de código, logout com revogação e exclusão da conta.
- **Guardiãs:** de 1 a 5 por usuária. A última guardiã não pode ser removida enquanto a conta existir. Cada guardiã recebe um convite com link e o status fica "Aguardando" até ela confirmar.
- **Ocorrências:** registro com tipos de violência, upload de evidências (foto, vídeo ou áudio) com verificação do conteúdo real do arquivo, e listagem paginada.
- **Botão de emergência:** acionamento com aviso simulado às guardiãs (cada uma recebe um link para ver a localização e confirmar que viu), rastreamento de localização e encerramento. Acionamentos por engano (até 30 s) não contam para o risco.
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
GOOGLE_CLIENT_IDS=id-android.apps.googleusercontent.com,id-ios.apps.googleusercontent.com,id-web.apps.googleusercontent.com
URL_PUBLICA=https://api.seu-dominio.com.br
MOSTRAR_LINKS_SIMULADOS=0
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
| `GOOGLE_CLIENT_IDS` | IDs de cliente OAuth do Google aceitos no login (separados por vírgula). Sem eles, o login com Google responde `503` |
| `URL_PUBLICA` | Endereço público da API, usado nos links de convite e de pedido de ajuda enviados às guardiãs |
| `MOSTRAR_LINKS_SIMULADOS` | `1` mostra no log os links das mensagens simuladas (só fora de produção, para testar a confirmação) |

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
| `POST` | `/usuarias/login-google` | Login com o `id_token` do Google (público). Sem conta: `404` com `precisa_cadastro` |
| `POST` | `/usuarias/sessao/renovar` | Reabre a sessão do aparelho com o `refresh_token` (e o `codigo` quando o Modo Disfarce está ligado) (público) |
| `POST` | `/usuarias/logout` | Revoga o token atual e encerra a sessão do aparelho |
| `GET` | `/usuarias/me` | Perfil, nível de risco e CPF mascarado |
| `PATCH` | `/usuarias/me` | Altera nome, telefone, e-mail e o Modo Disfarce |
| `PUT` | `/usuarias/me/senha` | Troca a senha (desconecta os outros aparelhos) |
| `PUT` | `/usuarias/me/codigo` | Troca o código de 4 números do Modo Disfarce |
| `DELETE` | `/usuarias/me` | Exclui a conta (exige a senha, ou o Google em contas sem senha) |
| `POST` | `/guardioes` | Cadastra uma guardiã |
| `GET` | `/guardioes` | Lista as guardiãs da usuária |
| `PUT` | `/guardioes/:id` | Edita uma guardiã |
| `POST` | `/guardioes/:id/convite` | Reenvia o convite (o link anterior deixa de valer) |
| `DELETE` | `/guardioes/:id` | Remove uma guardiã |
| `POST` | `/ocorrencias` | Registra uma ocorrência |
| `GET` | `/ocorrencias?limit=&offset=` | Lista as ocorrências (paginação: padrão 20, máximo 100) |
| `GET` | `/ocorrencias/:id` | Detalhe da ocorrência, com os anexos |
| `PUT` | `/ocorrencias/:id` | Edita tipos, relato, data e localização (recalcula o risco) |
| `GET` | `/ocorrencias/:id/evidencias/:evidenciaId` | Link temporário (5 min) para baixar a evidência |
| `POST` | `/ocorrencias/:id/evidencias` | Anexa uma evidência (multipart, campo `arquivo`) |
| `DELETE` | `/ocorrencias/:id` | Remove a ocorrência e seus arquivos |
| `POST` | `/emergencias/acionar` | Aciona o botão de emergência |
| `GET` | `/emergencias/ativa` | Emergência ativa, se houver, com os avisos às guardiãs |
| `GET` | `/emergencias/:id` | Emergência e "Quem foi avisada" (confirmou ou aguardando) |
| `POST` | `/emergencias/:id/localizacao` | Registra um ponto de localização |
| `POST` | `/emergencias/:id/encerrar` | Encerra a emergência |
| `GET` | `/emergencias/:id/rota` | Histórico de localização da emergência |
| `GET` | `/` | Verificação de conexão com o banco |
| `GET` `POST` | `/convites/:token`, `/convites/:token/confirmar` | Página da guardiã para aceitar o convite (público) |
| `GET` `POST` | `/alertas/:token`, `/alertas/:token/confirmar` | Página do pedido de ajuda: localização enquanto ativo e confirmação (público) |

### Regras principais

- Cadastro exige de 1 a 5 guardiãs (sem repetir telefone), CPF válido e senha forte: no mínimo 8 caracteres, com maiúscula, número e caractere especial, sem sequência nem senha comum. Pelo Google, a senha é dispensada.
- O Modo Disfarce usa um código de exatamente 4 números, guardado com hash. Ele só destrava a sessão que já existe naquele aparelho: 5 códigos errados seguidos encerram a sessão, e aí é preciso entrar com e-mail e senha (ou Google).
- O risco considera só ocorrências e acionamentos válidos dos últimos 30 dias. Cada ocorrência guarda o risco calculado quando foi registrada ou editada.
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
6. `janela_30_dias_e_lgpd.sql`: colunas `data_ocorrencia`, `nivel_risco` e `atualizado_em` em ocorrências, PDF como evidência e exclusão dos tokens revogados junto com a conta.
7. `app_mobile_sessoes_google_convites.sql`: código do disfarce, Google, sessões do aparelho, convite das guardiãs, avisos de emergência e as funções de cadastro e exclusão atualizadas.

Além dos scripts, o bucket de Storage `evidencias_amparo` deve existir e ser **privado**, sem políticas liberando acesso para `anon` ou `public`.

## Testes

```bash
npm test          # testes unitários
npm run test:e2e  # testes de rotas (sem gravar dados no banco)
npm run lint      # análise estática
npm run demo      # servidor de demonstração: banco em memória, IA simulada, conta fictícia
```

Os testes unitários (141) usam um banco simulado. Os testes e2e (155) sobem a aplicação inteira sobre um banco em memória que reproduz as regras do banco, com a rede bloqueada: nunca gravam nada no Supabase.

O `npm run demo` sobe a mesma aplicação sobre esse banco em memória, para desenvolver e testar o app mobile sem usar o banco de produção. A conta fictícia criada ao iniciar está em `test/servidor-memoria.ts`; os dados somem quando o processo termina. Com `IA_REAL=1`, a IA real é usada no lugar da simulada.

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
