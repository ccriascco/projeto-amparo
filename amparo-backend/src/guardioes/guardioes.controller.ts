import { Controller, Post, Get, Put, Delete, Body, Param } from '@nestjs/common';
import { GuardioesService } from './guardioes.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { CriarGuardiaoDto } from './dto/criar-guardiao.dto';
import { AtualizarGuardiaoDto } from './dto/atualizar-guardiao.dto';

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

  @Delete(':id')
  async remover(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.guardioesService.remover(id, user.id);
  }
}
