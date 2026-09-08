const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://ieqojnpwjezjthrktxfy.supabase.co',
    process.env.SUPABASE_KEY || process.env.SUPABASE_KEY
);

async function request(path, method, body, headers = {}) {
    let options = { method, headers: { ...headers } };
    if (body) {
        if (body instanceof FormData) {
            options.body = body;
        } else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
    }
    const start = Date.now();
    const res = await fetch('http://localhost:3000' + path, options);
    const end = Date.now();
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = text; }
    return { status: res.status, data: data, time: end - start };
}

async function uploadFile(occId, token, mimeType, filename, content) {
    const form = new FormData();
    form.append('tipo', mimeType.split('/')[0].toUpperCase());
    const blob = new Blob([content], { type: mimeType });
    form.append('arquivo', blob, filename);
    return await request('/ocorrencias/' + occId + '/evidencias', 'POST', form, { Authorization: 'Bearer ' + token });
}

async function run() {
    let results = {
        users: [],
        errors_tested: []
    };

    const personas = [
        { id: 1, name: "UsuÃ¡ria Baixo Risco", age: 25, type: 'PsicolÃ³gica', freq: 0, physical: 0, sexual: 0, threat: 0, panic: 0, file: 'test.jpg', mime: 'image/jpeg' },
        { id: 2, name: "UsuÃ¡ria MÃ©dio Risco", age: 30, type: 'AmeaÃ§a', freq: 1, physical: 0, sexual: 0, threat: 1, panic: 0, file: 'test.mp4', mime: 'video/mp4' },
        { id: 3, name: "UsuÃ¡ria Alto Risco", age: 35, type: 'FÃ­sica', freq: 1, physical: 1, sexual: 0, threat: 1, panic: 1, file: 'test.mp3', mime: 'audio/mpeg' },
        { id: 4, name: "UsuÃ¡ria IntermediÃ¡rio", age: 28, type: 'Misto', freq: 0, physical: 0, sexual: 0, threat: 1, panic: 0, file: 'test.jpg', mime: 'image/jpeg' },
        { id: 5, name: "UsuÃ¡ria CrÃ­tica", age: 40, type: 'Extrema', freq: 1, physical: 1, sexual: 1, threat: 1, panic: 3, file: 'test.mp4', mime: 'video/mp4' },
    ];

    console.log("=== INICIANDO E2E - 5 PERSONAS ===");

    for (const p of personas) {
        console.log(`\nProcessando ${p.name}...`);
        let email = `persona${p.id}_${Date.now()}@test.com`;
        let userResult = { id: p.id, email, actions: {} };

        // 1. Criar UsuÃ¡ria
        let cRes = await request('/usuarias', 'POST', {
            nome_completo: p.name, email: email, senha: "123", senha_app: "123",
            cpf: Date.now().toString().slice(-11), telefone: "11999999999", 
            data_nascimento: `${new Date().getFullYear() - p.age}-01-01`,
            guardioes: [ { nome_completo: `GuardiÃ£ ${p.id}`, telefone: "11888888888" } ]
        });
        userResult.actions.cadastro = cRes.status === 201 ? "OK" : "FAIL";
        let userId = cRes.data.usuaria_id;

        // 2. Login
        let lRes = await request('/usuarias/login', 'POST', { email: email, senha: "123" });
        let token = lRes.data?.access_token;
        userResult.actions.login = token ? "OK" : "FAIL";
        userResult.token = token;
        let authHeaders = { Authorization: 'Bearer ' + token };

        // 3. Cadastrar +1 GuardiÃ£o
        let gRes = await request('/guardioes', 'POST', { nome_completo: `GuardiÃ£ Extra ${p.id}`, telefone: "117" }, authHeaders);
        userResult.actions.guardiao = gRes.status === 201 ? "OK" : "FAIL";

        // 4. Se a persona exige histÃ³rico para a IA, injetar no banco diretamente
        if (p.freq > 0 || p.panic > 0) {
            console.log(`   Injetando histÃ³rico para ${p.name}...`);
            // Add old occurrences
            for(let i=0; i < (p.id === 5 ? 5 : p.id === 3 ? 3 : 1); i++) {
                await supabase.from('ocorrencias').insert([{ usuaria_id: userId, tipos_violencia: [p.type], criado_em: new Date(Date.now() - 86400000 * 2).toISOString() }]);
            }
            // Add old panic alerts
            for(let i=0; i < p.panic; i++) {
                await supabase.from('emergencias').insert([{ usuaria_id: userId, status: 'ENCERRADA' }]);
            }
        }

        const tInicioOcorrencia = Date.now();
        // 5. Criar OcorrÃªncia Atual (Que dispara a IA)
        let oRes = await request('/ocorrencias', 'POST', { 
            tipos_violencia: p.type === 'FÃ­sica' ? ['FÃ­sica', 'AmeaÃ§a'] : p.type === 'Extrema' ? ['FÃ­sica', 'Sexual', 'AmeaÃ§a'] : [p.type], 
            mensagem: `Relato de ${p.name}` 
        }, authHeaders);
        const tFimOcorrencia = Date.now();
        
        userResult.actions.ocorrencia = oRes.status === 201 ? "OK" : "FAIL";
        let occId = oRes.data?.ocorrencia?.id;

        // 6. EvidÃªncia
        if (occId) {
            let eRes = await uploadFile(occId, token, p.mime, p.file, "fake_buffer_content_123");
            userResult.actions.evidencia = eRes.status === 201 ? "OK" : "FAIL";
        }

        // 7. BotÃ£o de EmergÃªncia
        let emRes = await request('/emergencias/acionar', 'POST', { latitude: -23, longitude: -46 }, authHeaders);
        userResult.actions.emergencia = emRes.status === 201 ? "OK" : "FAIL";

        // Obter Nivel Risco do banco (a IA deve ter finalizado apÃ³s alguns milissegundos, vamos aguardar 2.5s)
        await new Promise(r => setTimeout(r, 2500));
        let uDb = await supabase.from('usuarias').select('nivel_risco').eq('id', userId).single();
        userResult.ia_risco = uDb.data?.nivel_risco;
        userResult.actions.ia = uDb.data?.nivel_risco ? "OK" : "FAIL";
        userResult.ia_tempo = tFimOcorrencia - tInicioOcorrencia;

        // Adicionar features enviadas
        userResult.ia_features = {
           idade: p.age,
           qtd_ocorrencias_totais: (p.id === 5 ? 6 : p.id === 3 ? 4 : p.id === 2 ? 2 : 1),
           dias_desde_ultima_ocorrencia: p.freq > 0 ? 2 : 999,
           frequencia_aumentou: p.freq > 0 ? 1 : 0,
           teve_viol_fisica: p.physical,
           teve_viol_sexual: p.sexual,
           teve_ameaca: p.threat,
           qtd_panico_acionado: p.panic
        };

        results.users.push({ userId, occId, ...userResult });
        console.log(`   Risco atribuÃ­do: ${userResult.ia_risco}`);
    }

    // 8. TESTES DE ERRO
    console.log("\n=== EXECUTANDO TESTES DE ERRO ===");
    let errTests = [];

    // Erro 1: Falta de campos obrigatorios no cadastro (sem guardiÃ£o)
    let e1 = await request('/usuarias', 'POST', { nome_completo: "Sem GuardiÃ£o", email: "err1@t.com", senha: "1", senha_app: "1", cpf: "111", telefone: "1", data_nascimento: '1990-01-01', guardioes: [] });
    errTests.push({ desc: "Cadastro sem guardiÃ£o", status: e1.status, pass: e1.status === 400 });

    // Erro 2: Arquivo invÃ¡lido (ex: pdf)
    if (results.users[0].token) {
        let e2 = await uploadFile(results.users[0].occId, results.users[0].token, 'application/pdf', 'doc.pdf', 'fake');
        errTests.push({ desc: "Upload de arquivo invÃ¡lido", status: e2.status, pass: e2.status === 415 });
    }

    // Erro 3: Cross-user delete
    if (results.users.length >= 2) {
        let e3 = await request('/ocorrencias/' + results.users[1].occId, 'DELETE', null, { Authorization: 'Bearer ' + results.users[0].token });
        errTests.push({ desc: "Tentativa de deletar dados de outra usuÃ¡ria", status: e3.status, pass: e3.status === 403 || e3.status === 404 });
    }

    results.errors_tested = errTests;

    fs.writeFileSync('C:/Users/andra/.gemini/antigravity/brain/709b78df-bd2a-458f-8a69-cf38398e1c59/scratch/e2e_results.json', JSON.stringify(results, null, 2));
    console.log("=== FINALIZADO ===");
}

run();

