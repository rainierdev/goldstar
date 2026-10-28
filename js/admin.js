// Grupo Star · painel do dono: edita taxas, faixas, textos, avaliações e contato do site
(async function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const brl = v => (isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const pct = n => (+n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  // Valores sugeridos: prazos e taxas (administração + fundo de reserva) da planilha da administradora,
  // juros do financiamento perto da taxa média do Banco Central para cada modalidade.
  const PRAZOS_VEICULO = [{ meses: 36, taxa: 9.5 }, { meses: 72, taxa: 16 }, { meses: 100, taxa: 16 }, { meses: 120, taxa: 16 }, { meses: 140, taxa: 16 }];
  const SUGESTAO = {
    auto:    { fundo: 0, juros: 1.89, prazos: PRAZOS_VEICULO },
    imovel:  { fundo: 0, juros: 0.95, prazos: [{ meses: 180, taxa: 23 }, { meses: 200, taxa: 23 }, { meses: 220, taxa: 23 }, { meses: 240, taxa: 24 }],
               // prazo pelo valor do crédito, como o cliente explicou
               faixas: [{ ate: 180000, meses: 180 }, { ate: 400000, meses: 200 }, { ate: 1220000, meses: 220 }, { ate: null, meses: 240 }] },
    pesados: { fundo: 0, juros: 1.60, prazos: PRAZOS_VEICULO },
  };
  // faixas usuais de mercado (não são limites da lei; servem para alertar valores fora do comum)
  const FAIXA = {
    auto:    { taxa: [9, 20], juros: [1.6, 2.3], modalidade: 'veículos para pessoa física' },
    imovel:  { taxa: [14, 26], juros: [0.85, 1.1], modalidade: 'financiamento imobiliário' },
    pesados: { taxa: [9, 20], juros: [1.2, 1.9], modalidade: 'veículos pesados e máquinas' },
  };
  const AVISO_SUGERIDO = 'Simulação estimada, sem valor de proposta. A contemplação ocorre por sorteio ou lance e não tem data garantida. Taxa de administração, fundo de reserva e prazos seguem o contrato da administradora. A comparação usa a taxa média de juros do Banco Central para financiamentos e não inclui seguros e tarifas (CET).';
  const OBJ_NOMES = { casa: 'Casa', terreno: 'Terreno', reforma: 'Reforma', carro: 'Carro', caminhonete: 'Caminhonete', moto: 'Moto', trator: 'Trator' };

  let C = null;
  let sujo = false;

  /* ---------- entrada ---------- */
  try { await Store.iniciar(); } catch (e) { console.error(e); }
  const online = Store.modo !== 'local';
  $('campoEmail').hidden = !online;
  if (online) $('loginEmail').required = true;

  $('formLogin').addEventListener('submit', async e => {
    e.preventDefault();
    $('loginErro').textContent = '';
    try {
      await Store.entrar($('loginEmail').value.trim(), $('loginSenha').value);
      await abrirPainel();
    } catch (err) {
      $('loginErro').textContent = online ? 'E-mail ou senha incorretos.' : 'Senha incorreta.';
    }
  });
  $('btnSair').addEventListener('click', async () => { await Store.sair(); location.reload(); });

  if (Store.logado()) await abrirPainel(); else $('telaLogin').hidden = false;

  async function abrirPainel() {
    C = await Store.lerConfig();
    $('telaLogin').hidden = true;
    $('telaPainel').hidden = false;
    $('avisoModo').textContent = online
      ? 'Modo online: o que você salvar aparece para todos os visitantes do site.'
      : 'Modo demonstração: o que você salvar fica só neste navegador. Para valer para todos os visitantes, ative o modo online (LEIAME.md).';
    $('campoPin').hidden = online;
    $('avisoLeadsDemo').hidden = online;
    montar();
    carregarLeads();
  }

  /* ---------- leads do site ---------- */
  let leads = [];
  const foneBonito = d => d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d;
  const dataBR = iso => new Date(iso).toLocaleDateString('pt-BR');
  const horaBR = iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  async function carregarLeads() {
    $('tabelaLeads').innerHTML = '<p class="vazio">Carregando…</p>';
    try {
      leads = await Store.listarLeads();
    } catch (e) {
      console.error(e);
      $('tabelaLeads').innerHTML = '<p class="vazio">Não foi possível carregar os leads. Tente de novo.</p>';
      return;
    }
    // opções dos filtros a partir do que existe
    const opcoes = (id, valores, rotulo) => {
      const atual = $(id).value;
      $(id).innerHTML = `<option value="">${rotulo}</option>` + [...new Set(valores)].sort().map(v => `<option${v === atual ? ' selected' : ''}>${esc(v)}</option>`).join('');
    };
    opcoes('fOrigem', leads.map(l => l.origem || 'Site'), 'Todas');
    opcoes('fUF', leads.map(l => l.estado), 'Todos');
    desenharLeads();
  }

  function filtrados() {
    const busca = $('fBusca').value.trim().toLowerCase();
    const buscaDigitos = busca.replace(/\D/g, '');
    const origem = $('fOrigem').value, uf = $('fUF').value, dias = +$('fPeriodo').value;
    const desde = dias ? new Date(new Date().setHours(0, 0, 0, 0) - (dias - 1) * 864e5) : null;
    const confere = l => `${l.nome} ${l.cidade}`.toLowerCase().includes(busca) || (buscaDigitos && l.telefone.includes(buscaDigitos));
    return leads.filter(l =>
      (!origem || (l.origem || 'Site') === origem) &&
      (!uf || l.estado === uf) &&
      (!desde || new Date(l.criadoEm) >= desde) &&
      (!busca || confere(l)));
  }

  function desenharLeads() {
    const lista = filtrados();
    $('leadsTotal').textContent = leads.length ? `${lista.length} de ${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}.` : '';
    if (!lista.length) {
      $('tabelaLeads').innerHTML = `<p class="vazio">${leads.length ? 'Nenhum lead com esses filtros.' : 'Nenhum lead ainda. Eles aparecem aqui quando alguém faz uma simulação no site.'}</p>`;
      return;
    }
    $('tabelaLeads').innerHTML = `<table>
      <thead><tr><th>Data</th><th>Nome</th><th>WhatsApp</th><th>Cidade</th><th>Origem</th><th>Simulação</th><th></th></tr></thead>
      <tbody>${lista.map(l => `<tr>
        <td>${dataBR(l.criadoEm)}<small>${horaBR(l.criadoEm)}</small></td>
        <td>${esc(l.nome)}</td>
        <td>${foneBonito(l.telefone)}</td>
        <td>${esc(l.cidade)}<small>${esc(l.estado)}</small></td>
        <td><span class="tag-origem">${esc(l.origem || 'Site')}</span></td>
        <td><details><summary>Ver</summary><pre>${esc(l.resumo)}</pre></details></td>
        <td><div class="acoes-lead">
          <a class="btn btn-ghost btn-sm" href="https://wa.me/55${l.telefone}?text=${encodeURIComponent('Olá, ' + l.nome.split(' ')[0] + '! Aqui é da Gold Star, vi sua simulação no nosso site.')}" target="_blank" rel="noopener">WhatsApp</a>
          <button class="btn btn-link" type="button" data-apagar-lead="${esc(l.id)}">Apagar</button>
        </div></td>
      </tr>`).join('')}</tbody></table>`;
    $('tabelaLeads').querySelectorAll('[data-apagar-lead]').forEach(b => b.addEventListener('click', async () => {
      const l = leads.find(x => x.id === b.dataset.apagarLead);
      if (!confirm(`Apagar o lead de ${l.nome}? Não dá para desfazer.`)) return;
      await Store.apagarLead(l.id);
      leads = leads.filter(x => x.id !== l.id);
      desenharLeads();
    }));
  }

  ['fBusca', 'fOrigem', 'fUF', 'fPeriodo'].forEach(id => $(id).addEventListener('input', desenharLeads));
  $('btnAtualizarLeads').addEventListener('click', carregarLeads);

  // CSV com ";" e acentos corretos para abrir direto no Excel em português
  $('btnCsv').addEventListener('click', () => {
    const lista = filtrados();
    if (!lista.length) { alert('Nenhum lead para exportar com esses filtros.'); return; }
    const cel = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhas = [['Data', 'Hora', 'Nome', 'WhatsApp', 'Estado', 'Cidade', 'Origem', 'Simulação']]
      .concat(lista.map(l => [dataBR(l.criadoEm), horaBR(l.criadoEm), l.nome, foneBonito(l.telefone), l.estado, l.cidade, l.origem || 'Site', (l.resumo || '').replace(/\n+/g, ' | ')]));
    const csv = '﻿' + linhas.map(r => r.map(cel).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'leads-grupostar-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* ---------- abas ---------- */
  document.querySelectorAll('#abas button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#abas button').forEach(x => x.classList.toggle('is-on', x === b));
    document.querySelectorAll('.painel').forEach(p => { p.hidden = p.dataset.painel !== b.dataset.aba; });
  }));

  /* ---------- campos simples: data-c="caminho.no.objeto" ---------- */
  const ler = caminho => caminho.split('.').reduce((o, k) => (o == null ? o : o[k]), C);
  const gravar = (caminho, v) => {
    const ks = caminho.split('.'), ult = ks.pop();
    ks.reduce((o, k) => o[k], C)[ult] = v;
  };

  // a barra de salvar só aparece quando há alteração; depois de salvar, mostra o resultado e some
  const barra = document.querySelector('.barra-salvar');
  let esconderBarra = 0;
  function mostrarBarra() { clearTimeout(esconderBarra); barra.classList.add('is-visivel'); }
  function sumirBarraDepois(ms = 2500) {
    clearTimeout(esconderBarra);
    esconderBarra = setTimeout(() => { if (!sujo) barra.classList.remove('is-visivel'); }, ms);
  }

  function marcar() {
    sujo = true;
    $('estado').textContent = 'Alterações não salvas.';
    $('estado').className = '';
    mostrarBarra();
  }

  function montar() {
    document.querySelectorAll('[data-c]').forEach(el => {
      el.value = ler(el.dataset.c) ?? '';
      el.oninput = () => { gravar(el.dataset.c, el.value); marcar(); };
    });
    montarBens();
    montarObjetivos();
    montarProvas();
    montarAvaliacoes();
  }

  /* ---------- simulador e taxas ---------- */
  // como no site e na planilha: carta × (1 + taxa do prazo + fundo extra) ÷ prazo; meia parcela é a metade
  const ultimoPrazo = b => [...b.prazos].sort((x, y) => x.meses - y.meses).pop() || { meses: 1, taxa: 0 };
  const limite = f => (f.ate == null || f.ate === '' ? Infinity : +f.ate);
  // igual ao site: com faixas, o prazo sai do valor do crédito (o prazo cadastrado mais próximo do da faixa)
  function prazoDoCredito(b, valor) {
    const faixas = [...(b.faixas || [])].sort((x, y) => limite(x) - limite(y));
    if (!faixas.length) return ultimoPrazo(b);
    const f = faixas.find(x => valor <= limite(x)) || faixas[faixas.length - 1];
    return b.prazos.reduce((m, p) => (Math.abs(p.meses - f.meses) < Math.abs(m.meses - f.meses) ? p : m), b.prazos[0]);
  }
  function calcular(b) {
    const g = prazoDoCredito(b, +b.min);
    const valor = +b.min, prazo = +g.meses, i = +b.juros / 100;
    const totalCons = valor * (1 + (+g.taxa + +b.fundo) / 100);
    const parcelaFin = i > 0 ? valor * i / (1 - Math.pow(1 + i, -prazo)) : valor / prazo;
    return { prazo, parcelaCons: totalCons / prazo, parcelaFin, totalCons, totalFin: parcelaFin * prazo, economia: parcelaFin * prazo - totalCons };
  }

  function alertaJuros(k, v) {
    const [lo, hi] = FAIXA[k].juros;
    if (!(v >= 0)) return 'Informe um número.';
    if (v > hi * 1.15) return 'Acima da taxa média do mercado: a economia mostrada pode ser vista como comparação enganosa (CDC, art. 37).';
    if (v < lo * .85) return 'Abaixo da média: a economia mostrada fica menor que a real.';
    if (k === 'imovel' && v > .95) return 'Acima do teto de juros do SFH (cerca de 0,95% ao mês). Só use se a comparação for com financiamento fora do SFH.';
    return '';
  }

  function alertaPrazos(k, b) {
    const [lo, hi] = FAIXA[k].taxa;
    const fora = b.prazos.filter(p => +p.taxa + +b.fundo > hi || +p.taxa + +b.fundo < lo).map(p => p.meses + ' meses');
    return fora.length ? `Taxa fora da faixa comum de mercado (${lo}% a ${hi}%) em: ${fora.join(', ')}. Confira se é o percentual do contrato da administradora.` : '';
  }

  function alertaFaixas(b) {
    const m = [];
    if (+b.min >= +b.max) m.push('A carta mínima precisa ser menor que a máxima.');
    if (!(+b.passo > 0)) m.push('O passo precisa ser maior que zero.');
    if (!b.prazos.length) m.push('Cadastre pelo menos um prazo.');
    if (b.prazos.some(p => !(+p.meses > 0))) m.push('Todo prazo precisa ter os meses preenchidos.');
    if (new Set(b.prazos.map(p => +p.meses)).size !== b.prazos.length) m.push('Há prazos repetidos.');
    const fx = b.faixas || [];
    if (fx.some(f => !b.prazos.some(p => +p.meses === +f.meses))) m.push('Toda faixa de crédito precisa usar um prazo cadastrado na tabela de taxas.');
    if (fx.length && !fx.some(f => f.ate == null || f.ate === '')) m.push('Deixe a última faixa com o crédito "até" em branco, para valer acima da anterior.');
    return m.join(' ');
  }

  function linhasFaixas(k, b) {
    return (b.faixas || []).map((f, i) => `<div class="prazo-linha">
      <label class="campo"><span>Crédito até (R$) · vazio = acima</span><input type="number" min="0" step="any" data-faixa="${k}" data-i="${i}" data-campo="ate" value="${f.ate == null ? '' : esc(f.ate)}"></label>
      <label class="campo"><span>Prazo (meses)</span><input type="number" min="1" step="1" data-faixa="${k}" data-i="${i}" data-campo="meses" value="${esc(f.meses)}"></label>
      <button class="btn btn-link" type="button" data-tirar-faixa="${k}" data-i="${i}" aria-label="Remover faixa">Remover</button>
    </div>`).join('');
  }

  function linhasPrazos(k, b) {
    return b.prazos.map((p, i) => `<div class="prazo-linha">
      <label class="campo"><span>Prazo (meses)</span><input type="number" min="1" step="1" data-prazo="${k}" data-i="${i}" data-campo="meses" value="${esc(p.meses)}"></label>
      <label class="campo"><span>Taxa adm + fundo (%)</span><input type="number" min="0" step="any" data-prazo="${k}" data-i="${i}" data-campo="taxa" value="${esc(p.taxa)}"></label>
      <button class="btn btn-link" type="button" data-tirar-prazo="${k}" data-i="${i}" aria-label="Remover prazo">Remover</button>
    </div>`).join('');
  }

  function montarBens() {
    const el = $('painelBens');
    el.innerHTML = cartaoMeia() + Object.entries(C.bens).map(([k, b]) => {
      const f = FAIXA[k], s = SUGESTAO[k];
      const num = (campo, rotulo, extra = '') => `<label class="campo"><span>${rotulo}</span><input type="number" min="0" step="any" data-bem="${k}" data-campo="${campo}" value="${esc(b[campo])}" ${extra}></label>`;
      return `<div class="cartao" data-cartao="${k}">
        <div class="linha-bem">
          <h2>${esc(b.nome)}</h2>
          <button class="btn btn-ghost btn-sm" type="button" data-sugestao="${k}">Usar valores da planilha</button>
        </div>
        <div class="campos">
          <label class="campo"><span>Nome exibido</span><input data-bem="${k}" data-campo="nome" value="${esc(b.nome)}"></label>
          ${num('min', 'Carta mínima (R$)')}
          ${num('max', 'Carta máxima (R$)')}
          ${num('passo', 'Passo do controle (R$)')}
        </div>
        <p class="ref" style="margin-top:8px">O simulador sempre abre na carta mínima (com o prazo da faixa, se houver; senão no maior prazo).</p>
        <p class="alerta" data-alerta-faixa="${k}"></p>
        <h3 class="sub-titulo">Prazos dos grupos e taxas</h3>
        <p class="ref">Taxa de administração + fundo de reserva sobre o crédito, por prazo de grupo, como na planilha da administradora. Livre por contrato (Lei 11.795/2008; STJ, Súmula 538). Sugestão da planilha: ${s.prazos.map(p => `${p.meses} meses ${pct(p.taxa)}%`).join(' · ')}.</p>
        <div class="prazos" data-prazos="${k}">${linhasPrazos(k, b)}</div>
        <button class="btn btn-ghost btn-sm" type="button" data-novo-prazo="${k}">+ Novo prazo</button>
        <p class="alerta" data-alerta-prazos="${k}"></p>
        <h3 class="sub-titulo">Prazo pelo valor do crédito</h3>
        <p class="ref">Quando a administradora define o prazo pelo crédito, cadastre as faixas: o visitante escolhe só o crédito e o site mostra a parcela no prazo da faixa. Sem faixas, o visitante escolhe o prazo.</p>
        <div class="prazos" data-faixas="${k}">${linhasFaixas(k, b)}</div>
        <button class="btn btn-ghost btn-sm" type="button" data-nova-faixa="${k}">+ Nova faixa</button>
        <div class="taxas">
          <div class="taxa">
            ${num('fundo', 'Taxa extra além da tabela (%)')}
            <p class="ref">Use 0 quando a taxa dos prazos já inclui o fundo de reserva (como na planilha). Algo a mais só se estiver no contrato do grupo.</p>
          </div>
          <div class="taxa">
            ${num('juros', 'Juros do financiamento (% ao mês)')}
            <p class="ref">Sugestão: <b>${pct(s.juros)}% a.m.</b> Use a taxa média do Banco Central para ${f.modalidade} (bcb.gov.br › Estatísticas › Taxas de juros). Faixa recente: ${pct(f.juros[0])}% a ${pct(f.juros[1])}% a.m.</p>
            <p class="alerta" data-alerta="${k}.juros"></p>
          </div>
        </div>
        <div class="previa" data-previa="${k}"></div>
      </div>`;
    }).join('') + cartaoVenda();

    // meia parcela
    $('chkMeia').addEventListener('change', e => { C.meiaParcela.ativa = e.target.checked; marcar(); Object.keys(C.bens).forEach(atualizarBem); });
    $('selMeiaPadrao').addEventListener('change', e => { C.meiaParcela.padrao = e.target.value === 'meia'; marcar(); });

    // prazos: editar, remover e criar (o painel é remontado ao importar backup, então liga uma vez só)
    if (!el.dataset.ligado) {
      el.dataset.ligado = '1';
      el.addEventListener('input', e => {
        const fx = e.target.closest('[data-faixa]');
        if (fx) {
          // "até" vazio = faixa final (acima da anterior)
          C.bens[fx.dataset.faixa].faixas[+fx.dataset.i][fx.dataset.campo] = fx.dataset.campo === 'ate' && fx.value === '' ? null : +fx.value;
          atualizarBem(fx.dataset.faixa);
          marcar();
          return;
        }
        const inp = e.target.closest('[data-prazo]');
        if (!inp) return;
        C.bens[inp.dataset.prazo].prazos[+inp.dataset.i][inp.dataset.campo] = +inp.value;
        atualizarBem(inp.dataset.prazo);
        marcar();
      });
      el.addEventListener('click', e => {
        const tirarF = e.target.closest('[data-tirar-faixa]');
        const novaF = e.target.closest('[data-nova-faixa]');
        if (tirarF || novaF) {
          const kf = tirarF ? tirarF.dataset.tirarFaixa : novaF.dataset.novaFaixa;
          const bf = C.bens[kf];
          bf.faixas = bf.faixas || [];
          if (tirarF) bf.faixas.splice(+tirarF.dataset.i, 1);
          else bf.faixas.push({ ate: null, meses: ultimoPrazo(bf).meses });
          el.querySelector(`[data-faixas="${kf}"]`).innerHTML = linhasFaixas(kf, bf);
          atualizarBem(kf);
          marcar();
          return;
        }
        const tirar = e.target.closest('[data-tirar-prazo]');
        const novo = e.target.closest('[data-novo-prazo]');
        const k = tirar ? tirar.dataset.tirarPrazo : novo ? novo.dataset.novoPrazo : null;
        if (!k) return;
        const b = C.bens[k];
        if (tirar) b.prazos.splice(+tirar.dataset.i, 1);
        else b.prazos.push({ meses: (ultimoPrazo(b).meses || 0) + 12, taxa: ultimoPrazo(b).taxa || 0 });
        el.querySelector(`[data-prazos="${k}"]`).innerHTML = linhasPrazos(k, b);
        atualizarBem(k);
        marcar();
      });
    }

    el.querySelectorAll('[data-venda]').forEach(inp => inp.addEventListener('input', () => {
      const [grupo, campo] = inp.dataset.venda.split('.');
      if (campo) C.venda[grupo][campo] = +inp.value; else C.venda[grupo] = +inp.value;
      atualizarVenda();
      marcar();
    }));
    $('selRetornoMes').addEventListener('change', e => {
      C.venda.retornoMes = e.target.value;
      atualizarVenda();
      marcar();
    });
    atualizarVenda();

    el.querySelectorAll('input[data-bem]').forEach(inp => {
      inp.addEventListener('input', () => {
        const b = C.bens[inp.dataset.bem];
        b[inp.dataset.campo] = inp.dataset.campo === 'nome' ? inp.value : +inp.value;
        if (inp.dataset.campo === 'nome') inp.closest('.cartao').querySelector('h2').textContent = inp.value;
        atualizarBem(inp.dataset.bem);
        marcar();
      });
    });
    el.querySelectorAll('[data-sugestao]').forEach(btn => btn.addEventListener('click', () => {
      const k = btn.dataset.sugestao, s = SUGESTAO[k];
      Object.assign(C.bens[k], { fundo: s.fundo, juros: s.juros, prazos: s.prazos.map(p => ({ ...p })), faixas: (s.faixas || []).map(f => ({ ...f })) });
      ['fundo', 'juros'].forEach(c => { el.querySelector(`input[data-bem="${k}"][data-campo="${c}"]`).value = s[c]; });
      el.querySelector(`[data-prazos="${k}"]`).innerHTML = linhasPrazos(k, C.bens[k]);
      el.querySelector(`[data-faixas="${k}"]`).innerHTML = linhasFaixas(k, C.bens[k]);
      atualizarBem(k);
      marcar();
    }));
    Object.keys(C.bens).forEach(atualizarBem);
  }

  /* ---------- compra de cotas contempladas (seção "Venda da cota") ---------- */
  function cartaoVenda() {
    const v = C.venda, ex = v.exemplo;
    const num = (chave, rotulo, valor) => `<label class="campo"><span>${rotulo}</span><input type="number" min="0" step="any" data-venda="${chave}" value="${esc(valor)}"></label>`;
    return `<div class="cartao">
      <h2>Compra de cotas contempladas</h2>
      <p class="sub">Regra da seção "Venda da cota": no sorteio, a Gold Star paga o percentual sobre o crédito cheio; no lance embutido, tira o embutido do crédito e paga o percentual sobre o que sobra.</p>
      <div class="campos">
        ${num('percentual', 'Percentual pago sobre o crédito (%)', v.percentual)}
        ${num('embutido', 'Lance embutido padrão (% do crédito)', v.embutido)}
        <label class="campo"><span>Como calcular o retorno ao mês</span>
          <select id="selRetornoMes">
            <option value="composto"${v.retornoMes === 'composto' ? ' selected' : ''}>Composto: taxa equivalente ao mês</option>
            <option value="simples"${v.retornoMes === 'simples' ? ' selected' : ''}>Simples: retorno total ÷ meses</option>
            <option value="oculto"${v.retornoMes === 'oculto' ? ' selected' : ''}>Não mostrar (só o retorno total)</option>
          </select>
        </label>
      </div>
      <p class="sub" style="margin:18px 0 10px">Exemplo que aparece preenchido quando o visitante abre a seção:</p>
      <div class="campos">
        ${num('exemplo.credito', 'Crédito contemplado (R$)', ex.credito)}
        ${num('exemplo.parcelas', 'Parcelas pagas', ex.parcelas)}
        ${num('exemplo.parcela', 'Valor médio da parcela (R$)', ex.parcela)}
      </div>
      <div class="previa" data-previa-venda></div>
    </div>`;
  }

  function atualizarVenda() {
    const v = C.venda, ex = v.exemplo;
    const recebeSorteio = ex.credito * v.percentual / 100;
    const recebeEmbutido = ex.credito * (1 - v.embutido / 100) * v.percentual / 100;
    const investido = ex.parcelas * ex.parcela;
    const roi = investido > 0 ? (recebeSorteio - investido) / investido : 0;
    const mes = !(investido > 0 && ex.parcelas > 0) ? 0
      : v.retornoMes === 'simples' ? roi / ex.parcelas
      : Math.pow(recebeSorteio / investido, 1 / ex.parcelas) - 1;
    $('painelBens').querySelector('[data-previa-venda]').innerHTML = `
      <div><span>Total investido no exemplo</span><strong>${brl(investido)}</strong></div>
      <div class="ouro"><span>Paga no sorteio</span><strong>${brl(recebeSorteio)}</strong></div>
      <div><span>Paga no lance embutido</span><strong>${brl(recebeEmbutido)}</strong></div>
      <div class="ouro"><span>ROI no sorteio</span><strong>${pct(roi * 100)}%</strong></div>
      <div><span>Retorno ao mês no sorteio</span><strong>${v.retornoMes === 'oculto' ? 'não aparece' : pct(mes * 100) + '%'}</strong></div>`;
  }

  function atualizarBem(k) {
    const b = C.bens[k], painel = $('painelBens');
    painel.querySelector(`[data-alerta="${k}.juros"]`).textContent = alertaJuros(k, +b.juros);
    painel.querySelector(`[data-alerta-faixa="${k}"]`).textContent = alertaFaixas(b);
    painel.querySelector(`[data-alerta-prazos="${k}"]`).textContent = alertaPrazos(k, b);
    if (!b.prazos.length) { painel.querySelector(`[data-previa="${k}"]`).innerHTML = ''; return; }
    const r = calcular(b);
    painel.querySelector(`[data-previa="${k}"]`).innerHTML = `
      <div><span>Prévia: "a partir de"</span><strong>${brl(+b.min)} · ${r.prazo} meses</strong></div>
      <div class="ouro"><span>${C.meiaParcela.ativa ? 'Meia parcela (cards do topo)' : 'Parcela cheia (cards do topo)'}</span><strong>${brl(C.meiaParcela.ativa ? r.parcelaCons / 2 : r.parcelaCons)}</strong></div>
      <div><span>Parcela cheia · financiamento</span><strong>${brl(r.parcelaCons)} · ${brl(r.parcelaFin)}</strong></div>
      <div class="ouro"><span>Economia mostrada</span><strong>${brl(Math.max(0, r.economia))}</strong></div>`;
  }

  /* ---------- meia parcela ---------- */
  function cartaoMeia() {
    const m = C.meiaParcela;
    return `<div class="cartao">
      <h2>Meia parcela</h2>
      <p class="sub">Como na planilha: o cliente paga metade da parcela até a contemplação e o restante é recalculado depois. Com ela ativa, os valores "a partir de" do topo mostram a meia parcela.</p>
      <div class="campos">
        <label class="chk"><input type="checkbox" id="chkMeia" ${m.ativa ? 'checked' : ''}> Oferecer a opção de meia parcela no simulador</label>
        <label class="campo"><span>O simulador abre em</span>
          <select id="selMeiaPadrao"><option value="cheia"${m.padrao ? '' : ' selected'}>Parcela cheia</option><option value="meia"${m.padrao ? ' selected' : ''}>Meia parcela</option></select>
        </label>
      </div>
    </div>`;
  }

  /* ---------- mapa do patrimônio ---------- */
  function montarObjetivos() {
    $('camposObjetivos').innerHTML = Object.keys(OBJ_NOMES).map(k =>
      `<label class="campo"><span>${OBJ_NOMES[k]} (R$)</span><input type="number" min="0" step="any" data-obj="${k}" value="${esc(C.objetivos[k])}"></label>`).join('');
    $('camposObjetivos').querySelectorAll('[data-obj]').forEach(inp => inp.addEventListener('input', () => {
      C.objetivos[inp.dataset.obj] = +inp.value;
      marcar();
    }));
  }

  /* ---------- faixa de destaques ---------- */
  function montarProvas() {
    $('listaProvas').innerHTML = C.provas.map((p, i) => `<div class="item-lista"><div class="campos">
      <label class="campo"><span>Destaque ${i + 1}: número ou título</span><input data-prova="${i}" data-campo="titulo" value="${esc(p.titulo)}"></label>
      <label class="campo"><span>Texto de apoio</span><input data-prova="${i}" data-campo="texto" value="${esc(p.texto)}"></label>
    </div></div>`).join('');
    $('listaProvas').querySelectorAll('[data-prova]').forEach(inp => inp.addEventListener('input', () => {
      C.provas[+inp.dataset.prova][inp.dataset.campo] = inp.value;
      marcar();
    }));
  }

  /* ---------- avaliações ---------- */
  function montarAvaliacoes() {
    $('listaAvaliacoes').innerHTML = C.avaliacoes.map((a, i) => `<div class="item-lista">
      <div class="campos">
        <label class="campo"><span>Nome ou descrição do cliente</span><input data-av="${i}" data-campo="nome" value="${esc(a.nome)}"></label>
        <label class="campo"><span>Bem conquistado</span><input data-av="${i}" data-campo="bem" value="${esc(a.bem)}"></label>
        <label class="campo larga"><span>Depoimento</span><textarea data-av="${i}" data-campo="texto">${esc(a.texto)}</textarea></label>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:10px;flex-wrap:wrap">
        <label class="chk"><input type="checkbox" data-av="${i}" data-campo="exemplo" ${a.exemplo ? 'checked' : ''}> Exemplo (não é de cliente real)</label>
        <button class="btn btn-link" type="button" data-remover-av="${i}">Remover</button>
      </div>
    </div>`).join('') || '<p class="sub">Nenhuma avaliação. A seção some do site enquanto a lista estiver vazia.</p>';
    $('listaAvaliacoes').querySelectorAll('[data-av]').forEach(inp => inp.addEventListener('input', () => {
      C.avaliacoes[+inp.dataset.av][inp.dataset.campo] = inp.type === 'checkbox' ? inp.checked : inp.value;
      marcar();
    }));
    $('listaAvaliacoes').querySelectorAll('[data-remover-av]').forEach(b => b.addEventListener('click', () => {
      C.avaliacoes.splice(+b.dataset.removerAv, 1);
      montarAvaliacoes();
      marcar();
    }));
  }
  $('btnNovaAvaliacao').addEventListener('click', () => {
    C.avaliacoes.push({ nome: '', bem: '', texto: '', exemplo: false });
    montarAvaliacoes();
    marcar();
  });

  $('btnAvisoSugerido').addEventListener('click', () => {
    C.aviso = AVISO_SUGERIDO;
    document.querySelector('[data-c="aviso"]').value = AVISO_SUGERIDO;
    marcar();
  });

  /* ---------- salvar, backup e restaurar ---------- */
  function problemas() {
    const m = [];
    Object.values(C.bens).forEach(b => { const a = alertaFaixas(b); if (a) m.push(`${b.nome}: ${a}`); });
    if (!/^\d{12,13}$/.test(String(C.contato.whatsapp))) m.push('WhatsApp: use DDI + DDD + número, só dígitos (ex.: 5564999999999).');
    return m;
  }

  $('btnSalvar').addEventListener('click', async () => {
    const m = problemas();
    if (m.length) { $('estado').textContent = m[0]; $('estado').className = ''; mostrarBarra(); return; }
    $('btnSalvar').disabled = true;
    try {
      await Store.salvarConfig(C);
      sujo = false;
      $('estado').textContent = 'Salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '. Recarregue o site para ver.';
      $('estado').className = 'ok';
      sumirBarraDepois();
    } catch (e) {
      console.error(e);
      $('estado').textContent = 'Não foi possível salvar. Tente de novo.';
      mostrarBarra();
    }
    $('btnSalvar').disabled = false;
  });

  $('btnExportar').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(C, null, 2)], { type: 'application/json' }));
    a.download = 'grupostar-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('arqImportar').addEventListener('change', async e => {
    const arq = e.target.files[0];
    if (!arq) return;
    try {
      C = GS_juntar(JSON.parse(await arq.text()));
      montar();
      marcar();
      $('estado').textContent = 'Backup carregado. Confira e clique em Salvar.';
    } catch (err) {
      $('estado').textContent = 'Arquivo de backup inválido.';
      mostrarBarra();
      sumirBarraDepois(3500);
    }
    e.target.value = '';
  });

  $('btnRestaurar').addEventListener('click', async () => {
    if (!confirm('Voltar todos os valores para os iniciais? O que foi salvo no painel será apagado.')) return;
    await Store.restaurarPadrao();
    C = GS_juntar(null);
    montar();
    sujo = false;
    $('estado').textContent = 'Valores iniciais restaurados.';
    mostrarBarra();
    sumirBarraDepois();
  });

  window.addEventListener('beforeunload', e => { if (sujo) { e.preventDefault(); e.returnValue = ''; } });
})();
