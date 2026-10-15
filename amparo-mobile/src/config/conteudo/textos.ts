// Textos fixos do design (Design.html). Conteúdo local: não vem do backend.
import type { NomeIcone } from '@/views/components/ui/Icone';

export const SLIDES = [
  { foto: require('@/assets/images/carrossel-1.jpg'), titulo: 'Você não está sozinha', sub: 'Peça ajuda a qualquer momento, com um toque mesmo com a tela bloqueada.' },
  { foto: require('@/assets/images/carrossel-2.png'), titulo: 'Guarde o que importa', sub: 'Registre fotos, áudios e relatos com criptografia e valor de prova legal.' },
  { foto: require('@/assets/images/carrossel-3.png'), titulo: 'Uma rede com você.', sub: 'Conte com pessoas de confiança e profissionais de apoio, no seu tempo.' },
  { foto: require('@/assets/images/carrossel-4.png'), titulo: 'Sua história, suas escolhas.', sub: 'Você decide quando e como agir, o Amparo apoia cada passo.' },
];

type ItemInfo = { rotulo: string; icone: NomeIcone; texto: string };

export const GUIA: ItemInfo[] = [
  { rotulo: 'Como funcionam as ocorrências', icone: 'folder-lock', texto: 'Cada ocorrência guarda fotos, áudios, vídeos ou relatos em um cofre criptografado que só você abre. Elas ficam em ordem de data, com hora e local registrados automaticamente, e podem ser exportadas depois se você decidir levar o caso adiante.' },
  { rotulo: 'Central de Conteúdo e Direitos', icone: 'book-open', texto: 'Artigos curtos sobre a Lei Maria da Penha, medidas protetivas e o que esperar de cada etapa. Tudo escrito em linguagem simples e sem termos jurídicos.' },
  { rotulo: 'Delegacias Próximas', icone: 'map-pin', texto: 'Mostramos as delegacias especializadas mais perto de você, com distância e telefone. Se a localização estiver desligada, dá para buscar por cidade ou CEP.' },
  { rotulo: 'Como funciona o Modo Disfarçado', icone: 'calculator', texto: 'O app passa a ter o ícone e o nome de uma calculadora comum, que funciona de verdade. Para voltar ao Amparo, você digita o seu código pessoal e toca em "=". Se alguém digitar errado, nada acontece.' },
  { rotulo: 'Como funciona o SOS', icone: 'circle-alert', texto: 'Toque e segure o botão por alguns segundos. Sua rede recebe um aviso com a sua localização, que continua sendo atualizada a cada 30 segundos enquanto o alerta estiver ativo. Nada aparece na sua tela nem toca no seu celular.' },
  { rotulo: 'Como registrar uma prova', icone: 'camera', texto: 'Em Ocorrências, toque em registrar e escolha foto, áudio, vídeo ou texto. Local e hora entram sozinhos e não podem ser alterados — é isso que dá valor ao registro depois.' },
];

export const FAQ_REDE: ItemInfo[] = [
  { rotulo: 'Como funciona o convite', icone: 'send', texto: 'Ela recebe uma mensagem no WhatsApp com um link. Ao abrir, confirma que aceita ser sua guardiã. Não precisa instalar nada e o convite não diz nada sobre o motivo.' },
  { rotulo: 'Se ela não responder', icone: 'clock', texto: 'O convite fica como pendente e você pode reenviar quando quiser. Em um aviso, a mensagem é enviada mesmo assim — só não temos a confirmação de que ela aceitou o papel.' },
  { rotulo: 'Sua privacidade', icone: 'lock', texto: 'Ela vê o aviso e a sua localização enquanto ele estiver ativo. Não vê suas ocorrências, seus arquivos, nem quem mais faz parte da sua rede.' },
  { rotulo: 'Trocar guardiã principal', icone: 'heart', texto: 'A guardiã com o coração é a primeira a ser avisada. Abra o card de outra pessoa e marque-a como principal para trocar — o aviso continua indo para toda a rede.' },
  { rotulo: 'Quantas guardiãs posso ter', icone: 'users-round', texto: 'Entre 1 e 5 pessoas. Uma já protege, mas com três ou mais a chance de alguém estar disponível na hora aumenta bastante. Você pode trocar quem faz parte quando quiser.' },
];

export const POR_QUE_REDE = {
  titulo: 'Por que ter uma rede de apoio importa',
  texto: 'Quando você aciona um aviso, alguém que já sabe o que fazer recebe sua localização em segundos. Ter mais de uma pessoa aumenta a chance de alguém estar disponível na hora — e divide o peso de acompanhar você.',
};

export const FAQ_DOC: ItemInfo[] = [
  { rotulo: 'Isso vira prova legal?', icone: 'scale', texto: 'Cada registro guarda data, hora e local no momento da captura, junto com um código de integridade que mostra que o arquivo não foi alterado depois. Isso ajuda muito em um processo, mas quem decide o valor de cada prova é a Justiça. Você pode exportar tudo quando quiser levar a uma delegacia ou a uma advogada.' },
  { rotulo: 'Quem pode ver isso', icone: 'eye-off', texto: 'Só você. Os arquivos são criptografados com uma chave que fica no seu aparelho — nem o Amparo consegue abrir. Nada aparece na galeria do celular e suas guardiãs não têm acesso a nenhuma ocorrência.' },
  { rotulo: 'Por que registrar mesmo sem denunciar', icone: 'notebook-pen', texto: 'Registrar não obriga a denunciar. O que fica guardado é a sua memória organizada, com datas que você não vai precisar lembrar sozinha. Se um dia você decidir agir, o histórico já está pronto; se não decidir, ele continua só seu.' },
  { rotulo: 'Posso apagar uma ocorrência depois?', icone: 'trash-2', texto: 'Pode, a qualquer momento. Ao apagar, o arquivo sai do aparelho e não tem como recuperar. Por isso pedimos uma confirmação antes — vale pensar com calma, porque um registro apagado hoje não volta se você precisar dele depois.' },
  { rotulo: 'Como funciona a criptografia?', icone: 'key-round', texto: 'Os arquivos são embaralhados assim que você captura, com uma chave derivada da sua senha. Eles ficam só neste aparelho e são ilegíveis sem essa chave — nada é enviado para nossos servidores e nem a nossa equipe consegue abrir.' },
];

