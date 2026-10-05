async function request(path, method, body, headers = {}) {
    const res = await fetch('http://localhost:3000' + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = text; }
    return { status: res.status, data: data };
}

async function run() {
    console.log("==========================================");
    console.log("TESTE DE PONTA A PONTA: BOTAO DE EMERGENCIA");
    console.log("==========================================\n");

    let email = 'emg_' + Date.now() + '@amparo.com';
    let emailHacker = 'hck_' + Date.now() + '@amparo.com';

    // 1. Criar Usuarias
    console.log('[+] Criando Usuaria Principal e Usuaria Hacker...');
    await request('/usuarias', 'POST', { nome_completo: "Vitima", email: email, senha: "123", senha_app: "123", cpf: '' + Math.floor(Math.random() * 999999), telefone: "11", data_nascimento: '1990-01-01' });
    await request('/usuarias', 'POST', { nome_completo: "Hacker", email: emailHacker, senha: "123", senha_app: "123", cpf: '' + Math.floor(Math.random() * 999999), telefone: "11", data_nascimento: '1990-01-01' });

    let u1 = (await request('/usuarias/login', 'POST', { email: email, senha: "123" })).data.usuaria.id;
    let uHacker = (await request('/usuarias/login', 'POST', { email: emailHacker, senha: "123" })).data.usuaria.id;

    // 2. Tentar disparar sem Guardioes (Testando falha de notificacao)
    console.log('\n[CENARIO] Acionamento SEM guardioes...');
    let req1 = await request('/emergencias/acionar', 'POST', { usuaria_id: u1, latitude: -23.55, longitude: -46.63 }, { 'x-usuaria-id': u1 });
    console.log('   Status:', req1.status, '| Retorno:', req1.data);
    const emergenciaId = req1.data.emergencia_id;

    // 3. Cadastrar Guardiao
    console.log('\n[CENARIO] Cadastrando Guardiao...');
    await request('/guardioes', 'POST', { usuaria_id: u1, nome_completo: "Anjo da Guarda", telefone: "11999999999", grau_parentesco: "Irmão" });

    // 4. Encerrar Emergencia Anterior
    console.log('\n[CENARIO] Encerrando Emergencia Anterior...');
    let end1 = await request('/emergencias/' + emergenciaId + '/encerrar', 'POST', null, { 'x-usuaria-id': u1 });
    console.log('   Status:', end1.status);

    // 5. Acionamento Normal com Guardiao (O Ideal)
    console.log('\n[CENARIO] Acionamento Normal (Com Guardiao)...');
    let req2 = await request('/emergencias/acionar', 'POST', { usuaria_id: u1, latitude: -23.56, longitude: -46.64 }, { 'x-usuaria-id': u1 });
    console.log('   Status:', req2.status, '| Notificados:', req2.data.guardioes_notificados);
    const idAtiva = req2.data.emergencia_id;

    // 6. Teste de Duplicidade (Spam/Abuso)
    console.log('\n[CENARIO] Tentativa de Acionamentos Multiplos/Spam...');
    let req3 = await request('/emergencias/acionar', 'POST', { usuaria_id: u1, latitude: -23.56, longitude: -46.64 }, { 'x-usuaria-id': u1 });
    console.log('   Status:', req3.status, '| Erro:', req3.data.erro);

    // 7. Seguranca: Sem Autenticacao
    console.log('\n[CENARIO] Seguranca: Requisicao nao autenticada...');
    let reqUnauth = await request('/emergencias/acionar', 'POST', { usuaria_id: u1 }); // missing header
    console.log('   Status:', reqUnauth.status, '| Erro:', reqUnauth.data.erro);

    // 8. Seguranca: Acesso Cruzado / Hacker
    console.log('\n[CENARIO] Seguranca: Hacker tentando acionar em nome da Vítima...');
    let reqHacker = await request('/emergencias/acionar', 'POST', { usuaria_id: u1 }, { 'x-usuaria-id': uHacker });
    console.log('   Status:', reqHacker.status, '| Erro:', reqHacker.data.erro);

    // 9. Atualizar Localizacao
    console.log('\n[CENARIO] Fluxo continuo: Atualizando GPS...');
    let reqGps = await request('/emergencias/' + idAtiva + '/localizacao', 'POST', { latitude: -23.57, longitude: -46.65 }, { 'x-usuaria-id': u1 });
    console.log('   Status:', reqGps.status, '| Retorno:', reqGps.data.mensagem);

    // 10. Validar Banco de Dados via GET Rota
    console.log('\n[CENARIO] Banco de Dados: Validando Pontos GPS Registrados...');
    let reqRota = await request('/emergencias/' + idAtiva + '/rota', 'GET', null, { 'x-usuaria-id': u1 });
    console.log('   Status:', reqRota.status, '| Pontos no banco:', reqRota.data.rastro_gps ? reqRota.data.rastro_gps.length : 0);
}

run();

