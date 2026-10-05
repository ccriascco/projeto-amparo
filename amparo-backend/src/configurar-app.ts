import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

export function configurarApp(app: INestApplication): void {
  app.use(helmet());
  // CORS: ainda não há painel web com domínio definido. Quando existir,
  // habilitar explicitamente com a(s) origem(ns) reais, ex.:
  // app.enableCors({ origin: ['https://app.amparo.exemplo'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
