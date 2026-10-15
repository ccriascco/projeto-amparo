# Histórico de QA e treinamentos

Scripts guardados como registro. Nenhum deles faz parte do build, dos testes automáticos ou do deploy.

| Pasta | Conteúdo | Origem |
|---|---|---|
| `qa-backend/` | `qa_e2e_5.js`, `qa_e2e_5_personas.js`, `qa_e2e_master.js`: roteiros manuais de QA da API (base dos relatórios `relatorio_e2e_*.md` em `Relatorios/`) | `amparo-backend/` |
| `qa-backend-antigos/` | `qa_emergencias.js`, `qa_guardian_rule.js`, `qa_jwt.js`: roteiros de QA das primeiras versões | `_backup_organizacao/amparo-backend/` |
| `ia/` | `treinamento.py`: primeiro script de treino do modelo, substituído por `amparo-ia/treinar_final.py` e `amparo-ia/pipeline_v2/` | `_backup_organizacao/amparo-ia/` |

**Não rode os scripts de `qa-backend/` sem revisar antes:** eles apontam para o Supabase de produção (`qa_e2e_master.js` sempre; os outros dois quando `SUPABASE_URL` não está definida) e criam dados nele. Os testes atuais (`npm run test:e2e` no `amparo-backend`) usam um banco em memória e cobrem esses fluxos.
