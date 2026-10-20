import { Module } from '@nestjs/common';
import { UsuariasService } from '../services/usuarias.service';
import { RecuperacaoSenhaService } from '../services/recuperacao-senha.service';
import { UsuariasController } from '../controllers/usuarias.controller';

@Module({
  providers: [UsuariasService, RecuperacaoSenhaService],
  controllers: [UsuariasController]
})
export class UsuariasModule {}
