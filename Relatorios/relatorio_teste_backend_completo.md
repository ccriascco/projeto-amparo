# Relatório de teste completo do backend

**Data:** 05/10/2026 · **Escopo:** backend NestJS (fluxo completo da usuária) e integração com a IA de risco.

> **Atualização (mesma data):** as 10 pendências listadas abaixo foram implementadas, e os testes `it.failing` viraram testes normais. Situação atual: **131/131 testes e2e** (125 do fluxo completo), **110/110 unitários**, **0 pendentes**. A seção de risco também passa contra a IA real. Novidades: janela de 30 dias no risco, data da ocorrência, visualização e edição de ocorrência, PDF como evidência, link temporário de download, guardiã duplicada recusada, senha forte, risco por ocorrência e tokens revogados apagados junto com a conta. O restante deste documento descreve a primeira rodada.

## Resumo

| Item | Resultado |
|---|---|
| Testes e2e executados (inclui 6 do e2e básico) | **112** |
| Passaram | **102** |
| Pendentes (`it.failing`): funcionalidade pedida que não existe ou depende de decisão | **10** |
| Falharam na 1ª rodada | 2 (corrigidos) |
| Falhando agora | **0** |
| Testes unitários | 95/95 |
| TypeScript e lint | sem erros e sem avisos |
| Seção da IA rodada também com o **modelo real** (v3) | 14/14 conforme esperado |

## Como o teste foi feito (e o que ele não cobre)

**Não existe banco de teste**: o `.env` aponta só para o Supabase de produção, e o schema das tabelas não está versionado no repositório. Para cumprir a regra "nunca o banco de produção":

- A aplicação **real** sobe dentro do Jest (rotas, guards, validação, limite de requisições, Helmet e services, com a mesma configuração do `main.ts`).
- O Supabase é substituído por um **banco em memória** (`test/support/supabase-memoria.ts`) que reproduz as tabelas e as regras do banco: CPF e e-mail únicos, trigger da última guardiã, uma emergência ativa por usuária, exclusão em cascata das evidências e as funções `cadastrar_usuaria_com_guardioes` e `apagar_conta_usuaria`.
- **Toda a rede é bloqueada**: só o serviço de IA é atendido. Qualquer outro acesso falha o teste.
- A IA é simulada com a mesma regra do gabarito. Com `IA_REAL=1`, a seção de risco usa o serviço de IA real.

**Limite desta abordagem:** o banco em memória imita as regras do Postgres, mas não as executa. RLS, triggers, índices e funções SQL de verdade só são provados com um **banco de teste real** (recomendação 1). O tempo de resposta medido também não inclui a latência de rede até o Supabase.

## Falhas encontradas e corrigidas

| ID | Problema | Como reproduzir | Causa | Gravidade | Correção |
|---|---|---|---|---|---|
| S-06 | Os logs gravavam **nome e telefone completo das guardiãs** e a **mensagem de alerta com o link da localização exata** da usuária | Acionar a emergência ou chegar a risco alto e ler o log do servidor | Os logs de "envio" incluíam `nome_completo`, `telefone` e a `mensagem` | **Crítica** (dado pessoal sensível em log, LGPD) | O log mostra só o id da guardiã e os 4 últimos dígitos do telefone (`*******0001`). A mensagem com a localização não vai para o log (continua salva em `alertas_risco`) |
| I-08 | Se a IA respondia com erro (ex.: 500), **nada era registrado**: o risco simplesmente não era atualizado | Fazer a IA responder 500 e registrar uma ocorrência | O código só tratava `respostaIA.ok`, sem `else` | Média | Passa a registrar `Análise de risco indisponível: serviço de IA respondeu 500` |

Arquivos alterados: `src/emergencias/emergencias.service.ts`, `src/ocorrencias/ocorrencias.service.ts` e o novo `src/common/mascara.util.ts` (com teste).

Também extraí a configuração do app (Helmet e validação) do `main.ts` para `src/configurar-app.ts`, para os testes usarem exatamente a configuração de produção. Isso não muda o comportamento.

