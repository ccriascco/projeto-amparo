import { Controller, Post, Body } from '@nestjs/common';
import { UsuariasService } from './usuarias.service';
import { Public } from '../auth/public.decorator';

@Controller('usuarias')
export class UsuariasController {
  constructor(private readonly usuariasService: UsuariasService) {}

  @Public()
  @Post()
  async cadastrar(@Body() body: any) {
    return await this.usuariasService.cadastrar(body);
  }

  @Public()
  @Post('login')
  async login(@Body() body: any) {
    return await this.usuariasService.login(body);
  }
}
