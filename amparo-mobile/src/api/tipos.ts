// Tipos das respostas do amparo-backend (o backend não publica OpenAPI;
// estes tipos seguem os services em amparo-backend/src).

export type NivelRisco = 'Baixo' | 'Medio' | 'Alto';

export const TIPOS_VIOLENCIA = ['Física', 'Psicológica', 'Sexual', 'Patrimonial', 'Moral', 'Ameaça'] as const;
export type TipoViolencia = (typeof TIPOS_VIOLENCIA)[number];

export type UsuariaResumo = {
  id: string;
  nome_completo: string;
  email: string;
  modo_disfarcado: boolean;
};

export type RespostaSessao = {
  mensagem: string;
  access_token: string;
  refresh_token: string;
  usuaria: UsuariaResumo;
};

export type RespostaCadastro = RespostaSessao & { usuaria_id: string };

export type Perfil = {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  cpf_mascarado: string;
  modo_disfarcado: boolean;
  codigo_disfarce_definido: boolean;
  nivel_risco: NivelRisco | null;
  tem_senha: boolean;
  login_google: boolean;
  senha_alterada_em: string | null;
};

export type GuardiaoCadastro = {
  nome_completo: string;
  telefone: string;
  email?: string;
  parentesco_relacao?: string;
};

export type DadosCadastro = {
  cpf: string;
  email: string;
  telefone: string;
  nome_completo: string;
  data_nascimento: string; // AAAA-MM-DD
  senha?: string;
  google_id_token?: string;
  modo_disfarcado?: boolean;
  codigo_disfarce?: string;
  guardioes: GuardiaoCadastro[];
};

export type StatusConvite = 'PENDENTE' | 'CONFIRMADO';

export type Guardia = {
  id: string;
  usuaria_id: string;
  nome_completo: string;
  telefone: string;
  email: string | null;
  parentesco_relacao: string | null;
  status_convite: StatusConvite;
  convidado_em: string | null;
  confirmado_em: string | null;
};

export type TipoEvidencia = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENTO';

export type Evidencia = {
  id: string;
  ocorrencia_id: string;
  tipo: TipoEvidencia;
  hash_integridade: string;
  criado_em?: string;
};

export type Ocorrencia = {
  id: string;
  usuaria_id: string;
  tipos_violencia: TipoViolencia[];
  mensagem: string | null;
  data_ocorrencia: string | null;
  latitude: number | null;
  longitude: number | null;
  nivel_risco: NivelRisco | null;
  criado_em: string;
  atualizado_em: string | null;
  evidencias?: Evidencia[];
};

export type ListaOcorrencias = {
  ocorrencias: Ocorrencia[];
  total: number;
  limit: number;
  offset: number;
};

export type NovaOcorrencia = {
  tipos_violencia: TipoViolencia[];
  mensagem?: string;
  data_ocorrencia?: string;
  latitude?: number;
  longitude?: number;
};

export type LinkEvidencia = {
  url: string;
  expira_em_segundos: number;
  tipo: TipoEvidencia;
  hash_integridade: string;
};

export type StatusAviso = 'CONFIRMADO' | 'AGUARDANDO';

export type AvisoEmergencia = {
  guardiao_id: string | null;
  nome_completo: string;
  enviado_em: string;
  confirmado_em: string | null;
  status: StatusAviso;
};

export type Emergencia = {
  id: string;
  usuaria_id: string;
  status: 'ATIVA' | 'ENCERRADA';
  criado_em: string;
  encerrado_em: string | null;
};

export type RespostaAcionar = {
  mensagem: string;
  emergencia_id: string;
  guardioes_notificados: number;
  status_notificacao: 'SUCESSO' | 'ALERTA_FALHA_SEM_GUARDIOES';
  avisos: AvisoEmergencia[];
};

export type SituacaoEmergencia = { emergencia: Emergencia | null; avisos: AvisoEmergencia[] };
