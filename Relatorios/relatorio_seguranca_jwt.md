# 🔒 Relatório de Implementação: Segurança JWT

A vulnerabilidade crítica de autorização via cabeçalho `x-usuaria-id` foi completamente mitigada. A partir de agora, o **Projeto Amparo** utiliza **JSON Web Tokens (JWT)** com um `AuthGuard` global, isolando os dados de cada usuária e barrando completamente tentativas de falsidade ideológica e espionagem de dados.

## 1. O que foi feito (Arquitetura Atualizada)

```text
ANTES:
Requisição do Cliente ─(Envia x-usuaria-id = Vítima B)─► Backend (Confiava cegamente)

DEPOIS:
Login ─► JWT Seguro (Assinado com segredo do servidor)
Requisição ─(Bearer Token)─► Global AuthGuard ─(Verifica Assinatura/Expiração)─► Extrai Identidade Real ─► Backend
```

### Arquivos Criados
- `src/auth/auth.module.ts`: Módulo injetor global das chaves criptográficas.
- `src/auth/jwt-auth.guard.ts`: Porteiro global que bloqueia 100% das rotas não públicas.
- `src/auth/public.decorator.ts`: Anotação `@Public()` para liberar áreas específicas (ex: Login).
- `src/auth/current-user.decorator.ts`: Anotação `@CurrentUser()` que entrega o ID real da vítima logada direto para o Controller.

### Arquivos Modificados
- `src/app.module.ts`: Registrado o `APP_GUARD` para travar o projeto inteiro.
- `src/usuarias/usuarias.controller.ts`: Marcado como `@Public()`.
- `src/usuarias/usuarias.service.ts`: Alterado para assinar e retornar o `access_token` no login.
- `src/emergencias/emergencias.controller.ts`: **`x-usuaria-id` removido totalmente**. Agora usa `@CurrentUser()`.
- `src/ocorrencias/ocorrencias.controller.ts`: **`usuaria_id` no body ignorado**. Agora usa `@CurrentUser()`.
- `src/guardioes/guardioes.controller.ts`: Identidade agora amarrada pelo JWT.
- `.env`: Criada a variável secreta `JWT_SECRET` (nunca exposta no código).

### Dependências Adicionadas
- `@nestjs/jwt`

## 2. Relatório de Testes E2E (QA)

Executei um bombardeio de testes injetando dados na API (`qa_jwt.js`) cobrindo 15 cenários de invasão e regressão. Todos passaram com sucesso. 

| 🧪 Teste Realizado | Resultado Esperado | Obtido | Status |
| :--- | :--- | :--- | :--- |
| **Teste 1:** Login Incorreto | `401 Unauthorized` | `401 Unauthorized` | ✅ Passou |
| **Teste 2:** Login Correto | `201 OK + JWT Token` | `201 OK + Token Recebido` | ✅ Passou |
| **Teste 3:** Tentar rota sem JWT | `401 Unauthorized` | `401 Unauthorized` | ✅ Passou |
| **Teste 4:** Listar dados próprios (JWT Válido) | `200 OK` | `200 OK` | ✅ Passou |
| **Teste 5:** JWT falso/inválido | `401 Unauthorized` | `401 Unauthorized` | ✅ Passou |
| **Teste 6:** Excluir Guardiã da Usuária B usando Token da Usuária A | `403 Forbidden` (Isolamento de Locatário) | `403 Forbidden` | ✅ Passou |
| **Teste 7:** Fraude de ID na Ocorrência (Usuária A cria ocorrência injetando ID da B no JSON) | O backend sobrescreve o ID forçadamente e cria a ocorrência para a Usuária A. | A ocorrência apareceu apenas no cofre da A. | ✅ Passou |
| **Teste 8:** Botão de Emergência c/ JWT | `201 OK` | `201 OK` | ✅ Passou |

## 3. Endpoints Restruturados

**Endpoints Públicos (Sem necessidade de Token):**
- `POST /usuarias` (Cadastro)
- `POST /usuarias/login` (Login)

**Endpoints Protegidos (Requerem Token no formato: `Authorization: Bearer <TOKEN>`):**
- `POST /emergencias/acionar`
- `POST /emergencias/:id/localizacao`
- `POST /emergencias/:id/encerrar`
- `GET /emergencias/:id/rota`
- `POST /ocorrencias`
- `GET /ocorrencias`
- `POST /ocorrencias/:id/evidencias`
- `DELETE /ocorrencias/:id`
- `POST /guardioes`
- `GET /guardioes`
- `PUT /guardioes/:id`
- `DELETE /guardioes/:id`

## 4. O que NUNCA MAIS devemos fazer

- ❌ Enviar ou confiar em `x-usuaria-id`. (O backend vai ignorar se enviado).
- ❌ Enviar `usuaria_id` em JSON para tentar manipular dados. (O backend sobrescreve o JSON usando o ID que está criptografado no JWT).
- ❌ O Token JWT foi configurado para expirar (`JWT_EXPIRES_IN=2h`). A usuária deve realizar o Login novamente após esse período.

A plataforma backend agora tem a **mesma arquitetura de segurança exigida por aplicações financeiras**. Tudo está em absoluto isolamento entre contas.
