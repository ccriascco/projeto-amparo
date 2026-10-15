import { Pressable, TextInput, View } from 'react-native';

import { voltar } from '@/controllers/navegacao';
import { useFormularioOcorrencia, useTelaNovaOcorrencia } from '@/controllers/telas/autenticada/ocorrencias/useTelaNovaOcorrencia';
import { type Ocorrencia, TIPOS_VIOLENCIA } from '@/models/tipos';
import { ICONE_ANEXO, ROTULO_ANEXO } from '@/config/conteudo/anexos';
import { ICONE_VIOLENCIA } from '@/config/conteudo/violencia';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Botao } from '@/views/components/ui/Botao';
import { Campo } from '@/views/components/ui/Campo';
import { CirculoIcone } from '@/views/components/ui/Cartao';
import { Carregando, ErroCarregar } from '@/views/components/ui/Estados';
import { Icone, type NomeIcone } from '@/views/components/ui/Icone';
import { Sheet } from '@/views/components/ui/Sheet';
import { Texto } from '@/views/components/ui/Texto';
import { useTema } from '@/views/theme/tema';
import { fixas, fontes, raios } from '@/views/theme/tokens';

const OPCOES_ANEXO: { id: string; rotulo: string; icone: NomeIcone }[] = [
  { id: 'foto', rotulo: 'Tirar foto', icone: 'camera' },
  { id: 'video', rotulo: 'Gravar vídeo', icone: 'video' },
  { id: 'audio', rotulo: 'Gravar áudio', icone: 'mic' },
  { id: 'galeria', rotulo: 'Escolher da galeria', icone: 'image' },
  { id: 'pdf', rotulo: 'Documento (PDF)', icone: 'file-text' },
];

export default function TelaNovaOcorrencia() {
  const c = useTelaNovaOcorrencia();
  if (c.id && !c.existente) {
    return (
      <TelaInterna cabecalho={{ titulo: 'Editar ocorrência', aoFecharTopo: voltar }} semNav>
        {c.erroCarregar !== null ? <ErroCarregar mensagem={c.erroCarregar} aoTentar={c.tentarDeNovo} /> : <Carregando />}
      </TelaInterna>
    );
  }
  return <FormularioOcorrencia id={c.id} existente={c.existente} />;
}

