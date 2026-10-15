import { type Href, router } from 'expo-router';

// Navegação entre telas. As views chamam estas funções em vez de falar direto com o roteador.
export const abrir = (destino: Href) => router.push(destino);
export const navegar = (destino: Href) => router.navigate(destino);
export const substituir = (destino: Href) => router.replace(destino);
export const voltar = () => router.back();
