import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { TokensService } from './tokens.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private configService: ConfigService,
    private tokens: TokensService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Acesso negado: Token ausente.');
    }
    let payloadValido: { sub: string; jti?: string; exp: number };
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      payloadValido = payload;
    } catch {
      throw new UnauthorizedException('Acesso negado: Token inválido ou expirado.');
    }
    if (!payloadValido.jti || (await this.tokens.estaRevogado(payloadValido.jti))) {
      throw new UnauthorizedException('Sessão encerrada. Faça login novamente.');
    }
    if (!(await this.tokens.usuariaExiste(payloadValido.sub))) {
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
    }
    request['user'] = { id: payloadValido.sub, jti: payloadValido.jti, exp: payloadValido.exp };
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