function FormularioOcorrencia({ id, existente }: { id?: string; existente?: Ocorrencia }) {
  const { cores, sombraCard } = useTema();
  const { editando, tipos, relato, quando, erroData, erro, envios, anexos, salvando, ...c } = useFormularioOcorrencia({ id, existente });

  return (
    <TelaInterna
      cabecalho={{
        titulo: editando ? 'Editar ocorrência' : 'Nova ocorrência',
        sub: editando
          ? 'Ajuste o que precisar. A edição fica registrada.'
          : 'Conte o que aconteceu e anexe o que quiser guardar. Local e hora entram sozinhos.',
        aoFecharTopo: voltar,
      }}
      semNav
      gap={40}
      paddingTopo={32}
      sobreposicao={
        <Sheet visivel={c.menuAnexo} aoFechar={c.fecharMenuAnexo} titulo="Anexar arquivo" rotuloFechar="Cancelar">
          <View style={{ gap: 8 }}>
            {OPCOES_ANEXO.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => c.escolherAnexo(o.id)}
                accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 52, paddingVertical: 6 }}
              >
                <CirculoIcone nome={o.icone} />
                <Texto peso={600} tamanho={16}>
                  {o.rotulo}
                </Texto>
              </Pressable>
            ))}
          </View>
        </Sheet>
      }
    >
      <View style={{ gap: 16 }}>
        <Texto variante="secao">Escolha pelo menos um tipo</Texto>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {TIPOS_VIOLENCIA.map((t) => {
            const on = tipos.includes(t);
            return (
              <Pressable
                key={t}
                onPress={() => c.alternar(t)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Violência ${t}`}
                style={{
                  flexBasis: '47%',
                  flexGrow: 1,
                  minHeight: 112,
                  padding: 20,
                  gap: 12,
                  borderRadius: raios.card,
                  borderWidth: 1,
                  borderColor: on ? cores.acento : cores.borda40,
                  backgroundColor: on ? cores.borda04 : 'transparent',
                  ...sombraCard,
                }}
              >
                <CirculoIcone nome={ICONE_VIOLENCIA[t]} />
                <Texto peso={600} tamanho={16} corLivre={on ? cores.acento : cores.textoSuave}>
                  {t}
                </Texto>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Campo
        rotulo="Quando aconteceu?"
        placeholder="00/00/0000"
        value={quando}
        onChangeText={c.alterarQuando}
        erro={erroData}
        keyboardType="number-pad"
        nota="A data e a hora do registro são guardadas automaticamente."
      />

      <View style={{ gap: 8 }}>
        <Texto variante="secao">Quer contar mais alguma coisa?</Texto>
        <Texto variante="nota">Fica só no seu cofre e você pode mudar depois.</Texto>
        <TextInput
          value={relato}
          onChangeText={c.alterarRelato}
          placeholder="Escreva do seu jeito."
          placeholderTextColor={cores.textoPlaceholder}
          multiline
          maxLength={2000}
          accessibilityLabel="Relato"
          style={{
            marginTop: 8,
            minHeight: 112,
            paddingVertical: 16,
            paddingHorizontal: 20,
            borderRadius: raios.campoTexto,
            borderWidth: 1,
            borderColor: cores.borda40,
            backgroundColor: cores.card,
            color: cores.texto,
            fontFamily: fontes.core[400],
            fontSize: 16,
            lineHeight: 22,
            textAlignVertical: 'top',
          }}
        />
      </View>

      <View style={{ gap: 12 }}>
        <Texto variante="secao">Quer anexar alguma prova?</Texto>
        {editando && (existente?.evidencias?.length ?? 0) > 0 ? (
          <Texto variante="nota">{`Esta ocorrência já tem ${existente?.evidencias?.length} anexo(s). Os novos se somam a eles.`}</Texto>
        ) : null}
        <Pressable
          onPress={c.abrirMenuAnexo}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            padding: 20,
            borderRadius: raios.campoTexto,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: cores.borda40,
            backgroundColor: cores.card,
          }}
        >
          <CirculoIcone nome="paperclip" />
          <View style={{ flex: 1, gap: 2 }}>
            <Texto peso={700} tamanho={16} cor="acento">
              Anexar arquivo
            </Texto>
            <Texto variante="nota">Foto, vídeo, áudio ou PDF, pela câmera ou pela galeria.</Texto>
          </View>
        </Pressable>
        {anexos.map((a) => {
          const envio = envios.find((e) => e.id === a.id);
          return (
            <View
              key={a.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: raios.card,
                borderWidth: 1,
                borderColor: envio?.estado === 'erro' ? fixas.sos : cores.borda10,
                backgroundColor: cores.card,
                ...sombraCard,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: cores.borda10, alignItems: 'center', justifyContent: 'center' }}>
                <Icone nome={ICONE_ANEXO[a.tipo]} tamanho={20} cor={cores.acento} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto peso={600} tamanho={16}>
                  {ROTULO_ANEXO[a.tipo]}
                </Texto>
                <Texto variante="nota" corLivre={envio?.estado === 'erro' ? fixas.sos : undefined}>
                  {envio?.estado === 'enviando' ? 'Enviando…' : envio?.estado === 'ok' ? 'Enviado' : envio?.mensagem ?? a.detalhe}
                </Texto>
              </View>
              {envio?.estado === 'ok' ? (
                <Icone nome="check" tamanho={18} cor={cores.verde} />
              ) : (
                <Pressable
                  onPress={() => c.removerAnexo(a.id)}
                  disabled={envio?.estado === 'enviando'}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${ROTULO_ANEXO[a.tipo]}`}
                  style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icone nome="x" tamanho={18} cor={cores.nota} />
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      <View style={{ gap: 8, marginTop: 'auto', paddingTop: 8 }}>
        {erro ? (
          <Texto variante="nota" corLivre={fixas.sos} accessibilityLiveRegion="polite">
            {erro}
          </Texto>
        ) : null}
        <Botao onPress={c.salvar} desabilitado={tipos.length === 0} carregando={salvando} testID="salvar-ocorrencia">
          {editando ? 'Salvar alterações' : 'Salvar ocorrência'}
        </Botao>
      </View>
    </TelaInterna>
  );
}
