import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsuariaThrottlerGuard } from './guards/usuaria-throttler.guard';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { UsuariasModule } from './modules/usuarias.module';
import { GuardioesModule } from './modules/guardioes.module';
import { OcorrenciasModule } from './modules/ocorrencias.module';
import { EmergenciasModule } from './modules/emergencias.module';
import { AuthModule } from './modules/auth.module';
import { MensagensModule } from './modules/mensagens.module';
import { ConfirmacoesModule } from './modules/confirmacoes.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ limit: 120, ttl: 60_000 }],
    }),
    AuthModule,
    MensagensModule,
    UsuariasModule,
    GuardioesModule,
    OcorrenciasModule,
    EmergenciasModule,
    ConfirmacoesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: UsuariaThrottlerGuard,
    }
  ],
})
export class AppModule {}
