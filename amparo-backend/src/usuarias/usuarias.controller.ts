import { Controller, Post, Body, Delete } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsuariasService } from './usuarias.service';
import { Public } from '../auth/public.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CadastrarUsuariaDto } from './dto/cadastrar-usuaria.dto';
import { LoginDto } from './dto/login.dto';
import { ExcluirContaDto } from './dto/excluir-conta.dto';

@Controller('usuarias')
export class UsuariasController {
  constructor(private readonly usuariasService: UsuariasService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  async cadastrar(@Body() body: CadastrarUsuariaDto) {
    return await this.usuariasService.cadastrar(body);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(@Body() body: LoginDto) {
    return await this.usuariasService.login(body);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login-disfarcado')
  async loginDisfarcado(@Body() body: LoginDto) {
    return await this.usuariasService.loginDisfarcado(body);
  }

  @Post('logout')
  async logout(@CurrentUser() user: any) {
    return await this.usuariasService.logout(user.id, user.jti, user.exp);
  }

  @Delete('me')
  async excluirConta(@Body() body: ExcluirContaDto, @CurrentUser() user: any) {
    return await this.usuariasService.excluirConta(user.id, body.senha);
  }
}
