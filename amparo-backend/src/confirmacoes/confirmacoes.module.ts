import { Module } from '@nestjs/common';
import { GuardioesModule } from '../guardioes/guardioes.module';
import { EmergenciasModule } from '../emergencias/emergencias.module';
import { ConfirmacoesController } from './confirmacoes.controller';

@Module({
  imports: [GuardioesModule, EmergenciasModule],
  controllers: [ConfirmacoesController],
})
export class ConfirmacoesModule {}
