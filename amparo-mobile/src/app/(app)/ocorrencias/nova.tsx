import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { apiOcorrencias } from '@/api/endpoints';
import { ErroApi } from '@/api/erros';
import { type Ocorrencia, TIPOS_VIOLENCIA, type TipoViolencia } from '@/api/tipos';
import { ICONE_VIOLENCIA } from '@/conteudo/violencia';
import { TelaInterna } from '@/components/layout/TelaInterna';
import { Botao } from '@/components/ui/Botao';
import { Campo } from '@/components/ui/Campo';
import { CirculoIcone } from '@/components/ui/Cartao';
import { Carregando, ErroCarregar } from '@/components/ui/Estados';
import { Icone, type NomeIcone } from '@/components/ui/Icone';
import { Sheet } from '@/components/ui/Sheet';
import { Texto } from '@/components/ui/Texto';
import { chaves, useCriarOcorrencia, useEditarOcorrencia, useOcorrencia } from '@/hooks/dados';
import { ICONE_ANEXO, problemaDoArquivo, ROTULO_ANEXO, tipoPorMime, useAnexos } from '@/store/anexos';
import { useTema } from '@/theme/tema';
import { fixas, fontes, raios } from '@/theme/tokens';
import { hojeIso } from '@/utils/datas';
import { localizacaoAtual } from '@/utils/permissoes';
import { dataNoFuturo, dataParaIso, isoParaData, mascararData } from '@/validacao/regras';
import { useTelaPrivada } from '@/hooks/privacidade';

const OPCOES_ANEXO: { id: string; rotulo: string; icone: NomeIcone }[] = [
  { id: 'foto', rotulo: 'Tirar foto', icone: 'camera' },
  { id: 'video', rotulo: 'Gravar vídeo', icone: 'video' },
  { id: 'audio', rotulo: 'Gravar áudio', icone: 'mic' },
  { id: 'galeria', rotulo: 'Escolher da galeria', icone: 'image' },
  { id: 'pdf', rotulo: 'Documento (PDF)', icone: 'file-text' },
];

const nomeGaleria = () => `galeria-${Date.now()}`;

type Envio = { id: string; estado: 'enviando' | 'ok' | 'erro'; mensagem?: string };

export default function TelaNovaOcorrencia() {
  useTelaPrivada();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existente = useOcorrencia(id ?? '');
  if (id && !existente.data) {
    return (
      <TelaInterna cabecalho={{ titulo: 'Editar ocorrência', aoFecharTopo: () => router.back() }} semNav>
        {existente.isError ? <ErroCarregar erro={existente.error} aoTentar={() => existente.refetch()} /> : <Carregando />}
      </TelaInterna>
    );
  }
  return <FormularioOcorrencia id={id} existente={existente.data} />;
}

