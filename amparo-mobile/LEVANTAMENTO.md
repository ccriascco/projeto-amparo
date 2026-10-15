# Amparo Mobile — Etapa 1: Levantamento

Fonte do design: `amparo-mobile/Design.html` (export do Claude Design "Projeto Amparo Telas", arquivo `Protótipo Amparo.dc.html`).
O arquivo é um bundle: telas e lógica do protótipo, 4 componentes do design system (Button, Input, Icon, StepProgress, mais Card e SOSButton), 3 componentes de tela (AppHeader, AppNav, ScreenTitle), 8 fontes, 7 imagens e 58 ícones SVG (Lucide).

Backend e IA: código atual de `amparo-backend` (NestJS) e `amparo-ia` (FastAPI), commit `00be680`.

---

## 1. Telas, estados e navegação

Tamanho de referência do protótipo: 402 × 874 (iPhone 16 Pro), cantos de tela de 48 px.

| # | Tela (id no protótipo) | Conteúdo | Estados no design |
|---|---|---|---|
| 1 | Abertura (`abertura`) | Carrossel de 4 slides com foto (612 px), título, subtítulo, bolinhas, "Criar Conta" e "Já tenho Conta". Toque na lateral direita avança. | 4 slides |
| 2 | Login (`login`) | Fundo em gradiente, logo, e-mail, senha, "Fazer Login", "Esqueceu a Senha?", "Ainda não tem conta?", botões Apple e Google | inicial, erro (e-mail inválido, senha incorreta) |
| 3 | Cadastro (`cadastro`, 8 etapas) | 1 nome, nascimento, telefone · 2 CPF · 3 e-mail · 4 senha com checklist · 5 permissão de localização · 6 notificações e câmera · 7 escolha do Modo Disfarce · 7b código de 4 dígitos · 8 guardiãs (1 a 5, nome e telefone) | barra de progresso, CTA desabilitado no PIN, PIN divergente, PIN ok, "Agora Não" nas etapas 5 e 6 |
| 4 | Início (`home`) | Header "Olá, nome", barras dos últimos 7 dias, SOS, ações rápidas (carrossel), card de risco, guias (carrossel), nav flutuante | risco baixo, médio, alto (alto mostra "Ajuda mais perto de você"); sheet de informação; sheet de delegacias |
| 5 | Alerta enviado (`enviado`) | Confirmação, mapa, "Quem foi avisada", "Sair rápido", "Cancelar aviso" | único |
| 6 | Rede de apoio (`rede`) | Lista de guardiãs (nome, relação, atividade, status), "Adicionar guardião", FAQ em carrossel, "Por que ter uma rede importa" | lista, rede cheia (5), sheet de FAQ |
| 7 | Adicionar/editar guardiã (`guardiao`) | Nome, telefone, relação (Amigos/Família), guardiã principal, salvar, remover | adicionar, editar |
| 8 | Ocorrências (`doc`) | Contador, "Registrar nova ocorrência", FAQ, últimos 3 registros, "Ver mais", "Por que registrar" | sheet de FAQ |
| 9 | Todos os registros (`listaocorr`) | Filtro por data (Todos, Esta semana, Este mês, Mais antigas) e lista | menu de filtro aberto |
| 10 | Resumo da ocorrência (`resumoocorr`) | Tipos de violência, relato, mídias (fotos, vídeo, áudio com player), data e hora | com mídia, sem mídia, foto em tela cheia |
| 11 | Nova ocorrência (`ocorrviolencia`) | Tipos de violência (grade), relato, anexos, "Salvar ocorrência" | CTA desabilitado sem tipo, lista de anexos |
| 12 | Tipo de prova (`ocorrtipo`) | Foto, Áudio, Vídeo, Texto | **sem entrada no protótipo** (fluxo alternativo) |
| 13 | Captura de foto/vídeo (`capcamera`) | Câmera, miniaturas, disparo, "Pronto" | foto, vídeo |
| 14 | Gravação de áudio (`capaudio`) | Ondas animadas, cronômetro, parar | gravando |
| 15 | Relato em texto (`captexto`) | Textarea, "Continuar" | único |
| 16 | Guardar ocorrência (`ocorrconfirmar`) | Mensagem opcional, data/hora e local automáticos | único |
| 17 | Detalhe da prova (`prova`) | "Guardado com segurança", "Prova verificada" com hash | verificada |
| 18 | Mais (`mais`) | Minha Conta, Conteúdo e Direitos, Configurações de Segurança | único |
| 19 | Minha Conta (`conta`) | Nome, nascimento, telefone, e-mail, CPF mascarado "Verificado", alterar senha, salvar, aparência (claro/escuro/automático), sair | único |
| 20 | Alterar senha (`trocasenha`) | Senha atual, nova, confirmação, checklist | único |
| 21 | Configurações de segurança (`seguranca`) | Modo Disfarce (toggle), código de desbloqueio, permissões (localização, notificações, câmera), salvar | toggles |
| 22 | Alterar código (`trococodigo`) | Código atual, novo, confirmação (4 dígitos) | atual errado, divergente, ok |
| 23 | Conteúdo e direitos (`conteudo`) | 4 artigos | único |
| 24 | Artigo (`artigo`) | Texto e fonte | único |
| 25 | Modo Disfarce (`disfarce`) | Calculadora funcional estilo iOS; código + "=" abre o app | único |
| 26 | Multitarefas (`switcher`) | Demonstra o que o sistema mostra ao minimizar (a calculadora) | não é uma tela do app, é um comportamento |
| — | Em breve (`embreve`) | Placeholder do protótipo | **não será implementada** |

