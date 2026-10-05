import {
  Controller,
  Post,
  Get,
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
import { ListarOcorrenciasQueryDto } from './dto/listar-ocorrencias-query.dto';

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
      const permitidos = [
        'image/jpeg', 'image/png', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/webm',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'
      ];
      if (permitidos.includes(file.mimetype)) {
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

  @Get()
  async listarMinhas(@Query() query: ListarOcorrenciasQueryDto, @CurrentUser() user: any) {
    return await this.ocorrenciasService.listarPorUsuaria(user.id, query.limit, query.offset);
  }

  @Delete(':id')
  async remover(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.ocorrenciasService.remover(id, user.id);
  }
}
