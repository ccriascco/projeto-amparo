import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsuariaThrottlerGuard } from './common/usuaria-throttler.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariasModule } from './usuarias/usuarias.module';
import { GuardioesModule } from './guardioes/guardioes.module';
import { OcorrenciasModule } from './ocorrencias/ocorrencias.module';
import { EmergenciasModule } from './emergencias/emergencias.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ limit: 120, ttl: 60_000 }],
    }),
    AuthModule,
    UsuariasModule,
    GuardioesModule,
    OcorrenciasModule,
    EmergenciasModule
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