### Fluxo de navegação

```text
Abertura ─┬─ Criar Conta ─ Cadastro 1..8 ─ Início
          └─ Já tenho Conta ─ Login ─ Início

Nav flutuante (4 abas):  Início · Ocorrências · Rede · Mais
Header (todas as telas internas):  sino → Rede · calculadora → Modo Disfarce · engrenagem → Mais

Início ─ SOS (segurar) ─ Alerta enviado ─ Cancelar aviso / Sair rápido ─ Início
       ─ Ações rápidas: Registrar prova → Nova ocorrência · Adicionar guardião · Ver ocorrências
                        · Delegacias (sheet) · Ativar/Desativar Modo Disfarce
       ─ Guias → sheet de informação · "Ver como chegamos nisso" → sheet da classificação

Ocorrências ─ Registrar nova ─ Nova ocorrência ─ Salvar ─ Resumo
            ─ Últimos registros / Ver mais (Todos os registros) ─ Resumo ─ foto em tela cheia

Rede ─ card da guardiã → Editar guardiã · Adicionar guardião

Mais ─ Minha Conta ─ Alterar senha · Sair da conta → Abertura
     ─ Conteúdo e direitos ─ Artigo
     ─ Configurações de segurança ─ Alterar código

Modo Disfarce: calculadora ─ código + "=" ─ Início
```

### Componentes identificados

Do design system: `Button` (primary, secondary, confirm; estados default, hover, pressed, disabled; tamanho compacto), `Input` (rótulo, erro, nota, desabilitado, sobre fundo escuro), `Icon` (Lucide, traço 2 px), `StepProgress`, `Card`, `SOSButton`.

De tela: `AppHeader` (modo home ou tela; botão fechar no topo; título com voltar ou fechar; ações sino, calculadora e engrenagem), `AppNav` (pílula flutuante de 4 abas que fica compacta ao rolar), `ScreenTitle` (voltar ou fechar).

Padrões repetidos que viram componentes: círculo de ícone (40 e 72 px), nota com cadeado, bottom sheet, card de seleção com rádio, card alternável (tipos), switch, entrada de PIN de 4 casas, carrossel horizontal com pontos, item de ocorrência, player de áudio/vídeo, visualizador de foto, teclado da calculadora, menu de filtro, barras da semana, item de guardiã com status, degradê inferior atrás da nav.

### Estados que o design não desenha

O design não tem estados de **carregando**, **lista vazia** nem **erro de rede** (só o erro do login e os erros do PIN). Vou criá-los no mesmo estilo (card com círculo de ícone, nota em vinho-profundo) e registrar cada decisão na lista de diferenças.

---

## 2. Design tokens

Serão centralizados em `src/theme/` (um `tokens.ts` com claro e escuro). Valores tirados do design:

**Cores (claro → escuro)**

