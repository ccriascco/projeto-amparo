import { Module } from '@nestjs/common';
import { EmergenciasService } from '../services/emergencias.service';
import { EmergenciasController } from '../controllers/emergencias.controller';

@Module({
  providers: [EmergenciasService],
  exports: [EmergenciasService],
  controllers: [EmergenciasController]
})
export class EmergenciasModule {}
