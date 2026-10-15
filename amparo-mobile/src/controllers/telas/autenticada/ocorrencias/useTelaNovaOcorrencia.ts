import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { chaves, useCriarOcorrencia, useEditarOcorrencia, useOcorrencia } from '@/controllers/dados';
import { useTelaPrivada } from '@/controllers/privacidade';
import type { Ocorrencia, TipoViolencia } from '@/models/tipos';
import { problemaDoArquivo, tipoPorMime, useAnexos } from '@/models/stores/anexos';
import { apiOcorrencias } from '@/services/api/endpoints';
import { MENSAGEM_CARREGAR, mensagemDeErro } from '@/services/api/erros';
import { hojeIso } from '@/utils/datas';
import { localizacaoAtual } from '@/utils/permissoes';
import { dataNoFuturo, dataParaIso, isoParaData, mascararData } from '@/utils/validacao/regras';

const nomeGaleria = () => `galeria-${Date.now()}`;

type Envio = { id: string; estado: 'enviando' | 'ok' | 'erro'; mensagem?: string };

/** Nova ocorrência ou edição: com id na rota, espera a ocorrência carregar. Tela protegida contra print. */
export function useTelaNovaOcorrencia() {
  useTelaPrivada();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existente = useOcorrencia(id ?? '');
  return {
    id,
    existente: existente.data,
    erroCarregar: existente.isError ? mensagemDeErro(existente.error, MENSAGEM_CARREGAR) : null,
    tentarDeNovo: () => existente.refetch(),
  };
}

// Tipos, data, relato e anexos. Os anexos são enviados um por um depois de a ocorrência ser criada.
export function useFormularioOcorrencia({ id, existente }: { id?: string; existente?: Ocorrencia }) {
  const editando = !!id;
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
        const mensagem = mensagemDeErro(e, 'Não foi possível enviar.');
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
      setErro(mensagemDeErro(e, 'Não foi possível salvar. Tente de novo.'));
    }
  };

  const salvando = criar.isPending || editar.isPending || envios.some((e) => e.estado === 'enviando');

  return {
    editando,
    tipos,
    relato,
    quando,
    erroData,
    erro,
    menuAnexo,
    envios,
    anexos,
    salvando,
    alternar,
    alterarQuando: (t: string) => {
      setQuando(mascararData(t));
      setErroData(null);
    },
    alterarRelato: setRelato,
    abrirMenuAnexo: () => setMenuAnexo(true),
    fecharMenuAnexo: () => setMenuAnexo(false),
    escolherAnexo,
    removerAnexo: remover,
    salvar,
  };
}
