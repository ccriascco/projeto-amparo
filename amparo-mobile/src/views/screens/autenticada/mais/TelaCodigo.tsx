import { View } from 'react-native';

import { voltar } from '@/controllers/navegacao';
import { type TomAviso, useTelaCodigo } from '@/controllers/telas/autenticada/mais/useTelaCodigo';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Botao } from '@/views/components/ui/Botao';
import { EntradaPin } from '@/views/components/ui/EntradaPin';
import { Texto } from '@/views/components/ui/Texto';
import { useTema } from '@/views/theme/tema';

// "Alterar código" do protótipo (também cria o código; o motivo vem da rota, no controller).
export default function TelaCodigo() {
  const { cores } = useTema();
  const c = useTelaCodigo();
  const corAviso: Record<TomAviso, string> = { erro: cores.sair, ok: cores.verde, neutro: cores.nota };

  return (
    <TelaInterna cabecalho={{ titulo: c.temCodigo ? 'Alterar código' : 'Criar código', sub: c.sub, aoFecharTopo: voltar }} semNav paddingTopo={32}>
      {c.temCodigo ? <EntradaPin rotulo="Código atual" valor={c.atual} aoMudar={c.alterarAtual} erro={c.erroAtual} /> : null}
      <EntradaPin rotulo="Novo código" valor={c.novo} aoMudar={c.alterarNovo} />
      <View style={{ gap: 8 }}>
        <EntradaPin rotulo="Confirmar novo código" valor={c.conf} aoMudar={c.alterarConf} erro={c.divergente} />
        <Texto variante="nota" corLivre={corAviso[c.tomAviso]} accessibilityLiveRegion="polite">
          {c.aviso}
        </Texto>
      </View>
      {c.erroSalvar !== null ? (
        <Texto variante="nota" corLivre={cores.sair}>
          {c.erroSalvar}
        </Texto>
      ) : null}
      <Botao onPress={c.salvar} desabilitado={!c.pronto} carregando={c.salvando} estilo={{ marginTop: 8 }}>
        Salvar novo código
      </Botao>
    </TelaInterna>
  );
}
