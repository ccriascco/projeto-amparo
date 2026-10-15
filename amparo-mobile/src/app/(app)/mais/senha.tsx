import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { apiUsuarias } from '@/api/endpoints';
import { ErroApi } from '@/api/erros';
import { ChecklistSenha } from '@/components/dominio/ChecklistSenha';
import { TelaInterna } from '@/components/layout/TelaInterna';
import { Botao } from '@/components/ui/Botao';
import { Campo } from '@/components/ui/Campo';
import { Texto } from '@/components/ui/Texto';
import { chaves, usePerfil } from '@/hooks/dados';
import { fixas } from '@/theme/tokens';
import { senhaAtendeRegras } from '@/validacao/regras';

export default function TelaAlterarSenha() {
  const qc = useQueryClient();
  const perfil = usePerfil();
  const temSenha = perfil.data?.tem_senha !== false;
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<{ atual?: string; nova?: string; confirmacao?: string }>({});

  const trocar = useMutation({
    mutationFn: () => apiUsuarias.trocarSenha(temSenha ? atual : undefined, nova),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaves.perfil });
      router.back();
    },
    onError: (e) => {
      if (e instanceof ErroApi && e.status === 401) setErros({ atual: 'A senha atual está incorreta.' });
    },
  });

  const enviar = () => {
    const e = {
      atual: temSenha && !atual ? 'Digite a senha de agora.' : undefined,
      nova: senhaAtendeRegras(nova) ? undefined : 'A nova senha ainda não atende a todas as regras.',
      confirmacao: confirmacao === nova ? undefined : 'As duas senhas não são iguais.',
    };
    setErros(e);
    if (!e.atual && !e.nova && !e.confirmacao) trocar.mutate();
  };

  return (
    <TelaInterna
      cabecalho={{
        titulo: temSenha ? 'Alterar senha' : 'Criar senha',
        sub: 'Escolha uma senha nova que só você saiba. Você continua conectada neste aparelho depois da troca.',
        aoFecharTopo: () => router.back(),
      }}
      semNav
    >
      <View style={{ gap: 16 }}>
        {temSenha ? (
          <Campo rotulo="Senha atual" placeholder="Digite a senha de agora" value={atual} onChangeText={setAtual} erro={erros.atual} secureTextEntry autoComplete="current-password" />
        ) : null}
        <Campo rotulo="Nova senha" placeholder="Crie a nova senha" value={nova} onChangeText={setNova} erro={erros.nova} secureTextEntry autoComplete="new-password" />
        <Campo rotulo="Confirmar nova senha" placeholder="Repita a nova senha" value={confirmacao} onChangeText={setConfirmacao} erro={erros.confirmacao} secureTextEntry />
      </View>
      <ChecklistSenha senha={nova} />
      {trocar.isError && !(trocar.error instanceof ErroApi && trocar.error.status === 401) ? (
        <Texto variante="nota" corLivre={fixas.sos} accessibilityLiveRegion="polite">
          {trocar.error instanceof ErroApi ? trocar.error.mensagem : 'Não foi possível alterar a senha.'}
        </Texto>
      ) : null}
      <Botao onPress={enviar} carregando={trocar.isPending}>
        Salvar nova senha
      </Botao>
    </TelaInterna>
  );
}