function FormularioOcorrencia({ id, existente }: { id?: string; existente?: Ocorrencia }) {
  const editando = !!id;
  const { cores, sombraCard } = useTema();
  const qc = useQueryClient();
  const criar = useCriarOcorrencia();
  const editar = useEditarOcorrencia(id ?? '');
  const { anexos, adicionar, remover, limpar } = useAnexos();

  const [tipos, setTipos] = useState<TipoViolencia[]>(existente?.tipos_violencia ?? []);
  const [relato, setRelato] = useState(existente?.mensagem ?? '');
  const [quando, setQuando] = useState(
    existente ? (existente.data_ocorrencia ? isoParaData(existente.data_ocorrencia) : '') : isoParaData(hojeIso()),
  );
  const [erroData, setErroData] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [menuAnexo, setMenuAnexo] = useState(false);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [ocorrenciaSalva, setOcorrenciaSalva] = useState<string | null>(id ?? null);

  // Ao abrir a tela, começa sem anexos pendentes de outra tentativa
  useEffect(() => {
    if (!editando) limpar();
    return () => limpar();
  }, [editando, limpar]);

  const alternar = (t: TipoViolencia) => setTipos((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));

  const escolherAnexo = async (opcao: string) => {
    setMenuAnexo(false);
    setErro(null);
    if (opcao === 'foto' || opcao === 'video') return router.push({ pathname: '/captura/camera', params: { modo: opcao } });
    if (opcao === 'audio') return router.push('/captura/audio');
    if (opcao === 'galeria') {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8, allowsMultipleSelection: false });
      if (r.canceled) return;
      const a = r.assets[0];
      // Fotos HEIC do iPhone saem como JPEG com quality < 1
      const mime = a.mimeType ?? (a.type === 'video' ? 'video/mp4' : 'image/jpeg');
      const problema = problemaDoArquivo(a.uri, mime);
      if (problema) return setErro(problema);
      return adicionar({ uri: a.uri, nome: a.fileName ?? nomeGaleria(), mime, tipo: tipoPorMime(mime) ?? 'foto' });
    }
    if (opcao === 'pdf') {
      const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (r.canceled) return;
      const a = r.assets[0];
      const mime = a.mimeType ?? 'application/pdf';
      const problema = problemaDoArquivo(a.uri, mime);
      if (problema) return setErro(problema);
      adicionar({ uri: a.uri, nome: a.name, mime, tipo: 'documento' });
    }
  };

  // Envia os anexos um por um; os que falharem podem ser tentados de novo sem duplicar a ocorrência
  const enviarAnexos = async (ocorrenciaId: string) => {
    let falhou = false;
    for (const a of useAnexos.getState().anexos) {
      if (envios.find((e) => e.id === a.id)?.estado === 'ok') continue;
      setEnvios((l) => [...l.filter((e) => e.id !== a.id), { id: a.id, estado: 'enviando' }]);
      try {
        await apiOcorrencias.anexar(ocorrenciaId, { uri: a.uri, nome: a.nome, tipo: a.mime });
        setEnvios((l) => [...l.filter((e) => e.id !== a.id), { id: a.id, estado: 'ok' }]);
      } catch (e) {
        falhou = true;
        const mensagem = e instanceof ErroApi ? e.mensagem : 'Não foi possível enviar.';
        setEnvios((l) => [...l.filter((x) => x.id !== a.id), { id: a.id, estado: 'erro', mensagem }]);
      }
    }
    return !falhou;
  };

  const salvar = async () => {
    setErro(null);
    const iso = quando ? dataParaIso(quando) : null;
    if (quando && !iso) return setErroData('Confira a data (dia/mês/ano).');
    if (iso && dataNoFuturo(iso)) return setErroData('A data não pode estar no futuro.');
    setErroData(null);

    try {
      let alvo = ocorrenciaSalva;
      if (!alvo) {
        const local = await localizacaoAtual();
        const r = await criar.mutateAsync({
          tipos_violencia: tipos,
          mensagem: relato.trim() || undefined,
          data_ocorrencia: iso ?? undefined,
          ...(local ?? {}),
        });
        alvo = r.ocorrencia.id;
        setOcorrenciaSalva(alvo);
      } else if (editando && !envios.length) {
        await editar.mutateAsync({ tipos_violencia: tipos, mensagem: relato.trim(), data_ocorrencia: iso ?? undefined });
      }
      const tudoEnviado = await enviarAnexos(alvo);
      qc.invalidateQueries({ queryKey: chaves.ocorrencia(alvo) });
      qc.invalidateQueries({ queryKey: chaves.ocorrencias });
      if (!tudoEnviado) {
        setErro('A ocorrência foi salva, mas algum anexo não foi enviado. Toque em salvar para tentar de novo.');
        return;
      }
      limpar();
      router.replace({ pathname: '/ocorrencias/[id]', params: { id: alvo } });
    } catch (e) {
      setErro(e instanceof ErroApi ? e.mensagem : 'Não foi possível salvar. Tente de novo.');
    }
  };

  const salvando = criar.isPending || editar.isPending || envios.some((e) => e.estado === 'enviando');

  return (
    <TelaInterna
      cabecalho={{
        titulo: editando ? 'Editar ocorrência' : 'Nova ocorrência',
        sub: editando
          ? 'Ajuste o que precisar. A edição fica registrada.'
          : 'Conte o que aconteceu e anexe o que quiser guardar. Local e hora entram sozinhos.',
        aoFecharTopo: () => router.back(),
      }}
      semNav
      gap={40}
      paddingTopo={32}
      sobreposicao={
        <Sheet visivel={menuAnexo} aoFechar={() => setMenuAnexo(false)} titulo="Anexar arquivo" rotuloFechar="Cancelar">
          <View style={{ gap: 8 }}>
            {OPCOES_ANEXO.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => escolherAnexo(o.id)}
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
                onPress={() => alternar(t)}
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
        onChangeText={(t) => {
          setQuando(mascararData(t));
          setErroData(null);
        }}
        erro={erroData}
        keyboardType="number-pad"
        nota="A data e a hora do registro são guardadas automaticamente."
      />

      <View style={{ gap: 8 }}>
        <Texto variante="secao">Quer contar mais alguma coisa?</Texto>
        <Texto variante="nota">Fica só no seu cofre e você pode mudar depois.</Texto>
        <TextInput
          value={relato}
          onChangeText={setRelato}
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
          onPress={() => setMenuAnexo(true)}
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
                  onPress={() => remover(a.id)}
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
        <Botao onPress={salvar} desabilitado={tipos.length === 0} carregando={salvando} testID="salvar-ocorrencia">
          {editando ? 'Salvar alterações' : 'Salvar ocorrência'}
        </Botao>
      </View>
    </TelaInterna>
  );
}
