# AGENTS.md

Guia para agentes de IA (e pessoas) que trabalham neste repositório. Leia antes de mudar qualquer coisa.

O **Amparo** apoia mulheres em situação de violência: registro de ocorrências e evidências, rede de guardiãs, botão SOS com localização e classificação de risco por IA. Por isso, **segurança, privacidade e discrição vêm antes de qualquer conveniência**. Visão geral completa em [README.md](README.md).

## Estrutura

| Pasta | O que é | Stack |
|---|---|---|
| `amparo-mobile/` | App | React Native 0.86 + Expo SDK 57, expo-router, React 19.2, Zustand, React Query |
| `amparo-backend/` | API | NestJS 12, Supabase (PostgreSQL com RLS + Storage), JWT |
| `amparo-ia/` | Classificação de risco | FastAPI + scikit-learn (Random Forest) |
| `amparo-backend/supabase/` | Scripts SQL do banco (migrações aplicadas à mão) | SQL |
| `historico-qa-treinamentos/`, `Relatorios/` | Histórico de QA, treinos e relatórios | só referência |
| `amparo-obsidian/` | Notas | só referência |

Fluxo: app → backend (HTTPS + JWT) → Supabase; backend → IA (`POST /classificar` com `X-Internal-Secret`).

### App (`amparo-mobile/src`) — MVC por tipo técnico
- `app/` — rotas do expo-router (arquivos finos, só apontam para a tela).
- `views/screens/` — telas (só layout). `views/components/ui/` — componentes genéricos; `views/components/dominio/` — componentes do Amparo. `views/theme/` — tema e tokens.
- `controllers/telas/<grupo>/useTela<Nome>.ts` — toda a lógica de cada tela fica num hook controlador. A tela chama o hook e só desenha.
- `models/` — tipos e stores (Zustand). `services/` — API e integrações. `utils/` — funções puras. `config/conteudo/` — textos aprovados (privacidade, SOS, guias, disfarce).
- `assets/images/` — o ícone do app (`icon.png`, `android-icon-*`, `favicon.png`, `splash-icon.png`) é a marca do `logo.png` sobre o vinho `#954B6E`, gerado por `scripts/gerar-icone-app.py`. Não edite esses PNGs à mão; troque o logo ou o script e gere de novo. Mudar o ícone exige novo build no celular.
- `plugins/` — config plugins do Expo (ex.: `nome-icone-disfarce.js`, que precisa vir **antes** de `expo-alternate-app-icons` no `app.json`).
- Não mexer em `Design.html` e `LEVANTAMENTO.md`: são a referência de design e o levantamento de requisitos.

### Backend (`amparo-backend/src`) — por tipo técnico
`controllers/`, `services/`, `models/dto/`, `modules/`, `guards/`, `decorators/`, `utils/`, `views/`, `config/` (o cliente do Supabase é criado só em `config/supabase.ts`, via `criarClienteSupabase()`).

### IA (`amparo-ia`)
`main.py` (entrada) + `app/` (`config`, `models`, `services`, `routes`). Scripts manuais em `scripts/`. Testes em `tests/` (unittest).

## Comandos

Rode sempre dentro da pasta de cada parte. O CI (`.github/workflows/ci.yml`) roda tudo isso a cada PR e push no `main`; antes de abrir um PR, rode localmente o que mudou e **confira o código de saída**, não só o texto da saída.

**Backend** (Node 24; `.npmrc` com `legacy-peer-deps=true`, não remova):
```bash
npm ci
npm run lint          # oxlint
npx tsc --noEmit -p tsconfig.json
npm test              # unitários
npm run test:e2e      # E2E com banco em memória
npm run build
npm run demo          # servidor de demonstração na porta 3000, banco em memória, sem Supabase
```

**App:**
```bash
npm ci
npm run lint          # expo lint (inclui as regras do React Compiler)
npm run typecheck
npm test              # unitários (Jest)
npm run test:e2e      # telas reais + backend de demonstração (precisa do npm ci no amparo-backend)
npm run web           # app no navegador (com o backend em `npm run demo`)
npm start -- --dev-client   # Metro para o emulador/aparelho
```

**IA** (Python 3.14):
```bash
pip install -r requirements.txt
python -m unittest discover -s tests -t . -v
python -m uvicorn main:app --port 8000 --reload
```

## Regras do projeto

