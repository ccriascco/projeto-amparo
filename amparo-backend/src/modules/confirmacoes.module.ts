import { Module } from '@nestjs/common';
import { GuardioesModule } from './guardioes.module';
import { EmergenciasModule } from './emergencias.module';
import { ConfirmacoesController } from '../controllers/confirmacoes.controller';

@Module({
  imports: [GuardioesModule, EmergenciasModule],
  controllers: [ConfirmacoesController],
})
export class ConfirmacoesModule {}
