# Amparo — App mobile

App do Amparo em **React Native + TypeScript (Expo SDK 57)**, feito a partir do design "Projeto Amparo Telas" (`Design.html`) e integrado ao `amparo-backend`. O levantamento que originou o app está em [LEVANTAMENTO.md](LEVANTAMENTO.md).

## O que o app faz

- **Conta:** cadastro em 8 etapas (CPF validado, senha forte, permissões, Modo Disfarce e guardiãs), login por e-mail e senha ou Google, perfil, troca de senha, tema claro/escuro/automático, sair e excluir a conta.
- **Sessão do aparelho:** o app reabre sem pedir a senha de novo. Com o Modo Disfarce ligado, ele abre como uma calculadora funcional, e só o código de 4 números + "=" destrava. Cinco códigos errados encerram a sessão, mas o app continua parecendo uma calculadora.
- **Início:** botão SOS (segurar 3 s), registros da semana, leitura de risco calculada pela IA, ações rápidas e guias.
- **Pedido de ajuda:** envia a localização, mostra "Quem foi avisada" (confirmou ou aguardando) e reenvia a localização a cada 30 s enquanto o app está aberto.
- **Rede de apoio:** até 5 guardiãs, com o status do convite e a opção de reenviar.
- **Ocorrências:**
  - Registro com 6 tipos de violência, a data em que aconteceu, o relato e anexos (foto, vídeo, áudio e PDF, pela câmera, pelo gravador ou pela galeria).
  - Resumo, edição e exclusão.
  - Prova verificada: o app baixa o arquivo e confere o SHA-256 no próprio aparelho.
- **Conteúdo e direitos:** artigos em linguagem simples.

## Instalar

Requisitos: Node.js 20 ou mais recente. Para rodar no celular, use um development build (veja abaixo).

```bash
npm install
```

Crie o arquivo `.env` a partir do modelo. Ele não vai para o git.

```bash
cp .env.example .env
```

| Variável | Para que serve |
|---|---|
| `EXPO_PUBLIC_API_URL` | Endereço do backend. No celular físico, use o IP da sua máquina na rede (ex.: `http://192.168.0.10:3000`), não `localhost` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | ID de cliente OAuth "Web" do Google (o mesmo deve estar em `GOOGLE_CLIENT_IDS` no backend). Sem ele, o botão do Google avisa que não está configurado |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | ID de cliente OAuth do iOS |
| `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` | ID do iOS invertido (`com.googleusercontent.apps...`). Liga o plugin do Google no build |

O app não guarda nenhuma chave secreta: a IA é chamada só pelo backend.

## Rodar

Backend sem tocar em nenhum banco real: o backend de verdade, com o banco em memória dos testes e uma conta fictícia (veja `amparo-backend/test/servidor-memoria.ts`):

```bash
npm --prefix ../amparo-backend run demo
```

App:

```bash
npm start        # abre o Expo; "a" para Android, "i" para iOS, "w" para a versão web
```

A versão web serve para conferir as telas no navegador durante o desenvolvimento. O produto é o app mobile.

### Development build (câmera, áudio, Google e tela protegida)

Recursos nativos como câmera, gravação, login com Google e bloqueio de print precisam de um development build (não funcionam no Expo Go):

```bash
npx expo run:android
```

Ou na nuvem, com EAS:

```bash
npx eas-cli@latest build --profile development --platform android
```

## Testar

```bash
npm test             # 63 testes: componentes, cliente HTTP, sessão, validações, datas, calculadora, integridade
npm run test:e2e     # fluxo principal de ponta a ponta (sobe o backend de demonstração sozinho)
npm run lint
npm run typecheck
npx expo-doctor
```

O teste de ponta a ponta usa as telas reais do app (expo-router) contra o backend real com o banco em memória. Ele entra pela tela de login, vê a leitura de risco vinda da IA, registra uma ocorrência de violência física e confere que a IA reclassificou o risco para alto. A rede fica restrita ao backend local e nunca chega a um banco real. Com `IA_REAL=1` no backend de demonstração, a IA real (`amparo-ia`) é usada no lugar da simulada.

## Deploy

1. Configure `EXPO_PUBLIC_API_URL` com o endereço público do backend (HTTPS).
2. Defina os identificadores definitivos do app em `app.json` (`ios.bundleIdentifier` e `android.package`; os atuais, `br.com.amparo.app`, são provisórios).
3. Gere os builds de produção com EAS:

   ```bash
   npx eas-cli@latest build --platform all --profile production
   ```

4. Publique nas lojas:

   ```bash
   npx eas-cli@latest submit
   ```

## Estrutura