1. **Nunca use o banco de produção para testes.** Use o backend de demonstração (`npm run demo`) ou o banco em memória dos testes (`test/support/supabase-memoria.ts`), sempre com dados fictícios.
2. **Mudanças no Supabase de produção** (rodar SQL, migrações, permissões) só com aprovação explícita da responsável pelo projeto. Toda mudança de banco vira um arquivo em `amparo-backend/supabase/`.
3. **Não envie mensagens reais** (SMS, e-mail, WhatsApp) para pessoas reais. O envio às guardiãs ainda é simulado (vai para o log) e assim deve ficar até a escolha do provedor.
4. **Não altere o contrato do backend nem o da IA** (rotas, formato de requisição/resposta, campos) sem avisar antes. Proponha a mudança e espere aprovação.
5. **Refatoração não muda funcionalidade.** Se algo puder mudar o comportamento, pare e pergunte.
6. **Não apague arquivos definitivamente.** Remoções são feitas pelo git (recuperáveis) e com aprovação.
7. **Nunca faça commit de `.env`** ou de segredos. Use `.env.example` com valores fictícios. Os segredos do CI também são fictícios.
8. **Credenciais de teste ficam nos arquivos de seed** (ex.: `CONTA_DEMO` em `amparo-backend/test/servidor-memoria.ts`); não repita esses valores em chat, PRs ou documentação.
9. **Não mude configurações de segurança do Windows** (App Control, LongPaths etc.) para contornar problemas locais.
10. Commit e push só quando pedido. Trabalhe em branch (`feat/...`, `fix/...`, `refactor/...`) e abra PR para o `main`.
11. **Toda mudança no projeto atualiza a documentação no mesmo commit/PR:** este `AGENTS.md` e o `README.md` da raiz (e o `README.md` da parte alterada, se houver: `amparo-mobile/`, `amparo-backend/`). Vale para funcionalidade nova ou alterada, rota, comando, script, variável de ambiente, dependência, estrutura de pastas, regra ou problema conhecido. Se a mudança não afetar nada documentado, diga isso no PR.

## Privacidade e discrição (requisitos do produto)

- Textos que aparecem fora do app (SMS de código, notificações, nome do ícone) **não citam o Amparo** nem o tema.
- A localização é enviada **só quando o SOS é acionado** (não há rastreamento contínuo).
- O mapa da tela "Alerta enviado" mostra só esse ponto, sem `showsUserLocation`. Abrir o mapa envia as coordenadas ao provedor (Apple, Google ou OpenStreetMap): não use mapas em outras telas sem aprovação.
- Telas públicas não revelam se uma conta existe, nem o e-mail ou telefone cadastrados.
- Textos de privacidade, SOS, guias e disfarce ficam em `amparo-mobile/src/config/conteudo/` e foram aprovados. Não reescreva sem aprovação.
- Modo disfarce: no Android, o app vira "Calc" com ícone de calculadora (a troca acontece quando o app vai para segundo plano); no iPhone, só o ícone muda; no navegador, o ícone e o título da aba viram "Calc" (`iconeDisfarce.web.ts`). Os ícones de calculadora (inclusive `favicon-calc.png`) saem de `scripts/gerar-icone-calc.py`.

## Convenções de código

- Código, nomes e comentários em **português**, curtos e úteis.
- Estilo: aspas simples, ponto e vírgula, 2 espaços (siga o arquivo vizinho; não aplique um Prettier com outra configuração).
- App: alias `@/` aponta para `src/`. Lógica de tela no controlador, nunca na view.
- Navegação: use as funções de `src/controllers/navegacao.ts` (`abrir`, `navegar`, `substituir`, `voltar`), nunca `router.back()` direto. O `voltar()` vai para a tela inicial quando não há tela anterior (no navegador, depois de recarregar a página ou abrir um endereço direto).
- React Compiler: não modifique valores do React dentro de efeitos; para handlers usados em efeitos, use `useEffectEvent`.
- Jest: variáveis usadas dentro de `jest.mock(...)` precisam começar com `mock`. Não use `jest.spyOn` em funções que já são mocks (troque e restaure direto).
- Todo comportamento novo vem com teste (unitário e, se envolver fluxo de tela, E2E).
- Acessibilidade: botões com `accessibilityRole` e rótulos claros; avisos com `accessibilityLiveRegion`.

## Problemas conhecidos

- **IA no Windows:** a DLL do scikit-learn pode ser bloqueada pelo Windows App Control. Nesse caso os testes da IA rodam só no CI; não tente desbloquear.
- **Metro travando no bundle do Android:** reinicie com `--clear`.
- **Emulador com tela branca no dev client:** verifique se o modo avião está desligado e rode `adb reverse tcp:8081 tcp:8081` e `adb reverse tcp:3000 tcp:3000`.
- **Git Bash + adb:** use `MSYS_NO_PATHCONV=1` antes de comandos `adb` com caminhos do aparelho.
- **Ícone de disfarce no Android:** a biblioteca `expo-alternate-app-icons` desativa a `MainActivity` quando o ícone "Calc" está ligado; abrir o dev client por `.MainActivity` falha nesse estado (reinstalar o APK resolve).
- **Mapa no Android:** precisa de `GOOGLE_MAPS_ANDROID_API_KEY` no `.env` do app e de um novo build; sem a chave aparece a imagem do design. Na web o mapa é um iframe do OpenStreetMap (`MapaLocalizacao.web.tsx`), porque o `react-native-maps` não roda no navegador.
- **Leitura de risco não muda:** confira o log do backend ("Análise de risco indisponível") e o da IA. A IA responde `503` quando não acha o modelo; o backend só grava `Baixo`, `Medio` ou `Alto` e nunca grava resposta sem nível.
- **Metro depois de trocar de branch:** se aparecer "Unable to resolve" de um arquivo que não existe no branch atual, reinicie com `--clear`.
- `android/` e `ios/` são gerados (`expo prebuild`) e não são versionados: mudanças nativas vão em config plugins.
