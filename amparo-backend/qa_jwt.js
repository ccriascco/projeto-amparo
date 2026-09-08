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
    let emailA = 'userA_' + Date.now() + '@amparo.com';
    let emailB = 'userB_' + Date.now() + '@amparo.com';

    let cA = await request('/usuarias', 'POST', { 
        nome_completo: "Vitima A", email: emailA, senha: "123", senha_app: "123", cpf: "123" + Date.now(), telefone: "11", data_nascimento: '1990-01-01',
        guardioes: [ { nome_completo: "G1", telefone: "1" } ]
    });
    console.log('Create A:', cA.status, cA.data);

    let cB = await request('/usuarias', 'POST', { 
        nome_completo: "Vitima B", email: emailB, senha: "123", senha_app: "123", cpf: "456" + Date.now(), telefone: "11", data_nascimento: '1990-01-01',
        guardioes: [ { nome_completo: "G1", telefone: "1" } ]
    });
    console.log('Create B:', cB.status, cB.data);

    let t2 = await request('/usuarias/login', 'POST', { email: emailA, senha: "123" });
    console.log('Login A:', t2.status, t2.data);
    let tokenA = t2.data.access_token;
    let idA = t2.data.usuaria ? t2.data.usuaria.id : null;

    let loginB = await request('/usuarias/login', 'POST', { email: emailB, senha: "123" });
    let tokenB = loginB.data.access_token;
    let idB = loginB.data.usuaria ? loginB.data.usuaria.id : null;

    console.log('\n[TESTE 3] Endpoint Sem JWT');
    let t3 = await request('/ocorrencias', 'GET');
    console.log('   Status:', t3.status, '(Esperado: 401)');

    console.log('\n[TESTE 4] JWT Válido');
    let t4 = await request('/guardioes', 'GET', null, { Authorization: 'Bearer ' + tokenA });
    console.log('   Status:', t4.status, '(Esperado: 200)');

    console.log('\n[TESTE 5] JWT Inválido');
    let t5 = await request('/guardioes', 'GET', null, { Authorization: 'Bearer token_invalido' });
    console.log('   Status:', t5.status, '(Esperado: 401)');

    console.log('\n[TESTE 7 e 8] Tentar Falsificar Identidade');
    let guardioesB = await request('/guardioes', 'GET', null, { Authorization: 'Bearer ' + tokenB });
    let idGuardiaoB = guardioesB.data.guardioes[0].id;
    let t7 = await request('/guardioes/' + idGuardiaoB, 'DELETE', null, { Authorization: 'Bearer ' + tokenA, 'x-usuaria-id': idB });
    console.log('   Deletar guardiao alheio. Status:', t7.status, '(Esperado: 403 ou 404)');
    
    console.log('\n[TESTE 9] Manipular ID no Body (Ocorrencia)');
    let t9 = await request('/ocorrencias', 'POST', { usuaria_id: idB, tipos_violencia: ['Física'] }, { Authorization: 'Bearer ' + tokenA });
    console.log('   Ocorrencia criada. Status:', t9.status, '(Esperado: 201)');
    let oA = await request('/ocorrencias', 'GET', null, { Authorization: 'Bearer ' + tokenA });
    let oB = await request('/ocorrencias', 'GET', null, { Authorization: 'Bearer ' + tokenB });
    console.log('   A ocorrencia foi salva forçadamente para A?', oA.data.ocorrencias.length > 0 ? 'SIM' : 'NAO');
    console.log('   A ocorrencia apareceu para B (vulnerabilidade)?', oB.data.ocorrencias.length > 0 ? 'SIM' : 'NAO');

    console.log('\n[TESTE 15] Botao de Emergencia com JWT');
    let t15 = await request('/emergencias/acionar', 'POST', {}, { Authorization: 'Bearer ' + tokenA });
    console.log('   Status Emergencia:', t15.status, '(Esperado: 201)');
}

run();

