import { Controller, Post, Get, Put, Delete, Body, Param } from '@nestjs/common';
import { GuardioesService } from '../services/guardioes.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CriarGuardiaoDto } from '../models/dto/guardioes/criar-guardiao.dto';
import { AtualizarGuardiaoDto } from '../models/dto/guardioes/atualizar-guardiao.dto';

@Controller('guardioes')
export class GuardioesController {
  constructor(private readonly guardioesService: GuardioesService) {}

  @Post()
  async cadastrar(@Body() body: CriarGuardiaoDto, @CurrentUser() user: any) {
    return await this.guardioesService.cadastrar({ ...body, usuaria_id: user.id });
  }

  @Get()
  async listarMeusGuardioes(@CurrentUser() user: any) {
    return await this.guardioesService.listarPorUsuaria(user.id);
  }

  @Put(':id')
  async atualizar(@Param('id') id: string, @Body() body: AtualizarGuardiaoDto, @CurrentUser() user: any) {
    return await this.guardioesService.atualizar(id, body, user.id);
  }

  @Post(':id/convite')
  async reenviarConvite(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.guardioesService.reenviarConvite(id, user.id);
  }

  @Delete(':id')
  async remover(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.guardioesService.remover(id, user.id);
  }
}
