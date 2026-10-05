import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcorrenciasService } from './ocorrencias.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { CriarOcorrenciaDto } from './dto/criar-ocorrencia.dto';
import { AtualizarOcorrenciaDto } from './dto/atualizar-ocorrencia.dto';
import { ListarOcorrenciasQueryDto } from './dto/listar-ocorrencias-query.dto';
import { TIPOS_ARQUIVO_PERMITIDOS } from '../common/tipo-arquivo.util';

@Controller('ocorrencias')
export class OcorrenciasController {
  constructor(private readonly ocorrenciasService: OcorrenciasService) {}

  @Post()
  async criar(@Body() body: CriarOcorrenciaDto, @CurrentUser() user: any) {
    return await this.ocorrenciasService.criar({ ...body, usuaria_id: user.id });
  }

  @Post(':id/evidencias')
  @UseInterceptors(FileInterceptor('arquivo', {
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (TIPOS_ARQUIVO_PERMITIDOS.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new HttpException('Formato não suportado', HttpStatus.UNSUPPORTED_MEDIA_TYPE), false);
      }
    }
  }))
  async anexarEvidencia(
    @Param('id') id: string,
    @UploadedFile() arquivo: any,
    @Body('tipo') tipo: string,
    @CurrentUser() user: any,
  ) {
    if (!arquivo) throw new HttpException('Nenhum arquivo válido foi recebido.', HttpStatus.BAD_REQUEST);
    return await this.ocorrenciasService.anexarEvidencia(id, tipo, arquivo, user.id);
  }

  @Get(':id/evidencias/:evidenciaId')
  async linkEvidencia(@Param('id') id: string, @Param('evidenciaId') evidenciaId: string, @CurrentUser() user: any) {
    return await this.ocorrenciasService.linkEvidencia(id, evidenciaId, user.id);
  }

  @Get()
  async listarMinhas(@Query() query: ListarOcorrenciasQueryDto, @CurrentUser() user: any) {
    return await this.ocorrenciasService.listarPorUsuaria(user.id, query.limit, query.offset);
  }

  @Get(':id')
  async buscar(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.ocorrenciasService.buscarPorId(id, user.id);
  }

  @Put(':id')
  async atualizar(@Param('id') id: string, @Body() body: AtualizarOcorrenciaDto, @CurrentUser() user: any) {
    return await this.ocorrenciasService.atualizar(id, body, user.id);
  }

  @Delete(':id')
  async remover(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.ocorrenciasService.remover(id, user.id);
  }
}
