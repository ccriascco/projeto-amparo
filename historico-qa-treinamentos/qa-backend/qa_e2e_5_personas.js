const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

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
        { id: 1, name: "Usuária Baixo Risco", age: 25, type: 'Psicológica', freq: 0, physical: 0, sexual: 0, threat: 0, panic: 0, file: 'test.jpg', mime: 'image/jpeg' },
        { id: 2, name: "Usuária Médio Risco", age: 30, type: 'Ameaça', freq: 1, physical: 0, sexual: 0, threat: 1, panic: 0, file: 'test.mp4', mime: 'video/mp4' },
        { id: 3, name: "Usuária Alto Risco", age: 35, type: 'Física', freq: 1, physical: 1, sexual: 0, threat: 1, panic: 1, file: 'test.mp3', mime: 'audio/mpeg' },
        { id: 4, name: "Usuária Intermediário", age: 28, type: 'Misto', freq: 0, physical: 0, sexual: 0, threat: 1, panic: 0, file: 'test.jpg', mime: 'image/jpeg' },
        { id: 5, name: "Usuária Crítica", age: 40, type: 'Extrema', freq: 1, physical: 1, sexual: 1, threat: 1, panic: 3, file: 'test.mp4', mime: 'video/mp4' },
    ];

    console.log("=== INICIANDO E2E - 5 PERSONAS ===");

    for (const p of personas) {
        console.log(\nProcessando \...);
        let email = persona\_\@test.com;
        let userResult = { id: p.id, email, actions: {} };

        // 1. Criar Usuária
        let cRes = await request('/usuarias', 'POST', {
            nome_completo: p.name, email: email, senha: "123", senha_app: "123",
            cpf: Date.now().toString().slice(-11), telefone: "11999999999", 
            data_nascimento: \-01-01,
            guardioes: [ { nome_completo: Guardiã \, telefone: "11888888888" } ]
        });
        userResult.actions.cadastro = cRes.status === 201 ? "OK" : "FAIL";
        let userId = cRes.data.usuaria_id;

        // 2. Login
        let lRes = await request('/usuarias/login', 'POST', { email: email, senha: "123" });
        let token = lRes.data?.access_token;
        userResult.actions.login = token ? "OK" : "FAIL";
        let authHeaders = { Authorization: 'Bearer ' + token };

        // 3. Cadastrar +1 Guardião
        let gRes = await request('/guardioes', 'POST', { nome_completo: Guardiã Extra \, telefone: "117" }, authHeaders);
        userResult.actions.guardiao = gRes.status === 201 ? "OK" : "FAIL";

        // 4. Se a persona exige histórico para a IA, injetar no banco diretamente
        if (p.freq > 0 || p.panic > 0) {
            console.log(   Injetando histórico para \...);
            // Add old occurrences
            for(let i=0; i < (p.id === 5 ? 5 : p.id === 3 ? 3 : 1); i++) {
                await supabase.from('ocorrencias').insert([{ usuaria_id: userId, tipos_violencia: [p.type], criado_em: new Date(Date.now() - 86400000 * 2).toISOString() }]);
            }
            // Add old panic alerts
            for(let i=0; i < p.panic; i++) {
                await supabase.from('emergencias').insert([{ usuaria_id: userId, status: 'ENCERRADA' }]);
            }
        }

        // 5. Criar Ocorrência Atual (Que dispara a IA)
        let oRes = await request('/ocorrencias', 'POST', { 
            tipos_violencia: p.type === 'Física' ? ['Física', 'Ameaça'] : p.type === 'Extrema' ? ['Física', 'Sexual', 'Ameaça'] : [p.type], 
            mensagem: Relato de \ 
        }, authHeaders);
        userResult.actions.ocorrencia = oRes.status === 201 ? "OK" : "FAIL";
        let occId = oRes.data?.ocorrencia?.id;

        // 6. Evidência
        if (occId) {
            let eRes = await uploadFile(occId, token, p.mime, p.file, "fake_buffer_content_123");
            userResult.actions.evidencia = eRes.status === 201 ? "OK" : "FAIL";
        }

        // 7. Botão de Emergência (Somente para alguns, ou testamos pra todos?)
        let emRes = await request('/emergencias/acionar', 'POST', { latitude: -23, longitude: -46 }, authHeaders);
        userResult.actions.emergencia = emRes.status === 201 ? "OK" : "FAIL";

        // Esperar a IA terminar (3 segundos max)
        await new Promise(r => setTimeout(r, 3000));
        
        // Obter Nivel Risco do banco
        let uDb = await supabase.from('usuarias').select('nivel_risco').eq('id', userId).single();
        userResult.ia_risco = uDb.data?.nivel_risco;
        userResult.actions.ia = uDb.data?.nivel_risco ? "OK" : "FAIL";

        results.users.push({ userId, occId, ...userResult });
        console.log(   Risco atribuído: \);
    }

    // 8. TESTES DE ERRO
    console.log("\n=== EXECUTANDO TESTES DE ERRO ===");
    let errTests = [];

    // Erro 1: Falta de campos obrigatorios no cadastro (sem guardião)
    let e1 = await request('/usuarias', 'POST', { nome_completo: "Sem Guardião", email: "err1@t.com", senha: "1", senha_app: "1", cpf: "111", telefone: "1", data_nascimento: '1990-01-01', guardioes: [] });
    errTests.push({ desc: "Cadastro sem guardião", status: e1.status, pass: e1.status === 400 });

    // Erro 2: Arquivo inválido (ex: pdf)
    if (results.users[0].token) {
        let e2 = await uploadFile(results.users[0].occId, results.users[0].token, 'application/pdf', 'doc.pdf', 'fake');
        errTests.push({ desc: "Upload de arquivo inválido", status: e2.status, pass: e2.status === 415 });
    }

    // Erro 3: Cross-user delete
    if (results.users.length >= 2) {
        // Obter JWT do user 1 e tentar deletar occ do user 2
        let l1 = await request('/usuarias/login', 'POST', { email: results.users[0].email, senha: "123" });
        let e3 = await request('/ocorrencias/' + results.users[1].occId, 'DELETE', null, { Authorization: 'Bearer ' + l1.data.access_token });
        errTests.push({ desc: "Tentativa de deletar dados de outra usuária", status: e3.status, pass: e3.status === 403 || e3.status === 404 });
    }

    results.errors_tested = errTests;

    fs.writeFileSync('e2e_results.json', JSON.stringify(results, null, 2));
    console.log("=== FINALIZADO ===");
}

run();

