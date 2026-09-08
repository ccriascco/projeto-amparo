# Plano de Modelagem Preditiva de Risco (Machine Learning)

Este documento define a estratégia rigorosa para treinamento, validação e teste do modelo de Inteligência Artificial do projeto Amparo, focado na prevenção à violência doméstica.

---

## 1. Tabelas Utilizadas e Justificativa
A base do modelo não analisa ocorrências isoladas, mas sim o **comportamento histórico da usuária**. O modelo terá uma visão agregada (Agrupamento por `usuaria_id`).

* **`ocorrencias`**: A tabela mais importante. O volume de registros e os tipos de agressão ditam o grau de periculosidade do agressor.
* **`emergencias`**: Um acionamento de emergência indica que a vítima esteve em risco iminente de vida. O peso dessa tabela no modelo é altíssimo.
* **`usuarias`**: Utilizaremos a `data_nascimento` para extrair a idade (fatores demográficos podem correlacionar com a vulnerabilidade financeira/emocional).

*(A tabela `rastreamento_gps` e `guardioes` não serão usadas na IA, pois são mecanismos de resposta a crises, e não fatores preditivos de risco).*

---

## 2. Campos Utilizados e Extração de Features (Variáveis Independentes)
Para que a IA entenda os dados, precisamos transformar as tabelas relacionais em um *Feature Set* tabular por usuária.

| Feature (Variável de Entrada) | Origem / Cálculo | Justificativa Clínica/Acadêmica |
| :--- | :--- | :--- |
| `idade` | `usuarias.data_nascimento` | Identificar vulnerabilidades ligadas a faixas etárias. |
| `qtd_ocorrencias_totais` | Contagem em `ocorrencias` | A habitualidade (repetição) é um forte indicador do Ciclo da Violência. |
| `dias_desde_ultima_ocorrencia` | Diferença de datas (`ocorrencias.criado_em`) | Mede a latência. Ocorrências muito recentes aumentam o risco imediato. |
| `frequencia_aumentou` | Cálculo (Ocorrências Mês Atual vs Mês Passado) | Detecta a "escalada da violência", um dos maiores preditores de feminicídio. |
| `teve_viol_fisica` | `ocorrencias.tipos_violencia` (One-hot encoding) | Presença de violência física eleva drasticamente a chance de risco à vida. |
| `teve_viol_sexual` | `ocorrencias.tipos_violencia` (One-hot encoding) | Indicador gravíssimo de perda de limites por parte do agressor. |
| `teve_ameaca` | `ocorrencias.tipos_violencia` (One-hot encoding) | Ameaças de morte (implícitas ou explícitas) antecedem atos fatais. |
| `qtd_panico_acionado` | Contagem em `emergencias` | Indica quantas vezes a usuária sentiu que sua vida estava em jogo. |

---

## 3. A Variável Alvo (Target)
A variável que o modelo deve prever será o **`nivel_risco`**.
* **0 (Baixo)**: Violência psicológica/moral esporádica.
* **1 (Médio)**: Repetição de episódios, presença de ameaças ou dependência.
* **2 (Alto)**: Presença de violência física, sexual, escalada de frequência ou uso do botão do pânico.

> **Nota para o TCC:** Como não temos dados médicos reais (sigilo judicial), o nosso "Ground Truth" (gabarito) para treinar a IA será gerado por um algoritmo baseado no **Formulário Nacional de Avaliação de Risco** (instituído pela Lei Maria da Penha e CNJ).

---

## 4. Tratamento e Qualidade dos Dados

1. **Dados Ausentes (Missing Values):** 
   * Se a usuária não tem data de nascimento, imputaremos a mediana das idades.
   * Se `dias_desde_ultima_ocorrencia` for nulo (só teve 1 registro hoje), usaremos o valor `0`.
2. **Dados Duplicados / Inconsistentes:**
   * **Debounce de Emergência:** Se o botão do pânico falhar e criar 5 registros em 1 minuto, nosso script de pré-processamento agrupará isso como 1 única emergência para não distorcer o modelo.
3. **Normalização (Scaling):**
   * Features como `qtd_ocorrencias_totais` e `idade` têm escalas muito diferentes. Usaremos `StandardScaler` (Z-score) para deixar tudo na mesma proporção, ajudando algoritmos sensíveis à escala (como SVM ou Regressão Logística).

---

## 5. Divisão de Dados e Prevenção de Data Leakage (Vazamento)
A divisão será **70% Treino, 15% Validação, 15% Teste**.
* **Prevenção de Vazamento Crítica:** A divisão será feita através de um *GroupShuffleSplit* pelo `usuaria_id`. 
* **Por quê?** Se uma usuária tem 5 ocorrências, todas as 5 devem cair apenas no Treino ou apenas no Teste. Se misturarmos, o modelo vai "decorar" o comportamento daquela usuária específica no Treino e trapacear no Teste.

---

## 6. Algoritmos de Machine Learning a serem Testados
Para o TCC, não testaremos apenas um, mas faremos uma bateria comparativa:
1. **Random Forest (Baseline):** Robusto, lida bem com dados desbalanceados e fornece a "Feature Importance" (quais variáveis a IA considerou mais importantes, ótimo para mostrar na banca).
2. **Regressão Logística Multinomial:** Altamente explicável.
3. **XGBoost / LightGBM:** Algoritmos state-of-the-art para dados tabulares, costumam entregar a maior precisão.
4. **Support Vector Machines (SVM):** Excelente para separar classes não-lineares, usaremos para benchmark.

---

## 7. Métricas de Avaliação e Estratégia de Erro
Neste problema de risco à vida, a **Acurácia Geral é inútil**. Se 90% dos casos são de Baixo Risco e a IA chutar "Baixo" para todos, ela terá 90% de acurácia, mas deixará 10% das mulheres de Alto Risco sem ajuda (Falso Negativo fatal).

**Métricas Principais:**
* **Recall (Sensibilidade) da classe "Alto Risco":** É a nossa Estrela-Guia. Queremos que, de todas as mulheres que *realmente* estão em alto risco, a IA identifique quase 100%. Aceitaremos mais Falsos Positivos (dar alarme falso) para garantir zero Falsos Negativos (ignorar quem precisa de ajuda).
* **F1-Score (Macro):** Média harmônica para lidar com o desbalanceamento das classes.
* **Matriz de Confusão:** Prova visual para a banca de onde a IA está errando.

---

## 8. Critérios de Sucesso para Integração
A IA só será conectada ao back-end (Fase 4) quando:
1. Atingir **Recall > 95%** para a classe de Alto Risco.
2. Atingir **F1-Score Geral > 85%**.
3. Passar na validação cruzada (Cross-Validation com k=5) demonstrando estabilidade sem Overfitting.
