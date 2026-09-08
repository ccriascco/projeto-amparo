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
    console.log("TESTE DA REGRA: GUARDIAS OBRIGATORIAS (Min 1, Max 5)");
    console.log("==========================================\n");

    let email = 'gd_' + Date.now() + '@amparo.com';

    // 1. Tentar criar sem guardioes
    console.log('[CENARIO 1] Criar usuaria SEM guardioes (Deve falhar)');
    let t1 = await request('/usuarias', 'POST', { 
        nome_completo: "Vitima", email: email, senha: "123", senha_app: "123", cpf: "123", telefone: "11", data_nascimento: '1990-01-01',
        guardioes: []
    });
    console.log('   Status:', t1.status, '| Erro:', t1.data.erro);

    // 2. Tentar criar com 6 guardioes
    console.log('\n[CENARIO 2] Criar usuaria com MAIS de 5 guardioes (Deve falhar)');
    let t2 = await request('/usuarias', 'POST', { 
        nome_completo: "Vitima", email: email, senha: "123", senha_app: "123", cpf: "123", telefone: "11", data_nascimento: '1990-01-01',
        guardioes: [
            { nome_completo: "G1", telefone: "1" }, { nome_completo: "G2", telefone: "2" },
            { nome_completo: "G3", telefone: "3" }, { nome_completo: "G4", telefone: "4" },
            { nome_completo: "G5", telefone: "5" }, { nome_completo: "G6", telefone: "6" }
        ]
    });
    console.log('   Status:', t2.status, '| Erro:', t2.data.erro);

    // 3. Criar com 1 guardiao (Correto)
    console.log('\n[CENARIO 3] Criar usuaria com 1 guardiao (Deve passar)');
    let t3 = await request('/usuarias', 'POST', { 
        nome_completo: "Vitima", email: email, senha: "123", senha_app: "123", cpf: "123", telefone: "11", data_nascimento: '1990-01-01',
        guardioes: [ { nome_completo: "G1", telefone: "11999999999" } ]
    });
    console.log('   Status:', t3.status, '| Retorno:', t3.data.mensagem);

    // Pegar o ID da usuaria
    let login = await request('/usuarias/login', 'POST', { email: email, senha: "123" });
    const u1 = login.data.usuaria.id;

    // Listar guardioes atuais
    let listG = await request('/guardioes/' + u1, 'GET');
    let idG1 = listG.data.guardioes[0].id;
    console.log('   ID Guardiao 1:', idG1);

    // 4. Excluir unico guardiao (Deve falhar)
    console.log('\n[CENARIO 4] Tentar deletar o UNICO guardiao existente (Deve falhar)');
    let t4 = await request('/guardioes/' + idG1, 'DELETE');
    console.log('   Status:', t4.status, '| Erro:', t4.data.erro);

    // 5. Adicionar um 2o guardiao
    console.log('\n[CENARIO 5] Adicionar um 2º guardiao (Deve passar)');
    let t5 = await request('/guardioes', 'POST', { usuaria_id: u1, nome_completo: "G2", telefone: "222" });
    console.log('   Status:', t5.status);

    // 6. Excluir o 1o guardiao agora que tem 2 (Deve passar)
    console.log('\n[CENARIO 6] Deletar o 1º guardiao agora que sobrara 1 (Deve passar)');
    let t6 = await request('/guardioes/' + idG1, 'DELETE');
    console.log('   Status:', t6.status, '| Retorno:', t6.data.mensagem);

    // 7. Botao de Emergencia ainda funciona?
    console.log('\n[CENARIO 7] Testando Botao de Emergencia com o guardiao que sobrou...');
    let t7 = await request('/emergencias/acionar', 'POST', { usuaria_id: u1, latitude: 0, longitude: 0 }, { 'x-usuaria-id': u1 });
    console.log('   Status:', t7.status, '| Notificados:', t7.data.guardioes_notificados);
}

run();

