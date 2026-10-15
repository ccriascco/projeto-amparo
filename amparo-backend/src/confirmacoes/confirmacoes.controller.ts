import { Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { GuardioesService } from '../guardioes/guardioes.service';
import { EmergenciasService } from '../emergencias/emergencias.service';
import { horaBrasil, pagina } from './pagina';

const LINK_INVALIDO = pagina({
  titulo: 'Link inválido',
  paragrafos: ['Este link não existe mais ou foi digitado errado. Peça para a pessoa enviar de novo.'],
});

/**
 * Links abertos pelas guardiãs: confirmar o convite e confirmar que viu um pedido de ajuda.
 * Rotas públicas; o token de 256 bits do link é a autorização (no banco fica só o hash).
 */
@Public()
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller()
export class ConfirmacoesController {
  constructor(
    private readonly guardioes: GuardioesService,
    private readonly emergencias: EmergenciasService,
  ) {}

  @Get('convites/:token')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async verConvite(@Param('token') token: string, @Res({ passthrough: true }) res: Response) {
    const convite = await this.guardioes.buscarConvite(token);
    if (!convite) {
      res.status(404);
      return LINK_INVALIDO;
    }
    if (convite.status === 'CONFIRMADO') {
      return pagina({ titulo: 'Convite confirmado', paragrafos: [`Você já é uma pessoa de confiança de ${convite.primeiroNome}. Obrigada!`] });
    }
    return pagina({
      titulo: 'Você foi escolhida como pessoa de confiança',
      paragrafos: [
        `${convite.primeiroNome} escolheu você para a rede de confiança dela.`,
        'Se um dia ela precisar de ajuda, você vai receber uma mensagem com a localização dela naquele momento. Fora isso, você não recebe nada.',
      ],
      acao: { url: `/convites/${token}/confirmar`, rotulo: 'Aceitar' },
    });
  }

  @Post('convites/:token/confirmar')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async confirmarConvite(@Param('token') token: string, @Res({ passthrough: true }) res: Response) {
    const convite = await this.guardioes.confirmarConvite(token);
    if (!convite) {
      res.status(404);
      return LINK_INVALIDO;
    }
    res.status(200);
    return pagina({ titulo: 'Convite confirmado', paragrafos: [`Pronto! Agora você faz parte da rede de confiança de ${convite.primeiroNome}.`] });
  }

  @Get('alertas/:token')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async verAlerta(@Param('token') token: string, @Res({ passthrough: true }) res: Response) {
    const alerta = await this.emergencias.buscarAlerta(token);
    if (!alerta) {
      res.status(404);
      return LINK_INVALIDO;
    }
    return this.paginaAlerta(token, alerta);
  }

  @Post('alertas/:token/confirmar')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async confirmarAlerta(@Param('token') token: string, @Res({ passthrough: true }) res: Response) {
    const alerta = await this.emergencias.confirmarAlerta(token);
    if (!alerta) {
      res.status(404);
      return LINK_INVALIDO;
    }
    res.status(200);
    return this.paginaAlerta(token, alerta);
  }

  private paginaAlerta(token: string, alerta: NonNullable<Awaited<ReturnType<EmergenciasService['buscarAlerta']>>>) {
    if (!alerta.ativa) {
      return pagina({ titulo: 'Pedido encerrado', paragrafos: [`O pedido de ajuda de ${alerta.primeiroNome} foi encerrado.`] });
    }
    const paragrafos = [`${alerta.primeiroNome} pediu ajuda às ${horaBrasil(alerta.acionadoEm)}.`];
    const ponto = alerta.ultimoPonto;
    if (ponto) {
      paragrafos.push(`Última localização recebida às ${horaBrasil(ponto.registrado_em)}. A página mostra a mais recente sempre que for aberta de novo.`);
    } else {
      paragrafos.push('A localização ainda não chegou. Abra este link de novo em alguns instantes.');
    }
    if (alerta.confirmado) paragrafos.push('Você já confirmou que viu este pedido.');
    return pagina({
      titulo: 'Pedido de ajuda',
      paragrafos,
      link: ponto
        ? { url: `https://www.google.com/maps/search/?api=1&query=${ponto.latitude},${ponto.longitude}`, rotulo: 'Ver no mapa' }
        : undefined,
      acao: alerta.confirmado ? undefined : { url: `/alertas/${token}/confirmar`, rotulo: 'Confirmar que vi' },
    });
  }
}