| Token | Claro | Escuro |
|---|---|---|
| vinho-amparo (acento, primária) | `#954B6E` | `#B36A8C` |
| vinho-hover / pressed | `#84415F` / `#733851` | `#C27C9C` / `#9C577A` |
| vinho-profundo (notas) | `#4B2A3F` | `#A79CA3` |
| alerta-sos | `#C62828` (pressed `#A72020`) | igual |
| tela | `#FFFFFF` | `#1C1620` |
| palco / off-white | `#FCFBFA` | `#120E14` |
| card | `#FFFFFF` | `#26202B` |
| texto | `#1A1A1A` | `#FFFFFF` |
| texto suave | `rgba(26,26,26,0.8)` | `#A79CA3` |
| texto secundário | `#8A8A8E` | `#A79CA3` |
| malva-suave (desabilitado) | `#EDE3E8` | `#322A36` |
| verde (confirmação) | `#5BA37F` (texto `#3F7F63`) | `#2E7D6B` (texto `#7CCFB4`) |
| sair/excluir | `#A85C5C` | `#E08A8A` |
| bordas vinho 04/08/10/15/20/40/60 | `rgba(149,75,110, α)` | `rgba(255,255,255, 0.05–0.22)` |
| gradiente do header | `#954B6E → #4B2A3F` (horizontal) | igual |
| gradiente do login | `#954B6E → #4B2A3F` (90°) | igual |
| overlay de sheet | `rgba(75,42,63,0.45)` | igual |
| calculadora | fundo `#000`, teclas `#333333`, `#A5A5A5`, `#FF9F0A` | igual |

**Tipografia:** Quicksand 700 (hero, 25–31 px) e Nunito Sans 300/400/500/600/700. Escala: 39 (SOS), 31, 25, 22, 20, 18, 16, 14, 12. Altura de linha 1.2 (títulos), 1.4 (corpo), 1.5–1.6 (textos longos). Notas: 12 px, peso 300, tracking −0.24.

**Espaçamento:** 4, 8, 12, 16, 24, 32, 40, 48, 64, 80. Margem lateral das telas 32 px (cadastro e login 32, padrão do DS 24). Área de toque mínima 44 px.

**Raios:** pílula 999, card 12, card de guia 20, campo de texto 16, casa do PIN 14, sheet 32, header 0 0 16 16, tela 48.

**Sombras:** card `2px 2px 4px rgba(0,0,0,0.04)` (nenhuma no escuro); sheet `0 -8px 16px rgba(0,0,0,0.1)`; nav `2px 2px 8px rgba(0,0,0,0.04)`.

**Ícones:** Lucide (`lucide-react-native`), 16 a 40 px. Nomes usados: lock, x, map-pin, bell, camera, shield-check, plus, triangle-alert, life-buoy, navigation, map, check, refresh-cw, file-text, calendar, clock, notebook-pen, sliders-horizontal, chevron-down, chevron-right, image, play, pause, lock-keyhole, user-round, user-round-plus, book-open, folder-lock, calculator, circle-alert, send, heart, users-round, heart-handshake, scale, eye-off, trash-2, key-round, file-check, radar, heart-crack, hand, brain, shield-alert, wallet, mic, video, paperclip, pen-line, sun, moon, smartphone. Os ícones da nav e do header são SVGs próprios (casa, documento, escudo com +, pessoa, sino, calculadora, engrenagem) e serão copiados como estão.

**Animações:** easing `cubic-bezier(0.4,0,0.2,1)` e `cubic-bezier(0.16,1,0.3,1)`; durações 120, 200, 240 (nav), 320 (sheet), 2000 ms (pulso do SOS); ondas do áudio 1,1 s; entrada `fade-up` de 8 px; botão pressionado em escala 0,98.

**Breakpoints:** não há. O design é só mobile em 402 px. A largura vai ser fluida, com as margens de 32 px e conteúdo limitado em telas grandes (tablet).

**Imagens:** 4 fotos do carrossel, logo (157 × 50), prévia de mapa, foto de perfil de exemplo (não será usada).

---

## 3. Tela/funcionalidade → backend

Base: `EXPO_PUBLIC_API_URL`. Todas as rotas exigem `Authorization: Bearer <token>`, exceto as públicas. O app **nunca** chama a IA: quem chama é o backend, com o segredo interno.

