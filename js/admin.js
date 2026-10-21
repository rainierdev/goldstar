// Grupo Star · painel do dono: edita taxas, faixas, textos, avaliações e contato do site
(async function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const brl = v => (isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const pct = n => (+n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  // Proposta de valores: taxa de administração e fundo como a média de mercado,
  // juros do financiamento perto da taxa média do Banco Central para cada modalidade.
  const SUGESTAO = {
    auto:    { adm: 15, fundo: 2, juros: 1.89 },
    imovel:  { adm: 18, fundo: 2, juros: 0.95 },
    pesados: { adm: 14, fundo: 2, juros: 1.60 },
  };
  // faixas usuais de mercado (não são limites da lei; servem para alertar valores fora do comum)
  const FAIXA = {
    auto:    { adm: [12, 20], fundo: [1, 3], juros: [1.6, 2.3], modalidade: 'veículos para pessoa física' },
    imovel:  { adm: [14, 25], fundo: [1, 3], juros: [0.85, 1.1], modalidade: 'financiamento imobiliário' },
    pesados: { adm: [10, 18], fundo: [1, 3], juros: [1.2, 1.9], modalidade: 'veículos pesados e máquinas' },
  };
  const AVISO_SUGERIDO = 'Simulação estimada, sem valor de proposta. A contemplação ocorre por sorteio ou lance e não tem data garantida. Taxa de administração, fundo de reserva e prazos seguem o contrato da administradora. A comparação usa a taxa média de juros do Banco Central para financiamentos e não inclui seguros e tarifas (CET).';
  const OBJ_NOMES = { casa: 'Casa', terreno: 'Terreno', reforma: 'Reforma', carro: 'Carro', caminhonete: 'Caminhonete', moto: 'Moto', trator: 'Trator' };

  let C = null;
  let sujo = false;

  /* ---------- entrada ---------- */
  try { await Store.iniciar(); } catch (e) { console.error(e); }
  const online = Store.modo === 'firebase';
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
    montar();
  }

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

  function marcar() {
    sujo = true;
    $('estado').textContent = 'Alterações não salvas.';
    $('estado').className = '';
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
  function calcular(b) {
    const valor = +b.valor, prazo = +b.prazo, i = +b.juros / 100;
    const totalCons = valor * (1 + (+b.adm + +b.fundo) / 100);
    const parcelaFin = i > 0 ? valor * i / (1 - Math.pow(1 + i, -prazo)) : valor / prazo;
    return { parcelaCons: totalCons / prazo, parcelaFin, totalCons, totalFin: parcelaFin * prazo, economia: parcelaFin * prazo - totalCons };
  }

  function alertaTaxa(k, campo, v) {
    const [lo, hi] = FAIXA[k][campo];
    if (!(v >= 0)) return 'Informe um número.';
    if (campo === 'juros') {
      if (v > hi * 1.15) return 'Acima da taxa média do mercado: a economia mostrada pode ser vista como comparação enganosa (CDC, art. 37).';
      if (v < lo * .85) return 'Abaixo da média: a economia mostrada fica menor que a real.';
      if (k === 'imovel' && v > .95) return 'Acima do teto de juros do SFH (cerca de 0,95% ao mês). Só use se a comparação for com financiamento fora do SFH.';
      return '';
    }
    if (v > hi) return 'Acima da faixa comum de mercado. Confira se é o percentual do contrato da administradora.';
    if (v < lo) return 'Abaixo da faixa comum de mercado. Confira se é o percentual do contrato da administradora.';
    return '';
  }

  function alertaFaixas(b) {
    const m = [];
    if (+b.min >= +b.max) m.push('A carta mínima precisa ser menor que a máxima.');
    if (+b.valor < +b.min || +b.valor > +b.max) m.push('O valor inicial precisa ficar entre a carta mínima e a máxima.');
    if (+b.prazoMin >= +b.prazoMax) m.push('O prazo mínimo precisa ser menor que o máximo.');
    if (+b.prazo < +b.prazoMin || +b.prazo > +b.prazoMax) m.push('O prazo inicial precisa ficar entre o mínimo e o máximo.');
    if (!(+b.passo > 0)) m.push('O passo precisa ser maior que zero.');
    return m.join(' ');
  }

  function montarBens() {
    const el = $('painelBens');
    el.innerHTML = Object.entries(C.bens).map(([k, b]) => {
      const f = FAIXA[k], s = SUGESTAO[k];
      const num = (campo, rotulo, extra = '') => `<label class="campo"><span>${rotulo}</span><input type="number" min="0" step="any" data-bem="${k}" data-campo="${campo}" value="${esc(b[campo])}" ${extra}></label>`;
      return `<div class="cartao" data-cartao="${k}">
        <div class="linha-bem">
          <h2>${esc(b.nome)}</h2>
          <button class="btn btn-ghost btn-sm" type="button" data-sugestao="${k}">Usar valores sugeridos</button>
        </div>
        <div class="campos">
          <label class="campo"><span>Nome exibido</span><input data-bem="${k}" data-campo="nome" value="${esc(b.nome)}"></label>
          ${num('min', 'Carta mínima (R$)')}
          ${num('max', 'Carta máxima (R$)')}
          ${num('passo', 'Passo do controle (R$)')}
          ${num('valor', 'Carta inicial (R$)')}
          ${num('prazoMin', 'Prazo mínimo (meses)')}
          ${num('prazoMax', 'Prazo máximo (meses)')}
          ${num('prazo', 'Prazo inicial (meses)')}
        </div>
        <p class="alerta" data-alerta-faixa="${k}"></p>
        <div class="taxas">
          <div class="taxa">
            ${num('adm', 'Taxa de administração (% do total)')}
            <p class="ref">Sugestão: <b>${pct(s.adm)}%</b>. Mercado: ${f.adm[0]}% a ${f.adm[1]}%. Livre por contrato (Lei 11.795/2008; STJ, Súmula 538): use a taxa da administradora parceira.</p>
            <p class="alerta" data-alerta="${k}.adm"></p>
          </div>
          <div class="taxa">
            ${num('fundo', 'Fundo de reserva (% do total)')}
            <p class="ref">Sugestão: <b>${pct(s.fundo)}%</b>. Mercado: ${f.fundo[0]}% a ${f.fundo[1]}%. Só pode ser cobrado se estiver previsto no contrato do grupo.</p>
            <p class="alerta" data-alerta="${k}.fundo"></p>
          </div>
          <div class="taxa">
            ${num('juros', 'Juros do financiamento (% ao mês)')}
            <p class="ref">Sugestão: <b>${pct(s.juros)}% a.m.</b> Use a taxa média do Banco Central para ${f.modalidade} (bcb.gov.br › Estatísticas › Taxas de juros). Faixa recente: ${pct(f.juros[0])}% a ${pct(f.juros[1])}% a.m.</p>
            <p class="alerta" data-alerta="${k}.juros"></p>
          </div>
        </div>
        <div class="previa" data-previa="${k}"></div>
      </div>`;
    }).join('');

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
      const k = btn.dataset.sugestao;
      Object.assign(C.bens[k], SUGESTAO[k]);
      ['adm', 'fundo', 'juros'].forEach(c => { el.querySelector(`input[data-bem="${k}"][data-campo="${c}"]`).value = SUGESTAO[k][c]; });
      atualizarBem(k);
      marcar();
    }));
    Object.keys(C.bens).forEach(atualizarBem);
  }

  function atualizarBem(k) {
    const b = C.bens[k];
    ['adm', 'fundo', 'juros'].forEach(c => { $('painelBens').querySelector(`[data-alerta="${k}.${c}"]`).textContent = alertaTaxa(k, c, +b[c]); });
    $('painelBens').querySelector(`[data-alerta-faixa="${k}"]`).textContent = alertaFaixas(b);
    const r = calcular(b);
    $('painelBens').querySelector(`[data-previa="${k}"]`).innerHTML = `
      <div><span>Prévia: carta inicial</span><strong>${brl(+b.valor)} · ${+b.prazo || 0} meses</strong></div>
      <div class="ouro"><span>Parcela no consórcio</span><strong>${brl(r.parcelaCons)}</strong></div>
      <div><span>Parcela no financiamento</span><strong>${brl(r.parcelaFin)}</strong></div>
      <div class="ouro"><span>Economia mostrada</span><strong>${brl(Math.max(0, r.economia))}</strong></div>`;
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
    if (m.length) { $('estado').textContent = m[0]; $('estado').className = ''; return; }
    $('btnSalvar').disabled = true;
    try {
      await Store.salvarConfig(C);
      sujo = false;
      $('estado').textContent = 'Salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '. Recarregue o site para ver.';
      $('estado').className = 'ok';
    } catch (e) {
      console.error(e);
      $('estado').textContent = 'Não foi possível salvar. Tente de novo.';
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
  });

  window.addEventListener('beforeunload', e => { if (sujo) { e.preventDefault(); e.returnValue = ''; } });
})();
