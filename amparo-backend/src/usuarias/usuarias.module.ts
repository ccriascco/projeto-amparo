import { Module } from '@nestjs/common';
import { UsuariasService } from './usuarias.service';
import { UsuariasController } from './usuarias.controller';

@Module({
  providers: [UsuariasService],
  controllers: [UsuariasController]
})
export class UsuariasModule {}
