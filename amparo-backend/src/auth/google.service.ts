import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

export type IdentidadeGoogle = { sub: string; email: string; nome: string };

/**
 * Confere o id_token emitido pelo Google Sign-In no app.
 * Só aceita tokens emitidos para os nossos IDs de cliente (GOOGLE_CLIENT_IDS, separados por vírgula)
 * e com o e-mail verificado pelo Google.
 */
@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);
  private readonly cliente = new OAuth2Client();

  private idsDeCliente(): string[] {
    return (process.env.GOOGLE_CLIENT_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async verificar(idToken: string): Promise<IdentidadeGoogle> {
    const audiencia = this.idsDeCliente();
    if (audiencia.length === 0) {
      throw new HttpException({ erro: 'Login com Google ainda não está configurado.' }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    let payload;
    try {
      const ticket = await this.cliente.verifyIdToken({ idToken, audience: audiencia });
      payload = ticket.getPayload();
    } catch (erro) {
      this.logger.warn(`id_token do Google recusado: ${(erro as Error).message}`);
      throw new HttpException({ erro: 'Não foi possível confirmar sua conta Google. Tente de novo.' }, HttpStatus.UNAUTHORIZED);
    }
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new HttpException({ erro: 'Sua conta Google precisa ter um e-mail verificado.' }, HttpStatus.UNAUTHORIZED);
    }
    return { sub: payload.sub, email: payload.email.toLowerCase(), nome: payload.name ?? '' };
  }
}
