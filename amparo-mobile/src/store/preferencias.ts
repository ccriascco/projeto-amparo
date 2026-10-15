import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { apagar, gravar, ler } from '@/utils/armazenamento';

export type EscolhaTema = 'claro' | 'escuro' | 'auto';

type Preferencias = {
  tema: EscolhaTema;
  definirTema: (tema: EscolhaTema) => void;
};

export const usePreferencias = create<Preferencias>()(
  persist(
    (set) => ({
      tema: 'claro',
      definirTema: (tema) => set({ tema }),
    }),
    {
      name: 'amparo.preferencias',
      storage: createJSONStorage(() => ({ getItem: ler, setItem: gravar, removeItem: apagar })),
    },
  ),
);