## Pendências que precisam da sua decisão

Estes testes descrevem o que foi pedido e ficam marcados como pendentes. Quando a funcionalidade existir, o Jest avisa para torná-los testes normais.

| ID | O que foi pedido | Situação atual | Gravidade | Por que não corrigi |
|---|---|---|---|---|
| X-05 | Exclusão de conta remove todos os dados ligados a ela (LGPD) | A tabela `tokens_revogados` guarda o `usuaria_id` mesmo após a exclusão, e não há limpeza dos tokens expirados | Média | Exige alterar a função SQL `apagar_conta_usuaria` no seu banco |
| I-11 | Recorrência = "2 ou mais ocorrências em 30 dias" | O código conta **todas** as ocorrências, desde que a última seja recente. Uma de 200 dias + uma de hoje já sobe o risco | Média | Muda a regra de risco. O modelo v3 foi treinado com a definição atual, então mudar exige retreinar |
| A-12 | A dona consegue ver/baixar a própria evidência | **Não existe rota de download**. O arquivo só é acessível pelo backend | Média | Funcionalidade nova (link temporário assinado) |
| O-07 | Registrar a data em que a violência aconteceu | Não existe campo de data: a data é sempre a do registro. Isso também afeta a recência usada pela IA | Média | Muda o modelo de dados e o cálculo de risco |
| O-09 / O-10 | Visualizar e editar uma ocorrência | Não existem `GET` nem `PUT /ocorrencias/:id` | Baixa | Funcionalidade nova. Editar uma prova também exige decidir se o histórico fica registrado |
| A-03 | Anexar documento (ex.: PDF de boletim ou laudo) | Só foto, áudio e vídeo são aceitos | Baixa | Decisão de produto |
| G-03 | Recusar guardiã duplicada | A mesma pessoa (mesmo telefone) pode ser cadastrada mais de uma vez | Baixa | Regra de negócio nova |
| C-07 | Recusar senha fraca | Só o tamanho mínimo (8) é exigido: `aaaaaaaa` e `12345678` são aceitas | Baixa | Regra de senha a definir |
| I-10 | Cada ocorrência recebe a própria classificação | O risco é **da usuária** (`usuarias.nivel_risco`), não de cada ocorrência | Baixa | Decisão de modelo de dados |

## Outros resultados importantes

- **Senhas:** salvas com bcrypt (custo 10). Nenhuma senha aparece em texto no banco.
- **Token:** validade de 2 h, com `jti`. Tokens expirados, forjados, sem `jti` ou revogados são recusados.
- **Isolamento:** em todas as tentativas, uma usuária não conseguiu ler, editar, excluir ou anexar nada da outra (403).
- **Injeção de SQL e scripts:** são gravados como texto literal, nada é executado, e as respostas são JSON. A proteção contra injeção de SQL de verdade vem do `supabase-js` (consultas parametrizadas) e só é provada num banco real.
- **Erros:** as respostas não trazem stack trace, nomes de tabelas nem mensagens internas do banco.
- **Botão de emergência (30 medições):** mínimo 1,5 ms, mediana 1,7 ms, p95 2,1 ms, máximo 2,6 ms. Isso mede **só o processamento do backend**. Em produção, some a latência até o Supabase, e o acionamento faz várias consultas.
- **Notificação das guardiãs:** continua **simulada** (só log). Os testes confirmam quem seria notificada, mas nenhuma mensagem real é enviada.

## Recomendações

1. **Criar um banco de teste** (outro projeto Supabase, ou Supabase local via Docker) com os scripts de `supabase/` e rodar estes mesmos testes contra ele, para provar RLS, triggers e funções SQL de verdade.
2. **Decidir as pendências** da tabela acima, começando por X-05 (LGPD) e I-11 (regra de risco).
3. **Medir o tempo do botão de emergência num ambiente real**, já que é a funcionalidade mais crítica.
4. **Configurar CI** para rodar `npm test` e `npm run test:e2e` a cada push.

## Como rodar de novo

