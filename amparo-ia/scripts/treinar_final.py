import pandas as pd
import pickle
from sklearn.ensemble import RandomForestClassifier
import warnings
warnings.filterwarnings('ignore')

print("Carregando dataset oficial...")
df = pd.read_csv('dataset_risco_violencia.csv')

X = df.drop(columns=['usuaria_id', 'nivel_risco'])
y = df['nivel_risco']

print("Treinando o Random Forest (Modelo Campeao) com 100% dos dados para producao...")
modelo_final = RandomForestClassifier(n_estimators=100, random_state=42)
modelo_final.fit(X, y)

with open('modelo_risco.pkl', 'wb') as f:
    pickle.dump(modelo_final, f)

with open('colunas_modelo.pkl', 'wb') as f:
    pickle.dump(list(X.columns), f)

print("[SUCESSO] Modelo 'modelo_risco.pkl' salvo e pronto para a API!")
