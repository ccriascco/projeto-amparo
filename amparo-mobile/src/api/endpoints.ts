import { requisicao } from './cliente';
import type {
  DadosCadastro,
  Guardia,
  GuardiaoCadastro,
  LinkEvidencia,
  ListaOcorrencias,
  NovaOcorrencia,
  Ocorrencia,
  Perfil,
  RespostaAcionar,
  RespostaCadastro,
  RespostaSessao,
  SituacaoEmergencia,
  Evidencia,
} from './tipos';

// Um método por rota do backend. Nenhuma rota é inventada: todas existem em amparo-backend/src.

export const apiUsuarias = {
  cadastrar: (dados: DadosCadastro) => requisicao<RespostaCadastro>('POST', '/usuarias', { corpo: dados, publica: true }),
  login: (email: string, senha: string) =>
    requisicao<RespostaSessao>('POST', '/usuarias/login', { corpo: { email, senha }, publica: true }),
  loginGoogle: (idToken: string) =>
    requisicao<RespostaSessao>('POST', '/usuarias/login-google', { corpo: { id_token: idToken }, publica: true }),
  renovarSessao: (refreshToken: string, codigo?: string) =>
    requisicao<RespostaSessao>('POST', '/usuarias/sessao/renovar', { corpo: { refresh_token: refreshToken, codigo }, publica: true }),
  logout: () => requisicao<{ mensagem: string }>('POST', '/usuarias/logout', { corpo: {} }),
  perfil: () => requisicao<Perfil>('GET', '/usuarias/me'),
  atualizarPerfil: (dados: Partial<Pick<Perfil, 'nome_completo' | 'telefone' | 'email' | 'modo_disfarcado'>> & { codigo_disfarce?: string }) =>
    requisicao<{ mensagem: string; usuaria: Perfil }>('PATCH', '/usuarias/me', { corpo: dados }),
  trocarSenha: (senhaAtual: string | undefined, novaSenha: string) =>
    requisicao<{ mensagem: string }>('PUT', '/usuarias/me/senha', { corpo: { senha_atual: senhaAtual, nova_senha: novaSenha } }),
  trocarCodigo: (codigoAtual: string | undefined, codigoNovo: string) =>
    requisicao<{ mensagem: string }>('PUT', '/usuarias/me/codigo', { corpo: { codigo_atual: codigoAtual, codigo_novo: codigoNovo } }),
  excluirConta: (confirmacao: { senha?: string; google_id_token?: string }) =>
    requisicao<{ mensagem: string }>('DELETE', '/usuarias/me', { corpo: confirmacao }),
};

export const apiGuardioes = {
  listar: () => requisicao<{ guardioes: Guardia[] }>('GET', '/guardioes'),
  criar: (dados: GuardiaoCadastro) => requisicao<{ mensagem: string; guardiao: Guardia }>('POST', '/guardioes', { corpo: dados }),
  atualizar: (id: string, dados: Partial<GuardiaoCadastro>) =>
    requisicao<{ mensagem: string; guardiao: Guardia }>('PUT', `/guardioes/${id}`, { corpo: dados }),
  reenviarConvite: (id: string) => requisicao<{ mensagem: string; guardiao: Guardia }>('POST', `/guardioes/${id}/convite`),
  remover: (id: string) => requisicao<{ mensagem: string }>('DELETE', `/guardioes/${id}`),
};

export const apiOcorrencias = {
  listar: (limit = 20, offset = 0, sinal?: AbortSignal) =>
    requisicao<ListaOcorrencias>('GET', `/ocorrencias?limit=${limit}&offset=${offset}`, { sinal }),
  buscar: (id: string) => requisicao<{ ocorrencia: Ocorrencia }>('GET', `/ocorrencias/${id}`),
  criar: (dados: NovaOcorrencia) => requisicao<{ mensagem: string; ocorrencia: Ocorrencia }>('POST', '/ocorrencias', { corpo: dados }),
  atualizar: (id: string, dados: Partial<NovaOcorrencia>) =>
    requisicao<{ mensagem: string; ocorrencia: Ocorrencia }>('PUT', `/ocorrencias/${id}`, { corpo: dados }),
  remover: (id: string) => requisicao<{ mensagem: string }>('DELETE', `/ocorrencias/${id}`),
  anexar: (id: string, arquivo: { uri: string; nome: string; tipo: string }, sinal?: AbortSignal) => {
    const formulario = new FormData();
    // React Native aceita { uri, name, type } como arquivo no FormData
    formulario.append('arquivo', { uri: arquivo.uri, name: arquivo.nome, type: arquivo.tipo } as unknown as Blob);
    return requisicao<{ mensagem: string; evidencia: Evidencia }>('POST', `/ocorrencias/${id}/evidencias`, { formulario, sinal });
  },
  linkEvidencia: (ocorrenciaId: string, evidenciaId: string) =>
    requisicao<LinkEvidencia>('GET', `/ocorrencias/${ocorrenciaId}/evidencias/${evidenciaId}`),
};

export const apiEmergencias = {
  acionar: (local?: { latitude: number; longitude: number }) =>
    requisicao<RespostaAcionar>('POST', '/emergencias/acionar', { corpo: local ?? {} }),
  ativa: () => requisicao<SituacaoEmergencia>('GET', '/emergencias/ativa'),
  detalhe: (id: string) => requisicao<SituacaoEmergencia>('GET', `/emergencias/${id}`),
  enviarLocalizacao: (id: string, local: { latitude: number; longitude: number }) =>
    requisicao<{ mensagem: string }>('POST', `/emergencias/${id}/localizacao`, { corpo: local }),
  encerrar: (id: string) => requisicao<{ mensagem: string }>('POST', `/emergencias/${id}/encerrar`),
};
