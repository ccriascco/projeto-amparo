import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Estes testes NÃO gravam dados: exercitam apenas validação de entrada e
// autenticação, que são barradas antes de qualquer chamada ao banco.
// Não rodar fluxos de escrita contra o Supabase de produção.
describe('API (e2e, sem escrita no banco)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rotas protegidas recusam requisição sem token (401)', () => {
    return request(app.getHttpServer()).get('/guardioes').expect(401);
  });

  it('rotas protegidas recusam token forjado (401)', () => {
    return request(app.getHttpServer())
      .get('/ocorrencias')
      .set('Authorization', 'Bearer token.falso.aqui')
      .expect(401);
  });

  it('cadastro com corpo vazio é recusado (400)', () => {
    return request(app.getHttpServer()).post('/usuarias').send({}).expect(400);
  });

  it('cadastro com campo extra não permitido é recusado (400)', () => {
    return request(app.getHttpServer())
      .post('/usuarias')
      .send({ cpf: '12345678901', email: 'a@a.com', nivel_risco: 'Alto' })
      .expect(400);
  });

  it('login com e-mail inválido é recusado (400)', () => {
    return request(app.getHttpServer())
      .post('/usuarias/login')
      .send({ email: 'nao-e-email', senha: '123' })
      .expect(400);
  });

  it('autenticação tem prioridade sobre validação do payload (401)', () => {
    return request(app.getHttpServer())
      .post('/emergencias/acionar')
      .set('Authorization', 'Bearer token.falso.aqui')
      .send({ latitude: 999, longitude: 10 })
      .expect(401);
  });
});
