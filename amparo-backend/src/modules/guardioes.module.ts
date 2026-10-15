import { Module } from '@nestjs/common';
import { GuardioesService } from '../services/guardioes.service';
import { GuardioesController } from '../controllers/guardioes.controller';

@Module({
  controllers: [GuardioesController],
  providers: [GuardioesService],
  exports: [GuardioesService],
})
export class GuardioesModule {}
