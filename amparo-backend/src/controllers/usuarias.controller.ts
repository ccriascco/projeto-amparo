import { Controller, Post, Body, Delete, Get, Patch, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsuariasService } from '../services/usuarias.service';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CadastrarUsuariaDto } from '../models/dto/usuarias/cadastrar-usuaria.dto';
import { LoginDto } from '../models/dto/usuarias/login.dto';
import { ExcluirContaDto } from '../models/dto/usuarias/excluir-conta.dto';
import { LoginGoogleDto, LogoutDto, RenovarSessaoDto } from '../models/dto/usuarias/sessao.dto';
import { AtualizarPerfilDto, TrocarCodigoDto, TrocarSenhaDto } from '../models/dto/usuarias/perfil.dto';

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
  @Post('login-google')
  async loginGoogle(@Body() body: LoginGoogleDto) {
    return await this.usuariasService.loginGoogle(body.id_token);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('sessao/renovar')
  async renovarSessao(@Body() body: RenovarSessaoDto) {
    return await this.usuariasService.renovarSessao(body.refresh_token, body.codigo);
  }

  @Post('logout')
  async logout(@Body() body: LogoutDto, @CurrentUser() user: any) {
    return await this.usuariasService.logout(user.id, user.jti, user.exp, user.sid, body?.refresh_token);
  }

  @Get('me')
  async perfil(@CurrentUser() user: any) {
    return await this.usuariasService.perfil(user.id);
  }

  @Patch('me')
  async atualizarPerfil(@Body() body: AtualizarPerfilDto, @CurrentUser() user: any) {
    return await this.usuariasService.atualizarPerfil(user.id, body);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Put('me/senha')
  async trocarSenha(@Body() body: TrocarSenhaDto, @CurrentUser() user: any) {
    return await this.usuariasService.trocarSenha(user.id, user.sid, body.senha_atual, body.nova_senha);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Put('me/codigo')
  async trocarCodigo(@Body() body: TrocarCodigoDto, @CurrentUser() user: any) {
    return await this.usuariasService.trocarCodigo(user.id, body.codigo_atual, body.codigo_novo);
  }

  @Delete('me')
  async excluirConta(@Body() body: ExcluirContaDto, @CurrentUser() user: any) {
    return await this.usuariasService.excluirConta(user.id, body);
  }
}
