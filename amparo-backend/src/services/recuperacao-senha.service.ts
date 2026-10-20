import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { criarClienteSupabase } from '../config/supabase';
import type { CanalRecuperacao } from '../models/dto/usuarias/recuperacao-senha.dto';
import { erroDoBanco, tratarErro } from '../utils/erro.util';
import { MensagensService } from './mensagens.service';
import { SessoesService } from './sessoes.service';

export const VALIDADE_CODIGO_MIN = 15;
export const MAX_TENTATIVAS_RECUPERACAO = 5;

// A resposta é a mesma exista ou não uma conta com o e-mail: ninguém descobre por aqui
// que ela tem conta no Amparo.
export const RESPOSTA_PEDIDO = {
  mensagem: `Se houver uma conta com esse e-mail, enviamos um código. Ele vale por ${VALIDADE_CODIGO_MIN} minutos.`,
};
const CODIGO_INVALIDO = { erro: 'Código inválido ou expirado. Peça um novo código.' };
// Comparado quando o e-mail não existe, para o tempo de resposta não revelar a diferença
const HASH_FICTICIO = bcrypt.hashSync('000000', 10);

const gerarCodigo = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

type Conta = { id: string; email: string; telefone: string | null };

/**
 * "Esqueci a senha": envia um código de 6 números pelo canal que ela escolher
 * (e-mail ou SMS da conta) e troca a senha com esse código. Depois da troca,
 * todos os aparelhos conectados saem da conta.
 */
@Injectable()
export class RecuperacaoSenhaService {
  private supabase = criarClienteSupabase();

  constructor(
    private sessoes: SessoesService,
    private mensagens: MensagensService,
  ) {}

  async pedir(email: string, canal: CanalRecuperacao) {
    try {
      const codigo = gerarCodigo();
      const codigoHash = await bcrypt.hash(codigo, 10);
      const conta = await this.buscarConta(email);
      const destino = conta ? (canal === 'email' ? conta.email : conta.telefone) : null;
      if (!conta || !destino) return RESPOSTA_PEDIDO;

      // Só um pedido aberto por vez: o código anterior deixa de valer
      const { error: erroApagar } = await this.supabase.from('recuperacoes_senha').delete().eq('usuaria_id', conta.id);
      if (erroApagar) throw erroDoBanco(erroApagar);
      const { error } = await this.supabase.from('recuperacoes_senha').insert({
        usuaria_id: conta.id,
        codigo_hash: codigoHash,
        canal,
        expira_em: new Date(Date.now() + VALIDADE_CODIGO_MIN * 60_000).toISOString(),
      });
      if (error) throw erroDoBanco(error);

      this.mensagens.enviarCodigoRecuperacao(canal, destino, codigo);
      return RESPOSTA_PEDIDO;
    } catch (error) {
      throw tratarErro(error, 'Não foi possível enviar o código agora. Tente de novo.');
    }
  }

  async redefinir(email: string, codigo: string, novaSenha: string) {
    try {
      const conta = await this.buscarConta(email);
      if (!conta) {
        await bcrypt.compare(codigo, HASH_FICTICIO);
        throw new HttpException(CODIGO_INVALIDO, HttpStatus.BAD_REQUEST);
      }

      const { data: pedido, error } = await this.supabase
        .from('recuperacoes_senha')
        .select('id, codigo_hash, expira_em, tentativas')
        .eq('usuaria_id', conta.id)
        .maybeSingle();
      if (error) throw erroDoBanco(error);
      if (!pedido || new Date(pedido.expira_em).getTime() <= Date.now() || pedido.tentativas >= MAX_TENTATIVAS_RECUPERACAO) {
        throw new HttpException(CODIGO_INVALIDO, HttpStatus.BAD_REQUEST);
      }

      if (!(await bcrypt.compare(codigo, pedido.codigo_hash))) {
        const { error: erroTentativa } = await this.supabase
          .from('recuperacoes_senha')
          .update({ tentativas: pedido.tentativas + 1 })
          .eq('id', pedido.id);
        if (erroTentativa) throw erroDoBanco(erroTentativa);
        throw new HttpException(CODIGO_INVALIDO, HttpStatus.BAD_REQUEST);
      }

      // Uso único: só segue quem conseguiu apagar o pedido (dois envios ao mesmo tempo não valem duas vezes)
      const { data: usados, error: erroUso } = await this.supabase
        .from('recuperacoes_senha')
        .delete()
        .eq('id', pedido.id)
        .select('id');
      if (erroUso) throw erroDoBanco(erroUso);
      if (!usados?.length) throw new HttpException(CODIGO_INVALIDO, HttpStatus.BAD_REQUEST);

      const { error: erroSenha } = await this.supabase
        .from('usuarias')
        .update({ senha_hash: await bcrypt.hash(novaSenha, 10), senha_alterada_em: new Date().toISOString() })
        .eq('id', conta.id);
      if (erroSenha) throw erroDoBanco(erroSenha);

      // Quem sabia a senha antiga e estava conectado em outro aparelho perde o acesso
      await this.sessoes.apagarOutras(conta.id);
      return { mensagem: 'Senha alterada. Entre com a nova senha.' };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível alterar a senha agora. Tente de novo.');
    }
  }

  private async buscarConta(email: string): Promise<Conta | null> {
    const limpo = email.trim();
    for (const valor of new Set([limpo, limpo.toLowerCase()])) {
      const { data, error } = await this.supabase.from('usuarias').select('id, email, telefone').eq('email', valor).maybeSingle();
      if (error) throw erroDoBanco(error);
      if (data) return data;
    }
    return null;
  }
}
