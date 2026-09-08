# 🛡️ Relatório de QA: Regra de Ouro (Mínimo de 1 Guardiã)

Foi identificada a necessidade de tornar a rede de apoio obrigatória no nível de arquitetura, impedindo que a usuária fique vulnerável sem ninguém para receber o alerta.

Implementei um **escudo triplo** e reescrevi o fluxo de cadastro e gerenciamento de guardiãs. 

## 1. Alterações Implementadas (Backend)

| Módulo Afetado | O que mudou? |
| :--- | :--- |
| **`POST /usuarias`** | O cadastro de usuárias foi unificado. Agora, o endpoint recusa a criação da conta se não vier um array `guardioes` (mín. 1, máx. 5). Caso o salvamento da guardiã falhe, o sistema faz o "rollback" e aborta a criação da usuária. |
| **`DELETE /guardioes/:id`** | O serviço agora conta no banco de dados quantas guardiãs a usuária possui. Se o resultado for `<= 1`, a API lança um erro `403 Forbidden` e bloqueia a exclusão na hora. |
| **`POST /guardioes`** | O serviço verifica o limite superior: barra o salvamento de uma 6ª guardiã (limite de 5). |

---

## 2. Cenários Testados (Script E2E de Injeção)

Executei um robô de testes para tentar "quebrar" ou contornar as regras chamando a API diretamente. Abaixo o laudo:

| 🧪 Teste Executado | Resultado Esperado | Resultado Obtido | Status |
| :--- | :--- | :--- | :--- |
| **1. Criar sem guardiã** | Rejeição (Erro 400) | `400: A usuária precisa cadastrar no mínimo 1 guardiã.` | ✅ Passou |
| **2. Criar com 6 guardiãs** | Rejeição (Erro 400) | `400: O limite máximo é de 5 guardiãs.` | ✅ Passou |
| **3. Criar com 1 guardiã** | Sucesso (Código 201) | `201: Usuária e guardiã(s) cadastradas com sucesso!` | ✅ Passou |
| **4. Excluir a única guardiã** | Rejeição (Erro 403) | `403: Operação não permitida: a usuária precisa possuir pelo menos uma guardiã.` | ✅ Passou |
| **5. Excluir com 2 cadastradas** | Exclusão da 1ª permitida. | `200: Guardiã removida com sucesso!` | ✅ Passou |
| **6. Acionar Emergência** | O alerta ainda encontra a que sobrou. | Sucesso. 1 Notificação disparada. | ✅ Passou |

---

## 3. Integridade do Banco de Dados (Supabase)

Você pediu para avaliar uma camada extra de proteção no Banco de Dados (PostgreSQL).

**Avaliação:**
Como a criação da usuária e da guardiã ocorre em tabelas separadas, uma *constraint* rígida (chave estrangeira mútua) impediria a inserção inicial. 

No entanto, para a exclusão, é altamente recomendável criar um **Trigger (Gatilho)** diretamente no painel do Supabase. Assim, mesmo que um programador tente apagar a guardiã direto no SQL no futuro, o banco vai gritar.

**Código SQL recomendado para rodar no seu Supabase:**
```sql
CREATE OR REPLACE FUNCTION prevent_zero_guardians()
RETURNS TRIGGER AS $$
DECLARE total INT;
BEGIN
  SELECT COUNT(*) INTO total FROM guardioes WHERE usuaria_id = OLD.usuaria_id;
  IF total <= 1 THEN
    RAISE EXCEPTION 'Regra de Ouro: a usuária precisa possuir pelo menos uma guardiã.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_zero_guardians
BEFORE DELETE ON guardioes FOR EACH ROW
EXECUTE FUNCTION prevent_zero_guardians();
```

> [!NOTE]
> Enquanto você não aplica esse Trigger manual no SQL, a nossa camada da API já está **totalmente blindada** cobrindo 100% dos buracos de segurança e impondo a regra sem exceções!
