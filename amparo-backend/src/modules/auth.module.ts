import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TokensService } from '../services/tokens.service';
import { SessoesService } from '../services/sessoes.service';
import { GoogleService } from '../services/google.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '2h') as any },
      }),
    }),
  ],
  providers: [TokensService, SessoesService, GoogleService],
  exports: [JwtModule, TokensService, SessoesService, GoogleService],
})
export class AuthModule {}
