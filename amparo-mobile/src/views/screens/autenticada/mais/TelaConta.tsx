import { Pressable, View } from 'react-native';

import { useFormularioConta, useTelaConta } from '@/controllers/telas/autenticada/mais/useTelaConta';
import type { Perfil } from '@/models/tipos';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Botao } from '@/views/components/ui/Botao';
import { Cartao } from '@/views/components/ui/Cartao';
import { Campo } from '@/views/components/ui/Campo';
import { Confirmacao } from '@/views/components/ui/Confirmacao';
import { Carregando, ErroCarregar } from '@/views/components/ui/Estados';
import { Icone, type NomeIcone } from '@/views/components/ui/Icone';
import { Texto } from '@/views/components/ui/Texto';
import type { EscolhaTema } from '@/models/stores/preferencias';
import { useTema } from '@/views/theme/tema';
import { fixas, raios } from '@/views/theme/tokens';
import { diaMesDeData } from '@/utils/datas';
import { isoParaData } from '@/utils/validacao/regras';

const TEMAS: { id: EscolhaTema; rotulo: string; icone: NomeIcone }[] = [
  { id: 'claro', rotulo: 'Claro', icone: 'sun' },
  { id: 'escuro', rotulo: 'Escuro', icone: 'moon' },
  { id: 'auto', rotulo: 'Automático', icone: 'smartphone' },
];

export default function TelaConta() {
  const c = useTelaConta();
  if (c.carregando || c.erroCarregar !== null || !c.perfil) {
    return (
      <TelaInterna aba="mais" cabecalho={{ titulo: 'Minha Conta', sub: 'Seus dados, sua senha e a aparência do app.' }}>
        {c.erroCarregar !== null ? <ErroCarregar mensagem={c.erroCarregar} aoTentar={c.tentarDeNovo} /> : <Carregando />}
      </TelaInterna>
    );
  }
  return <FormularioConta p={c.perfil} />;
}

function FormularioConta({ p }: { p: Perfil }) {
  const { cores } = useTema();
  const { nome, telefone, email, erros, mensagem, tema, ...c } = useFormularioConta(p);

  return (
    <TelaInterna
      aba="mais"
      cabecalho={{ titulo: 'Minha Conta', sub: 'Seus dados, sua senha e a aparência do app.' }}
      sobreposicao={
        <>
          <Confirmacao
            visivel={c.confirmarSaida}
            titulo="Sair da conta?"
            texto="Para entrar de novo, você vai precisar do seu e-mail e senha (ou do Google)."
            rotuloConfirmar="Sair da conta"
            aoConfirmar={c.sair}
            aoFechar={c.fecharSaida}
          />
          <Confirmacao
            visivel={c.excluindo}
            titulo="Excluir sua conta?"
            texto="Sua conta, suas ocorrências, seus arquivos e sua rede de apoio são apagados para sempre. Isso não pode ser desfeito."
            rotuloConfirmar="Excluir minha conta"
            carregando={c.exclusaoPendente}
            erro={c.erroExclusao}
            aoConfirmar={c.excluir}
            aoFechar={c.fecharExclusao}
          >
            {p.tem_senha ? (
              <Campo rotulo="Confirme com sua senha" value={c.senhaExclusao} onChangeText={c.alterarSenhaExclusao} secureTextEntry autoComplete="current-password" />
            ) : (
              <Texto variante="nota">Para confirmar, você vai escolher sua conta Google de novo.</Texto>
            )}
          </Confirmacao>
        </>
      }
    >
      <View style={{ gap: 16 }}>
        <Campo rotulo="Nome completo" value={nome} onChangeText={c.alterarNome} erro={erros.nome} autoComplete="name" />
        <Campo rotulo="Data de nascimento" value={isoParaData(p.data_nascimento)} desabilitado />
        <Campo rotulo="Telefone" value={telefone} onChangeText={c.alterarTelefone} erro={erros.telefone} keyboardType="phone-pad" />
        <Campo
          rotulo="Email"
          value={email}
          onChangeText={c.alterarEmail}
          erro={erros.email}
          keyboardType="email-address"
          autoCapitalize="none"
          nota={p.login_google ? 'Você também entra com a sua conta Google.' : undefined}
        />

        <View style={{ gap: 8 }}>
          <Texto variante="rotulo">CPF</Texto>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              minHeight: 44,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: raios.pilula,
              borderWidth: 1,
              borderColor: cores.borda10,
              backgroundColor: cores.borda04,
            }}
          >
            <Texto accessibilityLabel={`CPF ${p.cpf_mascarado}`}>{p.cpf_mascarado}</Texto>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 12, borderRadius: raios.pilula, backgroundColor: cores.verde12, borderWidth: 1, borderColor: cores.verde30 }}>
              <Icone nome="shield-check" tamanho={16} cor={cores.verde} />
              <Texto peso={700} tamanho={12} corLivre={cores.verdeTexto} style={{ letterSpacing: -0.24 }}>
                Verificado
              </Texto>
            </View>
          </View>
          <Texto variante="nota">O CPF não pode ser alterado depois da verificação. Fale com o suporte se estiver errado.</Texto>
        </View>
      </View>

      <Cartao onPress={c.abrirSenha} rotuloAcessivel="Alterar senha" estilo={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 }}>
        <View style={{ gap: 4, flex: 1 }}>
          <Texto variante="cardTitulo">{p.tem_senha ? 'Alterar senha' : 'Criar senha'}</Texto>
          <Texto variante="cardCorpo">
            {p.senha_alterada_em ? `Última troca em ${diaMesDeData(p.senha_alterada_em.slice(0, 10))}.` : p.tem_senha ? 'Troque quando quiser.' : 'Para entrar também com e-mail e senha.'}
          </Texto>
        </View>
        <Icone nome="chevron-right" tamanho={20} cor={cores.acento} />
      </Cartao>

      {mensagem ? (
        <Texto variante="nota" corLivre={mensagem.erro ? fixas.sos : cores.verde} accessibilityLiveRegion="polite">
          {mensagem.texto}
        </Texto>
      ) : null}
      <Botao onPress={c.salvar} carregando={c.salvando}>
        Salvar alterações
      </Botao>

      <View style={{ gap: 12 }}>
        <Texto variante="cardTitulo">Aparência</Texto>
        <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
          {TEMAS.map((t) => {
            const on = tema === t.id;
            const cor = on ? cores.acento : cores.textoSecundario;
            return (
              <Pressable
                key={t.id}
                onPress={() => c.definirTema(t.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Tema ${t.rotulo}`}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 16,
                  paddingHorizontal: 8,
                  borderRadius: raios.card,
                  borderWidth: 1,
                  borderColor: on ? cores.acento : cores.borda10,
                  backgroundColor: on ? cores.borda04 : cores.card,
                }}
              >
                <Icone nome={t.icone} tamanho={24} cor={cor} />
                <Texto peso={700} tamanho={14} corLivre={cor} centro>
                  {t.rotulo}
                </Texto>
              </Pressable>
            );
          })}
        </View>
        <Texto variante="nota">No automático, o app segue o tema do seu celular.</Texto>
      </View>

      <Botao variante="perigo" onPress={c.pedirSaida}>
        Sair da conta
      </Botao>
      <Pressable onPress={c.pedirExclusao} accessibilityRole="button" style={{ alignSelf: 'center', paddingVertical: 8 }}>
        <Texto peso={700} tamanho={14} corLivre={cores.sair}>
          Excluir minha conta
        </Texto>
      </Pressable>
    </TelaInterna>
  );
}
