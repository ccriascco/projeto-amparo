import { Module } from '@nestjs/common';
import { OcorrenciasService } from '../services/ocorrencias.service';
import { OcorrenciasController } from '../controllers/ocorrencias.controller';

@Module({
  providers: [OcorrenciasService],
  controllers: [OcorrenciasController]
})
export class OcorrenciasModule {}
