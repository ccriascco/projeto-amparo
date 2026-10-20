import { Injectable, Logger } from '@nestjs/common';
import { mascararEmail, mascararTelefone } from '../utils/mascara.util';

/**
 * Texto do código de recuperação de senha. É discreto de propósito: não cita o Amparo,
 * para não revelar o app a quem vir a mensagem (assim como o Modo Disfarce).
 */
export const MENSAGEM_CODIGO_RECUPERACAO = {
  assunto: 'Seu código de verificação',
  texto: (codigo: string) => `Seu código é ${codigo}. Vale por 15 minutos. Se você não pediu, ignore esta mensagem.`,
};

/**
 * Envio de mensagens às guardiãs (convite e pedido de ajuda) e do código de recuperação de senha.
 *
 * O envio ainda é SIMULADO: nada sai para WhatsApp ou SMS. O log registra só o telefone
 * mascarado. O link só aparece no log quando MOSTRAR_LINKS_SIMULADOS=1 e fora de produção,
 * para permitir testar a confirmação em desenvolvimento. Ao integrar um provedor real,
 * só este serviço muda.
 */
@Injectable()
export class MensagensService {
  private readonly logger = new Logger(MensagensService.name);

  urlPublica(): string {
    return (process.env.URL_PUBLICA || `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/+$/, '');
  }

  private mostrarLink(): boolean {
    return process.env.MOSTRAR_LINKS_SIMULADOS === '1' && process.env.NODE_ENV !== 'production';
  }

  enviarConvite(telefone: string, token: string): void {
    const link = `${this.urlPublica()}/convites/${token}`;
    this.logger.log(`[envio simulado] convite de guardiã para ${mascararTelefone(telefone)}.`);
    if (this.mostrarLink()) this.logger.log(`[envio simulado] link do convite: ${link}`);
  }

  /** Código de recuperação de senha, pelo canal que ela escolheu (e-mail ou SMS da conta). */
  enviarCodigoRecuperacao(canal: 'email' | 'sms', destino: string, codigo: string): void {
    const para = canal === 'email' ? mascararEmail(destino) : mascararTelefone(destino);
    this.logger.log(`[envio simulado] código de recuperação por ${canal === 'email' ? 'e-mail' : 'SMS'} para ${para}.`);
    if (this.mostrarLink()) this.logger.log(`[envio simulado] código de recuperação: ${codigo}`);
  }

  enviarPedidoDeAjuda(telefone: string, token: string): void {
    const link = `${this.urlPublica()}/alertas/${token}`;
    this.logger.log(`[envio simulado] pedido de ajuda para ${mascararTelefone(telefone)}.`);
    if (this.mostrarLink()) this.logger.log(`[envio simulado] link do pedido de ajuda: ${link}`);
  }
}
