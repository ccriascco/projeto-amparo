import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

function contexto(token?: string) {
  const request: any = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  return {
    request,
    ctx: {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as any,
  };
}

describe('JwtAuthGuard (revogação e exclusão de conta)', () => {
  let tokens: { estaRevogado: jest.Mock; usuariaExiste: jest.Mock };
  let jwt: { verifyAsync: jest.Mock };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    tokens = { estaRevogado: jest.fn().mockResolvedValue(false), usuariaExiste: jest.fn().mockResolvedValue(true) };
    jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'u1', jti: 'j1', exp: 9999999999 }) };
    guard = new JwtAuthGuard(jwt as any, { getAllAndOverride: () => false } as any, { get: () => 'segredo' } as any, tokens as any);
  });

  it('aceita token válido e expõe id, jti e exp para o restante da requisição', async () => {
    const { ctx, request } = contexto('tok');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1', jti: 'j1', exp: 9999999999 });
  });

  it('recusa token revogado pelo logout', async () => {
    tokens.estaRevogado.mockResolvedValue(true);
    await expect(guard.canActivate(contexto('tok').ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('recusa token sem jti (sessões antigas, emitidas antes do logout existir)', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', exp: 9999999999 });
    await expect(guard.canActivate(contexto('tok').ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('recusa token de conta que foi excluída', async () => {
    tokens.usuariaExiste.mockResolvedValue(false);
    await expect(guard.canActivate(contexto('tok').ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