```text
src/
  app/                 rotas (expo-router)
    (publico)/         boas-vindas, login, cadastro
    (app)/             área autenticada: Início, ocorrências, rede, mais, captura, emergência
    disfarce.tsx       calculadora do Modo Disfarce
  api/                 cliente HTTP único, rotas tipadas, erros em português
  hooks/               React Query (dados) e privacidade da tela
  store/               sessão, preferências, anexos, rascunho do cadastro (Zustand)
  components/          ui/ (design system), layout/ (header, nav, telas), dominio/ (SOS, calculadora, players…)
  theme/               tokens do design (claro e escuro)
  validacao/           CPF, telefone, datas e senha (iguais às do backend)
  conteudo/            textos fixos do design (guias, FAQs, artigos)
  utils/               armazenamento seguro, permissões, mapas, integridade, datas
e2e/                   teste de ponta a ponta
```

## Diferenças em relação ao design

| Tela | Diferença | Motivo |
|---|---|---|
| Login | Sem "Esqueceu a Senha?" e sem "Sign in with Apple"; "Sign in with Google" virou "Entrar com Google" | Decisão aprovada (não há recuperação de senha nem login Apple no backend) |
| Login | Placeholder da senha "Sua senha" em vez de "123456" | O exemplo do design contradiz a regra de senha forte |
| Cadastro, etapa 6 | Pede câmera e microfone, mas não notificações | O app ainda não envia notificações |
| Cadastro, etapa 7 | Código de 4 números obrigatório só ao ativar o disfarce | Decisão aprovada |
| Avatar | Iniciais no lugar da foto | Decisão aprovada |
| Início | "Esta semana" no lugar de "Últimos 7 dias"; as barras são da semana de segunda a domingo, como as letras do design | As letras S T Q Q S S D só fazem sentido para a semana corrente |
| Início, risco médio | Texto do card ajustado ("Sua leitura de risco está em atenção…") | O original fala de um aviso pronto que o sistema não tem |
| Início, risco alto | Sem "delegacia a 1,2 km" | Não há dados de delegacias; o card abre o app de mapas |
| Início | Card "Pedido de ajuda ativo" quando há um SOS em andamento | Estado novo, necessário para voltar ao alerta |
| Delegacias próximas | Abre o app de mapas buscando "Delegacia da Mulher" | Decisão aprovada (a lista do design era fictícia) |
| Rede | Sem coração de "guardiã principal" | O backend avisa todas ao mesmo tempo |
| Rede, guardiã | Card do convite (pendente/confirmado) e "Reenviar convite" | Status de confirmação aprovado |
| Nova ocorrência | 6 tipos (+ Moral e Ameaça), campo "Quando aconteceu?" e anexo PDF | Decisões aprovadas e funcionalidades do backend |
| Nova ocorrência | Fluxo "Tipo de prova → captura → confirmar" virou as opções do "Anexar arquivo" | O protótipo tinha dois fluxos; foi mantido o principal |
| Resumo | Botões "Editar" e "Apagar", data de edição e leitura de risco do registro | Funcionalidades do backend sem tela no design |
| Resumo | Fotos, vídeos e áudios abrem na tela da prova (e não tocam direto no resumo) | O arquivo precisa ser baixado e verificado antes |
| Minha Conta | Data de nascimento só para leitura; "Excluir minha conta" no fim | O backend não altera a data; exclusão é exigência da LGPD |
| Segurança | Sem "Salvar alterações": cada opção vale na hora; permissões abrem os ajustes do sistema | Permissões são do sistema operacional |
| Todas | Estados de carregando, vazio e erro | Não existem no design |
| Captura | O X volta para a ocorrência, não para o Início | Evita perder o que já foi preenchido |

## Pendências

- **Ícone e nome de calculadora:** com o Modo Disfarce ligado, o app abre como calculadora, mas o ícone e o nome do app na tela inicial ainda são do Amparo. Exige módulo nativo; no iOS só o ícone pode mudar.
- **Localização em segundo plano:** durante um pedido de ajuda, a localização só é reenviada com o app aberto.
- **Notificações:** o app ainda não envia notificações.
- **Mensagens às guardiãs:** continuam simuladas no backend (sem WhatsApp ou SMS real).
- **Google:** falta criar os IDs de cliente OAuth no Google Cloud Console.
- **Textos de privacidade:** mantidos como no design por decisão sua, para revisar depois. Alguns ainda dizem "guardado só no seu aparelho", mas os arquivos ficam no armazenamento privado do servidor.
- **Banco de teste com Postgres real:** falta o dump da estrutura do banco de produção. Por enquanto os testes usam o banco em memória, que reproduz as regras do banco.
- **Identificadores do app:** `br.com.amparo.app` é provisório.
- **Builds nativos:** não foram gerados aqui (exigem Android Studio/Xcode ou conta EAS). O empacotamento JavaScript para Android, iOS e web foi gerado sem erros.
