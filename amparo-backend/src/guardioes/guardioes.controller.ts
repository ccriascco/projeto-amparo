import { Controller, Post, Get, Put, Delete, Body, Param } from '@nestjs/common';
import { GuardioesService } from './guardioes.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('guardioes')
export class GuardioesController {
  constructor(private readonly guardioesService: GuardioesService) {}

  @Post()
  async cadastrar(@Body() body: any, @CurrentUser() user: any) {
    body.usuaria_id = user.id;
    return await this.guardioesService.cadastrar(body);
  }

  @Get()
  async listarMeusGuardioes(@CurrentUser() user: any) {
    return await this.guardioesService.listarPorUsuaria(user.id);
  }

  @Put(':id')
  async atualizar(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return await this.guardioesService.atualizar(id, body, user.id);
  }

  @Delete(':id')
  async remover(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.guardioesService.remover(id, user.id);
  }
}
