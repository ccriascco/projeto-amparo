import { type Href, router } from 'expo-router';

// Navegação entre telas. As views chamam estas funções em vez de falar direto com o roteador.
export const abrir = (destino: Href) => router.push(destino);
export const navegar = (destino: Href) => router.navigate(destino);
export const substituir = (destino: Href) => router.replace(destino);
// Volta para a tela anterior. Sem tela anterior (no navegador, depois de recarregar a página
// ou ao abrir um endereço direto), vai para a tela inicial em vez de não fazer nada.
export const voltar = () => (router.canGoBack() ? router.back() : router.replace('/'));
