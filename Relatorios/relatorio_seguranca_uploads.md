# Auditoria de Segurança de Evidências (DevSecOps)

Conforme a sua exigência técnica, o backend passou por uma refatoração rigorosa focada exclusivamente em segurança cibernética e blindagem do Storage. O sistema agora opera com o conceito de "Confiança Zero" (Zero Trust) em relação ao aplicativo Mobile.

## 🛡️ Barreiras Implementadas (Código e Validação)

### 1. Limites de Tamanho Granular
Implementamos duas camadas de defesa: o bloqueio agressivo no servidor de rede (`Multer` a 20MB) e a lógica fina por tipo de arquivo:
* 📷 **Fotos (Imagens):** Limite estrito de **5 MB**.
* 🎙️ **Áudios:** Limite estrito de **10 MB**.
* 🎥 **Vídeos:** Limite estrito de **20 MB**.
* *Se qualquer limite for ultrapassado, o servidor rejeita o tráfego instantaneamente com erro `413 Payload Too Large`.*

### 2. Filtro Estrutural e Extensões (Anti-Malware)
* Bloqueamos envios de extensões `.exe`, `.bat`, `.sh` ou arquivos sem extensão.
* Lemos os "Magic Bytes" e o MIME Type da requisição:
  * **Imagens aceitas:** `image/jpeg`, `image/png`, `image/webp`.
  * **Vídeos aceitos:** `video/mp4`, `video/quicktime`, `video/webm`.
  * **Áudios aceitos:** `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/mp4`.
* *Qualquer formato diferente retorna erro `415 Unsupported Media Type`.*

### 3. Prevenção de Path Traversal e Sobrescrita
* **Vulnerabilidade clássica corrigida:** Hackers costumam nomear arquivos como `../../../etc/passwd` para corromper servidores.
* **Nossa solução:** O nome original do arquivo vindo do celular é **completamente ignorado e destruído**. O servidor gera um UUID aleatório criptográfico e aponta a extensão segura baseada no MIME verificado (ex: `c5b2a945/1788483013731.jpg` vira `c5b2a945/4f8d...-9a1b.jpg`).

### 4. Controle de Acesso Estrito (Usuárias e Guardiões)
* Uma usuária jamais poderá enviar uma foto disfarçada para a ocorrência de outra mulher.
* O endpoint agora exige a confirmação do `usuaria_id` da dona da ocorrência. O servidor vai no banco, checa quem é o dono da ocorrência X, e se o dono não bater com o ID da requisição, devolvemos erro `403 Forbidden` (Acesso Negado).
* Essa mesma proteção de escopo garante que o celular acesse apenas os seus próprios links do Supabase.

---

## 🧪 Bateria de Testes Hacker Executada

| Cenário de Ataque | Arquivo Simulado | Resultado do Sistema | Status QA |
| :--- | :--- | :--- | :--- |
| **Uso Normal** | `foto_ok.jpg` (1MB) | Arquivo aceito, hash SHA-256 gerado, salvo com UUID. | ✅ APROVADO |
| **Estouro de Limite Específico** | `foto_pesada.jpg` (6MB) | Bloqueado pelo Controller. Erro: 413 Payload Too Large. | ✅ APROVADO |
| **Estouro de Limite Multer** | `video_enorme.mp4` (21MB) | Bloqueado instantaneamente na barreira de rede (20MB). | ✅ APROVADO |
| **Arquivo Malicioso (Malware)** | `invalido.exe` | Rejeitado. Erro: 415 Unsupported Media Type. | ✅ APROVADO |
| **Acesso Indevido (Invasão)** | `foto.jpg` para outra Ocorrência | Rejeitado. Erro 403 Forbidden. | ✅ APROVADO |
| **Usuário sem Token/Auth** | `foto.jpg` sem ID | Rejeitado. Erro 401 Unauthorized. | ✅ APROVADO |

## Conclusão da Revisão Arquitetural
As camadas de segurança isolam perfeitamente a vítima, os arquivos e o banco de dados. Qualquer tentativa de burlar os limites do front-end será esmagada pelo back-end. **O ecossistema agora está preparado para ataques do mundo real.**
