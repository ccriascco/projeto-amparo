import { Global, Module } from '@nestjs/common';
import { MensagensService } from './mensagens.service';

@Global()
@Module({
  providers: [MensagensService],
  exports: [MensagensService],
})
export class MensagensModule {}