| Tela / funcionalidade | Endpoint | Método | Payload | Resposta |
|---|---|---|---|---|
| Cadastro (envio na etapa 8) | `/usuarias` (público, 5/min) | POST | `cpf, email, telefone, nome_completo, data_nascimento (AAAA-MM-DD), senha, senha_app, modo_disfarcado?, guardioes[1..5]{nome_completo, telefone, email?, parentesco_relacao?}` | `201 {mensagem, usuaria_id}` · 400 validação · 409 CPF/e-mail já usados |
| Login | `/usuarias/login` (público, 10/min) | POST | `email, senha` | `{mensagem, access_token, usuaria{id, nome_completo, email, modo_disfarcado}}` · 401 |
| Login pela senha de disfarce | `/usuarias/login-disfarcado` | POST | `email, senha` (= senha_app) | igual ao login |
| Sair da conta | `/usuarias/logout` | POST | — | `{mensagem}` (token revogado) |
| Excluir conta | `/usuarias/me` | DELETE | `senha` | `{mensagem}` |
| Rede: listar | `/guardioes` | GET | — | lista de guardiãs (`id, nome_completo, telefone, email, parentesco_relacao, …`) |
| Adicionar guardiã | `/guardioes` | POST | `nome_completo, telefone, email?, parentesco_relacao?` | guardiã criada · 409 telefone repetido · 400 acima de 5 |
| Editar guardiã | `/guardioes/:id` | PUT | campos opcionais acima | guardiã atualizada |
| Remover guardiã | `/guardioes/:id` | DELETE | — | 403 se for a última |
| Ocorrências / Todos os registros / Início (barras e contador) | `/ocorrencias?limit&offset` | GET | — | lista paginada com `evidencias(*)`, `nivel_risco`, `data_ocorrencia`, `criado_em` |
| Resumo da ocorrência | `/ocorrencias/:id` | GET | — | ocorrência com anexos |
| Nova ocorrência | `/ocorrencias` | POST | `tipos_violencia[], mensagem?, data_ocorrencia?, latitude?, longitude?` | ocorrência criada; o backend recalcula o risco com a IA · 409 duplicada em 30 s |
| Anexar foto, vídeo, áudio, PDF | `/ocorrencias/:id/evidencias` | POST multipart (`arquivo`) | arquivo (foto 5 MB, áudio/PDF 10 MB, vídeo 20 MB) | evidência com `hash_integridade` |
| Ver/baixar mídia, prova verificada | `/ocorrencias/:id/evidencias/:evidenciaId` | GET | — | `{url (5 min), expira_em_segundos, tipo, hash_integridade}` |
| Editar ocorrência | `/ocorrencias/:id` | PUT | tipos, mensagem, data, localização | ocorrência atualizada (risco recalculado) |
| Apagar ocorrência | `/ocorrencias/:id` | DELETE | — | remove a ocorrência e os arquivos |
| SOS (segurar o botão) | `/emergencias/acionar` | POST | `latitude?, longitude?` | `{emergencia_id, guardioes_notificados, status_notificacao}` · 409 já existe uma ativa |
| Reenvio de localização a cada 30 s | `/emergencias/:id/localizacao` | POST | `latitude, longitude` | `{ponto_gps}` |
| Cancelar aviso | `/emergencias/:id/encerrar` | POST | — | `{emergencia}` (até 30 s não conta para o risco) |
| (sem tela) rota da emergência | `/emergencias/:id/rota` | GET | — | `{rastro_gps}` |
| Classificação de risco (card do Início) | — | — | — | **não há rota que devolva o risco atual da usuária** (ver lacuna L1) |

**Conteúdo local, sem backend (correto assim):** carrossel, guias, FAQs, artigos de Conteúdo e Direitos, calculadora.

---

## 4. Lacunas e inconsistências

### Funcionalidades do design sem endpoint

