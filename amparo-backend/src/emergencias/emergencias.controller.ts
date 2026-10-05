import { Controller, Post, Body, Param, Get, UnauthorizedException } from '@nestjs/common';
import { EmergenciasService } from './emergencias.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AcionarEmergenciaDto } from './dto/acionar-emergencia.dto';
import { AtualizarLocalizacaoDto } from './dto/atualizar-localizacao.dto';

@Controller('emergencias')
export class EmergenciasController {
  constructor(private readonly emergenciasService: EmergenciasService) {}

  @Post('acionar')
  async acionar(@Body() body: AcionarEmergenciaDto, @CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new UnauthorizedException('Usuária não identificada no JWT');
    }
    return await this.emergenciasService.acionar(body, user.id);
  }

  @Post(':id/localizacao')
  async atualizarLocalizacao(@Param('id') id: string, @Body() body: AtualizarLocalizacaoDto, @CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new UnauthorizedException('Usuária não identificada no JWT');
    }
    return await this.emergenciasService.atualizarLocalizacao(id, body, user.id);
  }

  @Post(':id/encerrar')
  async encerrar(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new UnauthorizedException('Usuária não identificada no JWT');
    }
    return await this.emergenciasService.encerrar(id, user.id);
  }

  @Get(':id/rota')
  async listarRota(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new UnauthorizedException('Usuária não identificada no JWT');
    }
    return await this.emergenciasService.listarRota(id, user.id);
  }
}
