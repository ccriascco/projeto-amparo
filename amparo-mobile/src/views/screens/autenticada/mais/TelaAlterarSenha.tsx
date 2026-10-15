import { View } from 'react-native';

import { voltar } from '@/controllers/navegacao';
import { useTelaAlterarSenha } from '@/controllers/telas/autenticada/mais/useTelaAlterarSenha';
import { ChecklistSenha } from '@/views/components/dominio/ChecklistSenha';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Botao } from '@/views/components/ui/Botao';
import { Campo } from '@/views/components/ui/Campo';
import { Texto } from '@/views/components/ui/Texto';
import { fixas } from '@/views/theme/tokens';

export default function TelaAlterarSenha() {
  const c = useTelaAlterarSenha();

  return (
    <TelaInterna
      cabecalho={{
        titulo: c.temSenha ? 'Alterar senha' : 'Criar senha',
        sub: 'Escolha uma senha nova que só você saiba. Você continua conectada neste aparelho depois da troca.',
        aoFecharTopo: voltar,
      }}
      semNav
    >
      <View style={{ gap: 16 }}>
        {c.temSenha ? (
          <Campo rotulo="Senha atual" placeholder="Digite a senha de agora" value={c.atual} onChangeText={c.alterarAtual} erro={c.erros.atual} secureTextEntry autoComplete="current-password" />
        ) : null}
        <Campo rotulo="Nova senha" placeholder="Crie a nova senha" value={c.nova} onChangeText={c.alterarNova} erro={c.erros.nova} secureTextEntry autoComplete="new-password" />
        <Campo rotulo="Confirmar nova senha" placeholder="Repita a nova senha" value={c.confirmacao} onChangeText={c.alterarConfirmacao} erro={c.erros.confirmacao} secureTextEntry />
      </View>
      <ChecklistSenha senha={c.nova} />
      {c.erroGeral !== null ? (
        <Texto variante="nota" corLivre={fixas.sos} accessibilityLiveRegion="polite">
          {c.erroGeral}
        </Texto>
      ) : null}
      <Botao onPress={c.enviar} carregando={c.salvando}>
        Salvar nova senha
      </Botao>
    </TelaInterna>
  );
}