| # | No design | Situação | Proposta |
|---|---|---|---|
| L1 | Card de risco no Início (baixo/médio/alto) | O risco fica em `usuarias.nivel_risco`, mas nenhuma rota o devolve | **Backend:** `GET /usuarias/me` com perfil e `nivel_risco`. Sem isso, o app usaria o `nivel_risco` da ocorrência mais recente, que pode estar desatualizado |
| L2 | Minha Conta (carregar e salvar dados, CPF mascarado) | Não existe ler/editar perfil | **Backend:** `GET /usuarias/me` e `PATCH /usuarias/me` (nome, telefone, e-mail; CPF não editável) |
| L3 | Alterar senha | Não existe | **Backend:** `PUT /usuarias/me/senha` (senha atual + nova, com regra de senha forte) |
| L4 | Esqueceu a senha | Não existe (precisa de envio de e-mail) | Esconder por enquanto |
| L5 | Entrar com Apple e Google | Não existe | Esconder |
| L6 | Convite por WhatsApp e status "Confirmou/Aguardando" da guardiã | Não existe; os avisos às guardiãs são **simulados** no backend | Mostrar só os dados reais (nome, relação) e "Aviso enviado" no alerta, sem "Confirmou · 12:31" |
| L7 | Guardiã principal (coração, "primeira a ser avisada") | Sem campo; o backend avisa todas ao mesmo tempo | Esconder, ou adicionar campo no backend |
| L8 | Delegacias próximas com distância | Sem fonte de dados (o design tem 3 nomes fictícios) | Abrir o app de mapas com a busca "Delegacia da Mulher" perto da usuária (sem inventar dados nem chave de API) |
| L9 | Foto de perfil | Sem upload de foto | Usar as iniciais |
| L10 | Código do Modo Disfarce de 4 dígitos, trocado em "Alterar código" | O backend usa `senha_app` (8 a 72 caracteres, obrigatória no cadastro) e um login separado | Ver decisão D1 |

### Endpoints sem tela no design

| Endpoint | Proposta |
|---|---|
| `DELETE /usuarias/me` (excluir conta, LGPD) | Botão "Excluir minha conta" em Minha Conta, abaixo de "Sair", com confirmação por senha |
| `PUT /ocorrencias/:id` (editar) | Botão "Editar" no Resumo, reaproveitando a tela Nova ocorrência |
| `DELETE /ocorrencias/:id` | "Apagar ocorrência" no Resumo, com confirmação (a FAQ do design já promete essa confirmação) |
| `data_ocorrencia` (quando aconteceu) | Campo "Quando aconteceu?" na Nova ocorrência (padrão: hoje) |
| Anexo PDF | Incluir "Documento (PDF)" em "Anexar arquivo" |
| `POST /usuarias/login-disfarcado` | Depende da decisão D1 |
| `GET /emergencias/:id/rota` | Não usar no app agora |

### Inconsistências entre o design e o backend

| # | Design | Backend | Proposta |
|---|---|---|---|
| I1 | 4 tipos de violência (Física, Psicológica, Sexual, Patrimonial) | 6 tipos (+ Moral e Ameaça). "Ameaça" sobe o risco para Médio na IA | Incluir Moral e Ameaça na grade (3 linhas de 2) |
| I2 | Checklist da senha: 8 caracteres, 1 maiúscula, 1 número, 1 caractere especial | Exige letras e números, sem sequência nem senha comum; não exige maiúscula nem especial | Ver decisão D2 |
| I3 | Textos dizem "guardado só no seu aparelho", "nada é enviado para nossos servidores", "nem o Amparo consegue abrir", "chave derivada da sua senha" | Os arquivos vão para o Storage privado do Supabase, e o backend (service role) consegue lê-los | **Corrigir os textos** para não prometer o que o sistema não faz. Ver decisão D3 |
| I4 | "Local e hora são registrados automaticamente e não podem ser alterados" | A edição de data e localização existe (O-07, O-10) | Ajustar o texto e mostrar "editado em" no Resumo |
| I5 | Slide 1: "com um toque, mesmo com a tela bloqueada" | Não há acionamento com tela bloqueada | Ajustar o texto, ou tratar como recurso futuro |
| I6 | "Sua localização é reenviada a cada 30 s" | A rota existe; o envio em segundo plano exige permissão de localização em segundo plano | Reenviar enquanto o app estiver aberto; segundo plano fica numa fase posterior |
| I7 | Modo Disfarce troca ícone e nome do app | Isso é nativo: no Android dá para trocar ícone e nome; no iOS só o ícone (com aviso do sistema) e nunca o nome | Fase 1: calculadora dentro do app. Troca de ícone em fase posterior, com build nativo (não roda no Expo Go) |
| I8 | Dois fluxos de nova ocorrência: tela única (`ocorrviolencia`) e passos (`ocorrtipo` → captura → confirmar → prova), sendo que o segundo não tem entrada no protótipo | — | Usar a tela única como fluxo principal. As telas de câmera, áudio e texto viram as opções do "Anexar arquivo". A tela "Prova verificada" vira o detalhe de cada anexo |
| I9 | "Prova verificada: o arquivo não foi alterado" | O backend guarda o SHA-256 no upload, mas não verifica de novo | O app baixa o arquivo, calcula o SHA-256 e compara com `hash_integridade`. Só mostra "verificada" se bater |
| I10 | Título "Etapa x/8" e nota na etapa 1: "Nunca enviamos SMS" | — | Manter |

