import pandas as pd
import numpy as np
import uuid

# Configuração de reprodutibilidade
np.random.seed(42)
TAMANHO_DATASET = 10000

print("Iniciando geração de dados sintéticos para o TCC...")

# Gerando IDs de Usuárias
usuaria_ids = [str(uuid.uuid4()) for _ in range(TAMANHO_DATASET)]

# Gerando Features Básicas
idades = np.random.normal(loc=35, scale=10, size=TAMANHO_DATASET)
idades = np.clip(idades, 18, 75).astype(int)

# Distribuição enviesada (maioria tem poucas ocorrências)
qtd_ocorrencias = np.random.poisson(lam=2, size=TAMANHO_DATASET)

# Probabilidades de tipos de violência baseadas nas ocorrências
teve_fisica = np.where(qtd_ocorrencias > 0, np.random.choice([0, 1], size=TAMANHO_DATASET, p=[0.7, 0.3]), 0)
teve_sexual = np.where(qtd_ocorrencias > 0, np.random.choice([0, 1], size=TAMANHO_DATASET, p=[0.9, 0.1]), 0)
teve_ameaca = np.where(qtd_ocorrencias > 0, np.random.choice([0, 1], size=TAMANHO_DATASET, p=[0.4, 0.6]), 0)

# Se teve ocorrência, definimos dias desde a última (0 a 180 dias)
dias_ultima_ocorrencia = np.where(qtd_ocorrencias > 0, np.random.randint(0, 180, size=TAMANHO_DATASET), 999)

frequencia_aumentou = np.where(qtd_ocorrencias >= 2, np.random.choice([0, 1], size=TAMANHO_DATASET, p=[0.6, 0.4]), 0)

# Botão do pânico é raro, mas altamente correlacionado com ameaça/física
prob_panico = (teve_fisica * 0.4) + (teve_ameaca * 0.2)
prob_panico = np.clip(prob_panico, 0.05, 0.8) # Limites
qtd_panico = np.random.binomial(n=5, p=prob_panico)

# Lógica do "Ground Truth" (Especialista / Formulário Frida)
nivel_risco = []
for i in range(TAMANHO_DATASET):
    # Regras Clássicas de Alto Risco (2)
    if teve_fisica[i] == 1 or teve_sexual[i] == 1 or qtd_panico[i] >= 1 or (teve_ameaca[i] == 1 and frequencia_aumentou[i] == 1):
        risco = 2
    # Risco Médio (1)
    elif teve_ameaca[i] == 1 or qtd_ocorrencias[i] >= 2 or dias_ultima_ocorrencia[i] <= 15:
        risco = 1
    # Risco Baixo (0)
    else:
        risco = 0
        
    # Adicionando um ruído de 5% para o modelo ter que aprender padrões reais e não apenas decorar as regras IF/THEN
    if np.random.rand() < 0.05:
        risco = np.random.choice([0, 1, 2])
        
    nivel_risco.append(risco)

# Montando o DataFrame
df = pd.DataFrame({
    'usuaria_id': usuaria_ids,
    'idade': idades,
    'qtd_ocorrencias_totais': qtd_ocorrencias,
    'dias_desde_ultima_ocorrencia': dias_ultima_ocorrencia,
    'frequencia_aumentou': frequencia_aumentou,
    'teve_viol_fisica': teve_fisica,
    'teve_viol_sexual': teve_sexual,
    'teve_ameaca': teve_ameaca,
    'qtd_panico_acionado': qtd_panico,
    'nivel_risco': nivel_risco
})

# Salvando CSV
caminho_csv = 'dataset_risco_violencia.csv'
df.to_csv(caminho_csv, index=False)

print(f"[SUCESSO] Dataset gerado com sucesso: {TAMANHO_DATASET} registros salvos em '{caminho_csv}'")
print("\nDistribuição de Risco gerada (0=Baixo, 1=Médio, 2=Alto):")
print(df['nivel_risco'].value_counts(normalize=True).mul(100).round(2).astype(str) + '%')
