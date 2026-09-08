import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.metrics import classification_report, confusion_matrix
import warnings
warnings.filterwarnings('ignore')

print("="*50)
print("ARENA DE ALGORITMOS - PROJETO AMPARO")
print("="*50)

# 1. Carregar os Dados
df = pd.read_csv('dataset_risco_violencia.csv')
print(f"[*] Dataset carregado com sucesso! ({len(df)} registros)")

# 2. Separacao Features (X) e Target (y)
X = df.drop(columns=['usuaria_id', 'nivel_risco'])
y = df['nivel_risco']

# 3. Divisao Treino/Teste (70% Treino, 30% Teste)
# Usando stratify=y para garantir a mesma proporcao de riscos no treino e no teste
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)
print("[*] Dados divididos: 70% Treino, 30% Teste (estratificado).")

# 4. Padronizacao/Normalizacao
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
print("[*] Features normalizadas (StandardScaler).\n")

# 5. Definicao dos Modelos
modelos = {
    "Regressao Logistica": LogisticRegression(max_iter=1000, random_state=42),
    "Support Vector Machine (SVM)": SVC(random_state=42),
    "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42)
}

# 6. Treinamento e Avaliacao
for nome, modelo in modelos.items():
    print("="*50)
    print(f"Treinando: {nome}...")
    
    # Treino
    modelo.fit(X_train_scaled, y_train)
    
    # Previsao no Teste Cego
    previsoes = modelo.predict(X_test_scaled)
    
    # Avaliacao
    print(f"\nResultados para {nome}:")
    print("Matriz de Confusao:")
    print(confusion_matrix(y_test, previsoes))
    print("\nRelatorio de Classificacao:")
    print(classification_report(y_test, previsoes, target_names=['Baixo (0)', 'Medio (1)', 'Alto (2)']))
    
print("="*50)
print("DICA PARA O TCC: Olhe para a coluna 'recall' da linha 'Alto (2)'.")
print("O melhor modelo e aquele que consegue o maior recall no Alto Risco,")
print("pois nao podemos deixar nenhuma vitima em perigo passar batido!")
