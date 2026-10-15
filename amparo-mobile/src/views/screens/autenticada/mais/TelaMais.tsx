import { View } from 'react-native';

import { abrir } from '@/controllers/navegacao';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Cartao, CirculoIcone } from '@/views/components/ui/Cartao';
import type { NomeIcone } from '@/views/components/ui/Icone';
import { Texto } from '@/views/components/ui/Texto';

const CARTOES: { icone: NomeIcone; titulo: string; corpo: string; rota: '/mais/conta' | '/mais/conteudo' | '/mais/seguranca' }[] = [
  { icone: 'user-round', titulo: 'Minha Conta', corpo: 'Seus dados, senha e aparência do app.', rota: '/mais/conta' },
  { icone: 'book-open', titulo: 'Central de Conteúdo e Direitos', corpo: 'Seus direitos e o que acontece em cada caminho, em linguagem simples.', rota: '/mais/conteudo' },
  { icone: 'shield-check', titulo: 'Configurações de Segurança', corpo: 'Modo Disfarce, privacidade e o que sai do seu aparelho.', rota: '/mais/seguranca' },
];

export default function TelaMais() {
  return (
    <TelaInterna aba="mais" cabecalho={{ titulo: 'Mais', sub: 'Sua conta, conteúdo de apoio e as configurações de segurança.' }}>
      <View style={{ gap: 12 }}>
        {CARTOES.map((c) => (
          <Cartao key={c.titulo} onPress={() => abrir(c.rota)} rotuloAcessivel={`${c.titulo}. ${c.corpo}`} estilo={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
            <CirculoIcone nome={c.icone} />
            <View style={{ flex: 1, gap: 4 }}>
              <Texto variante="cardTitulo">{c.titulo}</Texto>
              <Texto variante="cardCorpo">{c.corpo}</Texto>
            </View>
          </Cartao>
        ))}
      </View>
    </TelaInterna>
  );
}