### Sobre a IA (itens da Missão que não se aplicam)

A IA do Amparo **não é um chat**: ela só classifica o risco e é chamada pelo backend a cada ocorrência criada ou editada. Não tem streaming, e o app não deve falar com ela diretamente, porque isso exporia o `X-Internal-Secret`. No app, a "integração com a IA" é:

- mostrar o `nivel_risco` (card do Início e risco por ocorrência no Resumo);
- atualizar o card depois de salvar ou editar uma ocorrência, com estados de carregando, erro e "tentar de novo";
- explicar a classificação na sheet "Como chegamos nesta leitura". O texto será ajustado aos critérios reais: ocorrências e tipos de violência dos últimos 30 dias, acionamentos válidos do SOS e tempo desde o último registro.

Se o serviço de IA estiver fora do ar, a ocorrência é salva assim mesmo e o risco não muda. O app vai mostrar o último risco conhecido, sem inventar valor.

### Autenticação

O token JWT dura 2 h e **não existe renovação (refresh)**. Proposta: guardar o token no `expo-secure-store` (nunca em AsyncStorage). Quando vier um 401, limpar a sessão e voltar ao login com a mensagem "Sua sessão expirou". Um refresh token exigiria mudar o backend; fica como pendência.

---

## 5. Plano de implementação

### Stack

- **Expo** (SDK atual, conferido na instalação) + React Native + TypeScript estrito
- **expo-router** (rotas por arquivo, grupos protegidos)
- **TanStack Query** (cache e estados de requisição) + **Zustand** (sessão, tema, disfarce)
- **react-hook-form + zod** (formulários e validação, com CPF e telefone iguais aos do backend)
- `expo-secure-store` (token e código do disfarce), `expo-location`, `expo-camera`, `expo-audio`, `expo-image-picker`, `expo-document-picker`, `expo-crypto` (SHA-256), `expo-linear-gradient`, `react-native-svg`, `lucide-react-native`, `@expo-google-fonts/quicksand` e `nunito-sans`, `react-native-reanimated` (pulso do SOS, nav compacta, sheets)
- Testes: Jest + `@testing-library/react-native`. Fluxo E2E com Maestro (ver pendência sobre o banco de teste)

### Estrutura de pastas

```text
amparo-mobile/
  app/                        rotas (expo-router)
    _layout.tsx               fontes, tema, QueryClient, guarda de sessão, tela de privacidade
    (publico)/                abertura, login, cadastro/[etapa]
    (app)/                    exige sessão
      (abas)/                 inicio, ocorrencias, rede, mais  (AppNav)
      ocorrencias/            nova, [id], [id]/editar, [id]/evidencias/[evidenciaId], todas
      rede/                   nova, [id]
      mais/                   conta, senha, seguranca, codigo, conteudo, conteudo/[artigo]
      emergencia.tsx          alerta enviado
      captura/                camera, audio, texto
    disfarce.tsx              calculadora
  src/
    theme/                    tokens.ts (claro/escuro), tipografia, useTema
    components/               ui/ (Button, Input, Icon, Card, Sheet, Switch, PinInput, StepProgress…)
                              layout/ (AppHeader, AppNav, ScreenTitle, Tela)
                              dominio/ (SOSButton, ItemOcorrencia, ItemGuardia, PlayerMidia…)
    api/                      cliente.ts (fetch único: token, timeout, erros), erros.ts, tipos.ts
                              usuarias.ts, guardioes.ts, ocorrencias.ts, emergencias.ts
    hooks/                    useOcorrencias, useGuardioes, useEmergencia, useRisco… (React Query)
    store/                    sessao.ts, preferencias.ts, disfarce.ts
    validacao/                cpf.ts, senha.ts, telefone.ts, esquemas.ts (zod)
    conteudo/                 artigos.ts, faqs.ts, slides.ts (textos do design)
    utils/                    datas.ts, hash.ts, mascara.ts
  assets/                     fontes, imagens do carrossel, logo
  __mocks__/ e test/          mocks só para testes, fora do bundle final
  .env.example                EXPO_PUBLIC_API_URL
```

