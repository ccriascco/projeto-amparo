import { Module } from '@nestjs/common';
import { EmergenciasService } from './emergencias.service';
import { EmergenciasController } from './emergencias.controller';

@Module({
  providers: [EmergenciasService],
  controllers: [EmergenciasController]
})
export class EmergenciasModule {}