export const POR_QUE_REGISTRAR = {
  titulo: 'Por que registrar uma ocorrência',
  texto: 'Depois de um tempo, os episódios se misturam e as datas escapam. Um registro feito na hora guarda o que aconteceu com data, hora e local, do jeito que você contou, sem depender da sua memória meses depois. Isso serve para você primeiro: dá para olhar o histórico e enxergar um padrão que no dia a dia passa batido. E se em algum momento você decidir procurar a delegacia, uma advogada ou pedir uma medida protetiva, o material já está organizado — você não precisa reconstruir nada.',
};

export const ARTIGOS = [
  {
    titulo: 'Lei Maria da Penha, explicada',
    icone: 'scale' as NomeIcone,
    resumo: 'Entenda o que a lei garante e os 5 tipos de violência que ela reconhece.',
    texto: 'A Lei Maria da Penha (Lei nº 11.340/2006) existe para proteger mulheres de violência dentro de casa ou de relacionamentos. Ela reconhece 5 formas de violência: física, psicológica, sexual, patrimonial (relacionada a bens e dinheiro) e moral. A lei criou as Medidas Protetivas de Urgência, delegacias especializadas e prevê monitoramento eletrônico do agressor desde 2025. Pesquisas indicam que boa parte das brasileiras conhece pouco sobre seus direitos garantidos por essa lei — por isso vale a pena se informar, mesmo sem estar em uma situação de risco agora.',
    fonte: 'Fonte: Instituto Maria da Penha.',
  },
  {
    titulo: 'Como pedir uma Medida Protetiva',
    icone: 'file-check' as NomeIcone,
    resumo: 'O passo a passo, sem precisar de advogado, e sem custo nenhum.',
    texto: 'Você pode pedir a Medida Protetiva indo a qualquer delegacia (de preferência uma Delegacia da Mulher), ligando no 180, ou pelo 190 em caso de perigo imediato. Também é possível pedir pela Defensoria Pública ou Ministério Público, sem precisar contratar advogado nem pagar nada. O juiz tem até 48 horas para decidir, e a decisão pode incluir afastamento do agressor, monitoramento eletrônico dele, pensão provisória e proteção para os filhos. Leve documento de identidade e, se tiver, prints, fotos ou boletins anteriores — isso ajuda a comprovar a urgência.',
    fonte: 'Fonte: Agência Gov / Tribunal de Justiça do Ceará.',
  },
  {
    titulo: 'Monitoramento eletrônico do agressor',
    icone: 'radar' as NomeIcone,
    resumo: 'Desde 2026, isso já pode ser aplicado sozinho, sem precisar de outra medida.',
    texto: 'Desde a Lei nº 15.383/2026, o monitoramento eletrônico do agressor passou a ser uma medida protetiva independente — antes, só podia ser aplicado junto de outra medida. Na prática, o agressor usa um dispositivo (como uma tornozeleira) e a vítima recebe um aplicativo ou dispositivo que avisa quando ele se aproxima. Essa medida tem prioridade quando já houve descumprimento de uma proteção anterior, ou quando o risco à vítima é considerado alto.',
    fonte: 'Fonte: Agência Gov (Governo Federal).',
  },
  {
    titulo: 'Sinais de um relacionamento abusivo',
    icone: 'heart-crack' as NomeIcone,
    resumo: 'Geralmente começa sutil — reconhecer logo ajuda a agir mais rápido.',
    texto: 'A violência raramente começa com agressão física. Normalmente começa com controle: querer saber onde você está a todo momento, revisar seu celular, limitar contato com amigos e família, criticar constantemente, ou controlar o dinheiro. Ameaças (mesmo que "só" verbais), ciúme excessivo disfarçado de cuidado, e culpar você pelo próprio comportamento dele também são sinais de alerta. Se você se sente com medo, encolhida ou "pisando em ovos" na maior parte do tempo, isso já é um sinal de que algo não está bem — não é sua imaginação.',
    fonte: 'Fonte: Correio Braziliense / Portal Catarinas.',
  },
];

// Classificação de risco: explicação alinhada aos critérios reais da IA (janela de 30 dias)
export function textoClassificacao(rotulo: string) {
  return `A leitura de hoje é ${rotulo.toLowerCase()}. Ela vem dos seus registros dos últimos 30 dias: quantas ocorrências você registrou, os tipos de violência, com que frequência o SOS foi acionado e há quanto tempo foi o último registro. Nada disso é enviado para as suas guardiãs, e o SOS continua disponível do mesmo jeito em qualquer leitura. Você pode ignorar essa sugestão quando quiser — ela apoia a sua leitura, não decide por você.`;
}
