import { Module } from '@nestjs/common';
import { UsuariasService } from '../services/usuarias.service';
import { UsuariasController } from '../controllers/usuarias.controller';

@Module({
  providers: [UsuariasService],
  controllers: [UsuariasController]
})
export class UsuariasModule {}
