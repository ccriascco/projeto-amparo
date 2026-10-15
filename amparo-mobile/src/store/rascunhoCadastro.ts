import { create } from 'zustand';

// Dados vindos do Google para completar o cadastro. Ficam só em memória
// (o id_token do Google vale por pouco tempo e nunca é gravado no aparelho).
type Rascunho = {
  google: { idToken: string; nome: string; email: string } | null;
  definirGoogle: (g: Rascunho['google']) => void;
};

export const useRascunhoCadastro = create<Rascunho>()((set) => ({
  google: null,
  definirGoogle: (google) => set({ google }),
}));
