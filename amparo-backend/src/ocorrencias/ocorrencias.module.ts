import { Module } from '@nestjs/common';
import { OcorrenciasService } from './ocorrencias.service';
import { OcorrenciasController } from './ocorrencias.controller';

@Module({
  providers: [OcorrenciasService],
  controllers: [OcorrenciasController]
})
export class OcorrenciasModule {}