### Camadas

1. **Tela** (`app/`): só layout e chamadas a hooks; nunca usa `fetch`.
2. **Hooks** (`src/hooks`): React Query com chaves por recurso. Invalidam o cache depois de cada mutação; o risco é recarregado depois de salvar uma ocorrência.
3. **API** (`src/api`): um cliente único que injeta o token, aplica timeout (15 s, ou 60 s para upload) e cancela requisições com AbortController. Converte erros em `ErroApi {status, mensagem}`, com textos em português: 400 mostra a mensagem do backend; 401 encerra a sessão; 403, 404, 409 e 429 têm mensagens próprias; 503 e falta de rede viram "Sem conexão. Tente de novo."
4. **Tipos**: respostas tipadas à mão a partir do backend (o backend não publica OpenAPI).

### Segurança no app

- Token só no SecureStore, nunca em logs. Sem CPF, telefone ou relato em logs.
- Tela de privacidade ao minimizar (mostra a calculadora no lugar do conteúdo) e bloqueio de captura de tela nas telas de ocorrência.
- Textos vindos do backend renderizados como texto puro, sem HTML.
- Anexos baixados por URL assinada (5 min) e nunca salvos na galeria.

### Ordem de execução (uma parte por vez, com commit ao final de cada uma)

1. Base do projeto: Expo, TypeScript, lint, tema, fontes, ícones, `.env.example`
2. Biblioteca de componentes (com testes dos críticos: Button, Input, PinInput, SOSButton)
3. Cliente de API, sessão e rotas protegidas (com testes)
4. Abertura e login
5. Cadastro (8 etapas)
6. Início: SOS, alerta enviado, risco, ações e guias
7. Rede de apoio: listar, adicionar, editar, remover
8. Ocorrências: lista, filtro, nova, anexos, resumo, mídia, prova verificada, editar, apagar
9. Mais: conta, senha, segurança, código, conteúdo, sair, excluir conta
10. Modo Disfarce: calculadora e tela de privacidade
11. Qualidade: fluxo E2E, lint, tipos, build, comparação tela a tela com o design, README

---

## 6. Decisões que preciso de você

- **D1 — Modo Disfarce.** O design usa um código de 4 dígitos digitado na calculadora. O backend usa `senha_app` (mínimo de 8 caracteres) e um login separado. **Recomendo:** o código de 4 dígitos fica só no aparelho (guardado com hash no SecureStore) e destrava a sessão que já existe. Isso pede uma mudança pequena no backend: tornar `senha_app` opcional no cadastro. Um PIN de 4 dígitos enviado ao servidor como credencial seria fraco contra tentativa e erro.
- **D2 — Regra da senha.** **Recomendo** seguir o checklist do design (8 caracteres, maiúscula, número, especial), que é mais rígido e compatível com o backend, e mostrar a mensagem do backend quando ele recusar por sequência ou senha comum.
- **D3 — Textos de privacidade (I3, I4, I5).** **Recomendo** reescrever, mantendo o tom do design, para descrever o que o sistema faz de verdade: armazenamento privado e acessível só pela sua conta.
- **D4 — Mudanças no backend (L1, L2, L3).** **Recomendo** criar `GET /usuarias/me`, `PATCH /usuarias/me` e `PUT /usuarias/me/senha`, com testes, antes das telas do Início e de Minha Conta.
- **D5 — Itens sem backend (L4 a L9).** **Recomendo** esconder Apple/Google e "Esqueceu a senha", tirar os status de confirmação das guardiãs, esconder "guardiã principal", abrir o app de mapas para as delegacias e usar iniciais no avatar.
- **D6 — Tipos de violência (I1).** **Recomendo** incluir Moral e Ameaça.
- **D7 — Teste E2E.** Um E2E contra o backend real exige um projeto Supabase de teste (o de produção não pode ser usado). **Recomendo:** o E2E do app roda com a API simulada (mock isolado, só nos testes) e, quando houver um projeto de teste, o mesmo roteiro roda contra o backend real.
