import pickle
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

try:
    with open('modelo_risco.pkl', 'rb') as f:
        modelo = pickle.load(f)
    with open('colunas_modelo.pkl', 'rb') as f:
        colunas = pickle.load(f)
    
    print("Colunas:", colunas)
    
    dados = {
        'idade': 28,
        'qtd_ocorrencias_totais': 3,
        'dias_desde_ultima_ocorrencia': 5,
        'frequencia_aumentou': 1,
        'teve_viol_fisica': 0,
        'teve_viol_sexual': 0,
        'teve_ameaca': 1,
        'qtd_panico_acionado': 0
    }
    df_novo = pd.DataFrame([dados])
    df_novo = df_novo[colunas]
    previsao = modelo.predict(df_novo)[0]
    print("Previsao:", previsao)
    
except Exception as e:
    import traceback
    print("ERRO:", str(e))
    traceback.print_exc()
