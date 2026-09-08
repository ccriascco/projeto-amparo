import pandas as pd
import numpy as np
import pickle
from sklearn.ensemble import RandomForestClassifier

print("Gerando dados sintéticos para o TCC...")

# Regras simples para o mock do TCC:
# 0 = Baixo, 1 = Médio, 2 = Alto
dados = []
for _ in range(500):
    qtd_ocor = np.random.randint(0, 10)
    qtd_emerg = np.random.randint(0, 5)
    fisica = np.random.randint(0, 2)
    ameaca = np.random.randint(0, 2)
    
    # Lógica baseada nos requisitos do projeto:
    if qtd_emerg >= 2 or fisica == 1:
        risco = 2 # Alto
    elif qtd_ocor >= 3 or ameaca == 1:
        risco = 1 # Médio
    elif qtd_ocor == 0 and qtd_emerg == 0:
        risco = 0 # Baixo
    else:
        risco = 0 # Baixo
        
    dados.append([qtd_ocor, qtd_emerg, fisica, ameaca, risco])

df = pd.DataFrame(dados, columns=['qtd_ocorrencias', 'qtd_emergencias', 'teve_fisica', 'teve_ameaca', 'risco'])

X = df.drop('risco', axis=1)
y = df['risco']

print("Treinando o modelo Random Forest...")
modelo = RandomForestClassifier(n_estimators=50, random_state=42)
modelo.fit(X, y)

with open('modelo_risco.pkl', 'wb') as f:
    pickle.dump(modelo, f)

print("✅ Modelo 'modelo_risco.pkl' salvo com sucesso!")
