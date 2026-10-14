import { View } from 'react-native';

import { Icone } from '@/components/ui/Icone';
import { Texto } from '@/components/ui/Texto';
import { useTema } from '@/theme/tema';
import { REGRAS_SENHA } from '@/validacao/regras';

// Checklist da senha (cadastro e "Alterar senha"): X cinza enquanto falta, check verde quando atende.
export function ChecklistSenha({ senha }: { senha: string }) {
  const { cores } = useTema();
  return (
    <View style={{ gap: 4 }} accessibilityRole="list">
      {REGRAS_SENHA.map((r) => {
        const ok = r.ok(senha);
        const cor = ok ? cores.verdeTexto : cores.textoSecundario;
        return (
          <View
            key={r.id}
            style={{ flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 24 }}
            accessibilityLabel={`${r.texto} ${ok ? 'Atendido.' : 'Ainda não atendido.'}`}
          >
            <Icone nome={ok ? 'check' : 'x'} tamanho={20} cor={cor} />
            <Texto variante="nota" corLivre={cor} style={{ flex: 1 }}>
              {r.texto}
            </Texto>
          </View>
        );
      })}
    </View>
  );
}
