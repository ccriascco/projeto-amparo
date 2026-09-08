import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { EmergenciasService } from './emergencias.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('emergencias')
export class EmergenciasController {
  constructor(private readonly emergenciasService: EmergenciasService) {}

  @Post('acionar')
  async acionar(@Body() body: any, @CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new Error("Usuária não identificada no JWT");
    }
    // Força o ID do body ser o do usuário autenticado para evitar falsidade
    body.usuaria_id = user.id;
    return await this.emergenciasService.acionar(body, user.id);
  }

  @Post(':id/localizacao')
  async atualizarLocalizacao(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new Error("Usuária não identificada no JWT");
    }
    return await this.emergenciasService.atualizarLocalizacao(id, body, user.id);
  }

  @Post(':id/encerrar')
  async encerrar(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new Error("Usuária não identificada no JWT");
    }
    return await this.emergenciasService.encerrar(id, user.id);
  }

  @Get(':id/rota')
  async listarRota(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new Error("Usuária não identificada no JWT");
    }
    return await this.emergenciasService.listarRota(id, user.id);
  }
}
