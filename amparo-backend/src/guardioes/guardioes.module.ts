import { Module } from '@nestjs/common';
import { GuardioesService } from './guardioes.service';
import { GuardioesController } from './guardioes.controller';

@Module({
  controllers: [GuardioesController],
  providers: [GuardioesService],
})
export class GuardioesModule {}
