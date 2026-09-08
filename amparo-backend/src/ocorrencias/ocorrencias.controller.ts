import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcorrenciasService } from './ocorrencias.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('ocorrencias')
export class OcorrenciasController {
  constructor(private readonly ocorrenciasService: OcorrenciasService) {}

  @Post()
  async criar(@Body() body: any, @CurrentUser() user: any) {
    body.usuaria_id = user.id; // Sobrescreve para ignorar o que vier no payload
    return await this.ocorrenciasService.criar(body);
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
  async listarMinhas(@CurrentUser() user: any) {
    return await this.ocorrenciasService.listarPorUsuaria(user.id);
  }

  @Delete(':id')
  async remover(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.ocorrenciasService.remover(id, user.id);
  }
}
