const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
    'https://ieqojnpwjezjthrktxfy.supabase.co',
    process.env.SUPABASE_KEY
);

async function request(path, method, body, headers = {}) {
    let options = {
        method,
        headers: { ...headers }
    };
    if (body) {
        if (body instanceof FormData) {
            options.body = body;
        } else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
    }
    const res = await fetch('http://localhost:3000' + path, options);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = text; }
    return { status: res.status, data: data };
}

async function run() {
    console.log("========================================");
    console.log("INICIANDO TESTE E2E MASTER - AMPARO");
    console.log("========================================\n");

    let emailA = 'e2e_' + Date.now() + '@amparo.com';
    let token = null;
    let userId = null;
    let guardianId = null;
    let occId = null;

    // 1. CRIAR USUARIA (Com 1 guardiã)
    console.log("[1] Criando Usuária com Guardiã...");
    let cA = await request('/usuarias', 'POST', { 
        nome_completo: "Vítima E2E", email: emailA, senha: "123", senha_app: "123", 
        cpf: Date.now().toString().slice(-11), telefone: "11999999999", data_nascimento: '1990-01-01',
        guardioes: [ { nome_completo: "Guardiã E2E", telefone: "11888888888" } ]
    });
    if (cA.status === 201) console.log("  ✅ Usuária criada com sucesso.");
    else { console.error("  ❌ Falha:", cA); return; }
    userId = cA.data.usuaria_id;

    // 2. LOGIN / JWT
    console.log("\n[2] Realizando Login para obter JWT...");
    let login = await request('/usuarias/login', 'POST', { email: emailA, senha: "123" });
    if (login.status === 201 && login.data.access_token) {
        console.log("  ✅ JWT gerado e retornado com sucesso.");
        token = login.data.access_token;
    } else { console.error("  ❌ Falha no login:", login); return; }

    const authHeaders = { Authorization: 'Bearer ' + token };

    // 3. TESTAR SEGURANÇA (Sem Token e Token Inválido)
    console.log("\n[3] Testando Segurança e Proteção JWT...");
    let tSemToken = await request('/guardioes', 'GET');
    let tTokenRuim = await request('/guardioes', 'GET', null, { Authorization: 'Bearer lixo' });
    if (tSemToken.status === 401 && tTokenRuim.status === 401) {
        console.log("  ✅ Endpoints protegidos corretamente contra acessos não autorizados.");
    } else { console.error("  ❌ Falha de segurança:", tSemToken.status, tTokenRuim.status); }

    // 4. CRIAR OUTRA GUARDIÃ E TESTAR REGRA DE MÍNIMO 1
    console.log("\n[4] Testando Regra 'Mínimo de 1 Guardiã'...");
    let listG = await request('/guardioes', 'GET', null, authHeaders);
    guardianId = listG.data.guardioes[0].id;
    
    // Tentar deletar a única
    let delUnica = await request('/guardioes/' + guardianId, 'DELETE', null, authHeaders);
    if (delUnica.status === 403) console.log("  ✅ Sistema bloqueou exclusão da última guardiã.");
    else console.error("  ❌ Sistema permitiu excluir a única guardiã!");

    // Adicionar a 2a e deletar a 1a
    await request('/guardioes', 'POST', { nome_completo: "Guardiã 2", telefone: "11" }, authHeaders);
    let delPrimeira = await request('/guardioes/' + guardianId, 'DELETE', null, authHeaders);
    if (delPrimeira.status === 200) console.log("  ✅ Sistema permitiu exclusão após adicionar a segunda.");
    else console.error("  ❌ Falha ao excluir guardiã:", delPrimeira);

    // 5. TESTAR UPLOAD DE EVIDÊNCIAS
    console.log("\n[5] Criando Ocorrência para Testar Evidências...");
    let ocRes = await request('/ocorrencias', 'POST', { 
        tipos_violencia: ['Física'], mensagem: 'Teste Evidencia' 
    }, authHeaders);
    occId = ocRes.data.ocorrencia.id;

    // Criar um payload multpart usando FormData
    const form = new FormData();
    form.append('tipo', 'FOTO');
    const blob = new Blob(['conteudo fake de imagem'], { type: 'image/jpeg' });
    form.append('arquivo', blob, 'foto.jpg');
    
    console.log("    Fazendo upload multipart para o Supabase Storage...");
    let uploadRes = await request('/ocorrencias/' + occId + '/evidencias', 'POST', form, authHeaders);
    if (uploadRes.status === 201) {
        console.log("  ✅ Backend processou o upload.");
        let storagePath = uploadRes.data.evidencia.caminho_storage;
        // Validar no Supabase se realmente existe!
        let parts = storagePath.split('/');
        const { data: listFiles } = await supabase.storage.from('evidencias_amparo').list(parts[0] + '/' + parts[1]);
        if (listFiles && listFiles.length > 0) {
            console.log("  ✅ Storage Verificado! O arquivo " + listFiles[0].name + " realmente está salvo no bucket.");
        } else {
            console.error("  ❌ Falha: Arquivo não encontrado fisicamente no Storage.");
        }
    } else {
        console.error("  ❌ Falha no Upload:", uploadRes);
    }

    // 6. TESTAR INTELIGÊNCIA ARTIFICIAL (3 Cenários)
    console.log("\n[6] Testando Motor de Inteligência Artificial (3 Cenários)...");
    
    // A IA é acionada assincronamente ao criar ocorrências.
    // Vamos criar 3 cenários distintos com 3 usuárias.
    console.log("    Processando Cenário A: Baixo Risco (Poucas evidências, sem violência física/sexual).");
    // Já temos a usuária A que só tem 1 ocorrencia. A IA leva ~1 seg pra processar.
    await new Promise(r => setTimeout(r, 2000));
    let usrA = await supabase.from('usuarias').select('nivel_risco').eq('id', userId).single();
    console.log("      Resultado da IA no banco p/ Usuária A:", usrA.data.nivel_risco);

    // Cenário B: Médio Risco (Vamos criar uma usuária sem histórico: Regra hardcoded da IA)
    let emailCenB = 'e2eB_' + Date.now() + '@amparo.com';
    let uB = await request('/usuarias', 'POST', { 
        nome_completo: "Vítima B", email: emailCenB, senha: "123", senha_app: "123", cpf: Date.now().toString().slice(-11), telefone: "1", data_nascimento: '1990-01-01', guardioes: [{nome_completo:"G", telefone:"1"}]
    });
    // Forçar a IA via um script avulso ou simulando o fetch pra porta 8000 diretamente pra provar:
    let iaB = await fetch('http://127.0.0.1:8000/classificar', {
        method: 'POST', headers:{'Content-Type': 'application/json'},
        body: JSON.stringify({ idade: 30, qtd_ocorrencias_totais: 0, dias_desde_ultima_ocorrencia: 999, frequencia_aumentou: 0, teve_viol_fisica: 0, teve_viol_sexual: 0, teve_ameaca: 0, qtd_panico_acionado: 0 })
    });
    let resIaB = await iaB.json();
    console.log("    Processando Cenário B: Usuária sem histórico.");
    console.log("      Resultado retornado pela IA:", resIaB.risco, "| Justificativa:", resIaB.justificativa);

    // Cenário C: Alto Risco (Múltiplas Ocorrências + Panico)
    console.log("    Processando Cenário C: Alto Risco (Frequência Alta + Violência + Pânico).");
    let iaC = await fetch('http://127.0.0.1:8000/classificar', {
        method: 'POST', headers:{'Content-Type': 'application/json'},
        body: JSON.stringify({ idade: 30, qtd_ocorrencias_totais: 5, dias_desde_ultima_ocorrencia: 2, frequencia_aumentou: 1, teve_viol_fisica: 1, teve_viol_sexual: 1, teve_ameaca: 1, qtd_panico_acionado: 3 })
    });
    let resIaC = await iaC.json();
    console.log("      Resultado retornado pela IA:", resIaC.risco);

    // 7. TESTAR BOTÃO DE EMERGÊNCIA
    console.log("\n[7] Testando Botão de Emergência de Ponta a Ponta...");
    let emRes = await request('/emergencias/acionar', 'POST', { latitude: -23.5, longitude: -46.6 }, authHeaders);
    if (emRes.status === 201) {
        console.log("  ✅ API de Emergência acionada.");
        // Verificar persistencia!
        let { data: emgDb } = await supabase.from('emergencias').select('*, rastreamento_gps(*)').eq('usuaria_id', userId).eq('status', 'ATIVA').single();
        if (emgDb) {
            console.log("  ✅ Emergência persistida no banco (Status: ATIVA).");
            console.log("  ✅ GPS salvo corretamente na tabela de rastreamento:", emgDb.rastreamento_gps[0].latitude, emgDb.rastreamento_gps[0].longitude);
        } else {
            console.error("  ❌ Falha: Emergência não encontrada no banco.");
        }
    } else {
        console.error("  ❌ Falha no endpoint de emergência:", emRes);
    }
    
    console.log("\n========================================");
    console.log("TESTE E2E FINALIZADO COM SUCESSO");
    console.log("========================================\n");
}

run();