```bash
cd amparo-backend
npm test             # unitários
npm run test:e2e     # e2e, incluindo o fluxo completo (banco em memória)
```

Para rodar a seção de risco com a IA real (serviço na porta 8000):

```bash
IA_REAL=1 npx jest --config ./test/jest-e2e.json test/fluxo-completo -t "5. Classificação"
```

## Tabela completa dos testes

| ID | Funcionalidade | Cenário e resultado esperado | Resultado obtido | Status |
|---|---|---|---|---|
| E2E | API (e2e básico) | rotas protegidas recusam requisição sem token (401) | Conforme esperado | ✅ Passou |
| E2E | API (e2e básico) | rotas protegidas recusam token forjado (401) | Conforme esperado | ✅ Passou |
| E2E | API (e2e básico) | cadastro com corpo vazio é recusado (400) | Conforme esperado | ✅ Passou |
| E2E | API (e2e básico) | cadastro com campo extra não permitido é recusado (400) | Conforme esperado | ✅ Passou |
| E2E | API (e2e básico) | login com e-mail inválido é recusado (400) | Conforme esperado | ✅ Passou |
| E2E | API (e2e básico) | autenticação tem prioridade sobre validação do payload (401) | Conforme esperado | ✅ Passou |
| C-01 | Cadastro | cadastro com dados válidos cria a usuária e a guardiã | Conforme esperado | ✅ Passou |
| C-02 | Cadastro | senha e senha de disfarce são salvas com bcrypt, nunca em texto puro | Conforme esperado | ✅ Passou |
| C-03 | Cadastro | cadastro com corpo vazio é recusado (400) | Conforme esperado | ✅ Passou |
| C-04 | Cadastro | cadastro com campos obrigatórios em branco é recusado (400) | Conforme esperado | ✅ Passou |
| C-05 | Cadastro | e-mail inválido é recusado (400) | Conforme esperado | ✅ Passou |
| C-06 | Cadastro | senha com menos de 8 caracteres é recusada (400) | Conforme esperado | ✅ Passou |
| C-07 | Cadastro | senha fraca com 8+ caracteres (ex.: "aaaaaaaa", "12345678") é recusada | Comportamento atual difere do pedido | ⏳ Pendente (não implementado / decisão) |
| C-08 | Cadastro | e-mail já cadastrado é recusado com 409 e mensagem genérica | Conforme esperado | ✅ Passou |
| C-09 | Cadastro | CPF já cadastrado (mesmo com máscara diferente) é recusado com 409 | Conforme esperado | ✅ Passou |
| C-10 | Cadastro | campo não permitido no cadastro (ex.: nivel_risco) é recusado (400) | Conforme esperado | ✅ Passou |
| L-01 | Login e token | login com dados corretos gera token com jti e validade de 2h | Conforme esperado | ✅ Passou |
| L-02 | Login e token | login com senha errada responde 401 com mensagem genérica | Conforme esperado | ✅ Passou |
| L-03 | Login e token | login de usuária inexistente responde igual à senha errada (não revela cadastro) | Conforme esperado | ✅ Passou |
| L-04 | Login e token | rota protegida sem token responde 401 | Conforme esperado | ✅ Passou |
| L-05 | Login e token | rota protegida com token malformado responde 401 | Conforme esperado | ✅ Passou |
| L-06 | Login e token | token expirado é recusado (401) | Conforme esperado | ✅ Passou |
| L-07 | Login e token | token assinado com outro segredo é recusado (401) | Conforme esperado | ✅ Passou |
| L-08 | Login e token | token sem jti (formato antigo) é recusado (401) | Conforme esperado | ✅ Passou |
| L-09 | Login e token | login disfarçado aceita a senha de disfarce e recusa a senha real | Conforme esperado | ✅ Passou |
| L-10 | Login e token | 11ª tentativa de login em 1 minuto é bloqueada (429) | Conforme esperado | ✅ Passou |
| O-01 | Ocorrências | cria ocorrência com todos os campos válidos e persiste | Conforme esperado | ✅ Passou |
| O-02 | Ocorrências | tipo de violência "Física" é salvo corretamente | Conforme esperado | ✅ Passou |
| O-02 | Ocorrências | tipo de violência "Psicológica" é salvo corretamente | Conforme esperado | ✅ Passou |
| O-02 | Ocorrências | tipo de violência "Sexual" é salvo corretamente | Conforme esperado | ✅ Passou |
| O-02 | Ocorrências | tipo de violência "Patrimonial" é salvo corretamente | Conforme esperado | ✅ Passou |
| O-02 | Ocorrências | tipo de violência "Moral" é salvo corretamente | Conforme esperado | ✅ Passou |
| O-02 | Ocorrências | tipo de violência "Ameaça" é salvo corretamente | Conforme esperado | ✅ Passou |
| O-03 | Ocorrências | tipo de violência inexistente é recusado (400) | Conforme esperado | ✅ Passou |
| O-04 | Ocorrências | ocorrência sem tipo de violência (vazio ou ausente) é recusada (400) | Conforme esperado | ✅ Passou |
| O-05 | Ocorrências | coordenadas inválidas e mensagem acima de 2.000 caracteres são recusadas (400) | Conforme esperado | ✅ Passou |
| O-06 | Ocorrências | campo de data não existe: data enviada (válida ou inválida) é recusada (400) | Conforme esperado | ✅ Passou |
| O-07 | Ocorrências | permite registrar ocorrência com data passada (quando aconteceu) | Comportamento atual difere do pedido | ⏳ Pendente (não implementado / decisão) |
| O-08 | Ocorrências | listagem traz só as ocorrências da usuária, paginadas, com total | Conforme esperado | ✅ Passou |
| O-09 | Ocorrências | visualiza uma ocorrência específica (GET /ocorrencias/:id) | Comportamento atual difere do pedido | ⏳ Pendente (não implementado / decisão) |
| O-10 | Ocorrências | edita uma ocorrência (PUT /ocorrencias/:id) | Comportamento atual difere do pedido | ⏳ Pendente (não implementado / decisão) |
| O-11 | Ocorrências | exclui a própria ocorrência | Conforme esperado | ✅ Passou |
| O-12 | Ocorrências | usuária B não vê nem exclui ocorrência da usuária A | Conforme esperado | ✅ Passou |
| O-13 | Ocorrências | usuaria_id de outra usuária enviado no corpo é recusado (400) e nada é gravado na conta dela | Conforme esperado | ✅ Passou |
| O-14 | Ocorrências | ocorrência idêntica reenviada em seguida é recusada (409) | Conforme esperado | ✅ Passou |
| A-01 | Anexos | anexa imagem JPEG, vincula à ocorrência certa e guarda com hash | Conforme esperado | ✅ Passou |
| A-01 | Anexos | anexa imagem PNG, vincula à ocorrência certa e guarda com hash | Conforme esperado | ✅ Passou |
| A-01 | Anexos | anexa áudio MP3, vincula à ocorrência certa e guarda com hash | Conforme esperado | ✅ Passou |
| A-01 | Anexos | anexa vídeo MP4, vincula à ocorrência certa e guarda com hash | Conforme esperado | ✅ Passou |
| A-02 | Anexos | documento PDF não é aceito (formato fora da lista permitida) (415) | Conforme esperado | ✅ Passou |
| A-03 | Anexos | aceita documento (ex.: PDF de boletim de ocorrência ou laudo) | Comportamento atual difere do pedido | ⏳ Pendente (não implementado / decisão) |
| A-04 | Anexos | executável é recusado (415) | Conforme esperado | ✅ Passou |
| A-05 | Anexos | foto acima de 5 MB é recusada (413) | Conforme esperado | ✅ Passou |
| A-06 | Anexos | arquivo acima do limite geral de 20 MB é recusado (413) | Conforme esperado | ✅ Passou |
| A-07 | Anexos | arquivo vazio é recusado e nada é gravado | Conforme esperado | ✅ Passou |
| A-08 | Anexos | executável renomeado para .jpg é recusado (415) | Conforme esperado | ✅ Passou |
| A-09 | Anexos | nome original é descartado (sem path traversal no armazenamento) | Conforme esperado | ✅ Passou |
| A-10 | Anexos | usuária B não anexa arquivo em ocorrência da A (403) e nada é gravado | Conforme esperado | ✅ Passou |
| A-11 | Anexos | metadados dos anexos só aparecem para a dona | Conforme esperado | ✅ Passou |
| A-12 | Anexos | a dona consegue baixar/visualizar a evidência (link temporário) | Comportamento atual difere do pedido | ⏳ Pendente (não implementado / decisão) |
| A-13 | Anexos | excluir a ocorrência remove os anexos do banco e do armazenamento | Conforme esperado | ✅ Passou |
| E-01 | Emergência | acionamento cria registro ATIVO com data/hora e localização | Conforme esperado | ✅ Passou |
| E-02 | Emergência | todas as guardiãs cadastradas são notificadas | Conforme esperado | ✅ Passou |
| E-03 | Emergência | acionamento sem localização é aceito e não cria ponto de GPS | Conforme esperado | ✅ Passou |
| E-04 | Emergência | usuária sem guardiãs (dado legado) aciona e recebe status de alerta sem destinatário | Conforme esperado | ✅ Passou |
| E-05 | Emergência | cinco acionamentos simultâneos geram 1 emergência e 4 recusas (409) | Conforme esperado | ✅ Passou |
| E-06 | Emergência | acionamentos seguidos: o segundo é recusado; após encerrar, um novo é aceito | Conforme esperado | ✅ Passou |
| E-07 | Emergência | rastreamento: atualiza localização e lista a rota em ordem | Conforme esperado | ✅ Passou |
| E-08 | Emergência | usuária B não aciona em nome da A, nem lê ou altera a emergência da A | Conforme esperado | ✅ Passou |
| E-09 | Emergência | tempo de resposta do acionamento (30 medições, backend + banco em memória) | Conforme esperado | ✅ Passou |
| I-01 | IA / risco | cada ocorrência dispara a classificação, com o segredo e as variáveis corretas | Conforme esperado | ✅ Passou |
| I-02 | IA / risco | uma ofensa moral resulta em risco Baixo | Conforme esperado | ✅ Passou |
| I-02 | IA / risco | uma ameaça resulta em risco Medio | Conforme esperado | ✅ Passou |
| I-02 | IA / risco | uma agressão física resulta em risco Alto | Conforme esperado | ✅ Passou |
| I-02 | IA / risco | uma violência sexual resulta em risco Alto | Conforme esperado | ✅ Passou |
| I-03 | IA / risco | o risco sobe com a recorrência (leve → leve recorrente) | Conforme esperado | ✅ Passou |
| I-04 | IA / risco | acionamento válido do botão eleva o risco de uma ocorrência leve recente para Alto | Conforme esperado | ✅ Passou |
| I-05 | IA / risco | acionamento por engano (encerrado em até 30 s) não eleva o risco | Conforme esperado | ✅ Passou |
| I-06 | IA / risco | ocorrência antiga entra na contagem total enviada à IA | Conforme esperado | ✅ Passou |
| I-11 | IA / risco | ocorrência de 200 dias atrás não conta como recorrência (regra: 2+ ocorrências em 30 dias) | Comportamento atual difere do pedido | ⏳ Pendente (não implementado / decisão) |
| I-07 | IA / risco | ao chegar em risco Alto, registra alerta para as guardiãs com horário | Conforme esperado | ✅ Passou |
| I-08 | IA / risco | se a IA responde erro 500, a ocorrência é salva e o erro é registrado no log | Conforme esperado após a correção | ✅ Passou (falhou na 1ª rodada, corrigido) |
| I-08 | IA / risco | se a IA está fora do ar (erro de rede), a ocorrência é salva e o erro é registrado no log | Conforme esperado após a correção | ✅ Passou (falhou na 1ª rodada, corrigido) |
| I-09 | IA / risco | se a IA demorar, a resposta não espera e o timeout (5 s) é registrado | Conforme esperado | ✅ Passou |
| I-10 | IA / risco | cada ocorrência guarda a própria classificação de risco | Comportamento atual difere do pedido | ⏳ Pendente (não implementado / decisão) |
| G-01 | Guardiãs | adiciona guardiã válida vinculada à usuária | Conforme esperado | ✅ Passou |
| G-02 | Guardiãs | dados inválidos (telefone curto) são recusados (400) | Conforme esperado | ✅ Passou |
| G-02 | Guardiãs | dados inválidos (nome com 1 letra) são recusados (400) | Conforme esperado | ✅ Passou |
| G-02 | Guardiãs | dados inválidos (e-mail inválido) são recusados (400) | Conforme esperado | ✅ Passou |
| G-02 | Guardiãs | dados inválidos (sem telefone) são recusados (400) | Conforme esperado | ✅ Passou |
| G-02 | Guardiãs | dados inválidos (campo extra) são recusados (400) | Conforme esperado | ✅ Passou |
| G-03 | Guardiãs | guardiã duplicada (mesmo telefone) é recusada | Comportamento atual difere do pedido | ⏳ Pendente (não implementado / decisão) |
| G-04 | Guardiãs | a 6ª guardiã é recusada (limite de 5) | Conforme esperado | ✅ Passou |
| G-05 | Guardiãs | guardiã excluída deixa de receber alertas; a nova passa a receber | Conforme esperado | ✅ Passou |
| G-06 | Guardiãs | não é possível excluir a última guardiã (403) | Conforme esperado | ✅ Passou |
| G-07 | Guardiãs | usuária B não lista, edita nem exclui guardiã da A | Conforme esperado | ✅ Passou |
| LO-01 | Logout | após o logout o token não pode mais ser usado | Conforme esperado | ✅ Passou |
| LO-02 | Logout | logout encerra só a sessão atual: outro login da mesma usuária continua válido | Conforme esperado | ✅ Passou |
| X-01 | Exclusão de conta | senha errada não exclui nada (401) | Conforme esperado | ✅ Passou |
| X-02 | Exclusão de conta | exclusão remove usuária, guardiãs, ocorrências, anexos, emergências, rastreamento e alertas | Conforme esperado | ✅ Passou |
| X-03 | Exclusão de conta | após excluir, o token e o login da conta deixam de funcionar | Conforme esperado | ✅ Passou |
| X-04 | Exclusão de conta | excluir uma conta não afeta os dados de outra usuária | Conforme esperado | ✅ Passou |
| X-05 | Exclusão de conta | exclusão não mantém o identificador da usuária em tokens revogados | Comportamento atual difere do pedido | ⏳ Pendente (não implementado / decisão) |
| S-01 | Segurança | texto malicioso "'; DROP TABLE usuarias; --" é tratado como texto literal | Conforme esperado | ✅ Passou |
| S-01 | Segurança | texto malicioso "' OR '1'='1" é tratado como texto literal | Conforme esperado | ✅ Passou |
| S-01 | Segurança | texto malicioso "<script>alert(document.cookie)</script>" é tratado como texto literal | Conforme esperado | ✅ Passou |
| S-01 | Segurança | texto malicioso "\"><img src=x onerror=alert(1)>" é tratado como texto literal | Conforme esperado | ✅ Passou |
| S-02 | Segurança | injeção no login não autentica | Conforme esperado | ✅ Passou |
| S-03 | Segurança | respostas trazem headers de segurança (Helmet) | Conforme esperado | ✅ Passou |
| S-04 | Segurança | falha interna do banco não expõe detalhes na resposta | Conforme esperado | ✅ Passou |
| S-05 | Segurança | JSON malformado e rota inexistente não expõem stack trace | Conforme esperado | ✅ Passou |
| S-06 | Segurança | logs do fluxo completo não contêm dados pessoais | Conforme esperado após a correção | ✅ Passou (falhou na 1ª rodada, corrigido) |
