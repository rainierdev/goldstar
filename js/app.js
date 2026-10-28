// Gold Star · site interativo (simulador + mapa do patrimônio)
// Taxas, textos, WhatsApp e avaliações vêm da configuração que o dono edita no painel (admin.html).
const $ = id => document.getElementById(id);

function iniciarSite(C) {
  const WHATSAPP = C.contato.whatsapp;
  const pct = n => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  // no painel as taxas estão em %, aqui viram fração. Os prazos são os dos grupos da planilha,
  // cada um com a sua taxa; o controle de prazo anda pelo índice dessa lista.
  const BENS = {};
  Object.entries(C.bens).forEach(([k, b]) => {
    const prazos = [...b.prazos].sort((x, y) => x.meses - y.meses).map(p => ({ meses: +p.meses, taxa: (+p.taxa + +b.fundo) / 100 }));
    BENS[k] = {
      nome: b.nome, min: b.min, max: b.max, step: b.passo, prazos,
      valor: b.min, ultimo: prazos.length - 1, // abre na carta mínima e no maior prazo (menor parcela)
      juros: b.juros / 100, jurosTxt: pct(b.juros) + '% a.m.',
    };
  });
  const MEIA = C.meiaParcela.ativa;
  let meia = MEIA && C.meiaParcela.padrao;

  // texto digitado no painel entra na página como texto, nunca como HTML
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  /* ---------- textos e contatos editáveis ---------- */
  $('heroTitulo').innerHTML = `${esc(C.topo.titulo)} <span class="gold">${esc(C.topo.destaque)}</span>.`;
  $('heroSub').textContent = C.topo.subtitulo;
  $('avisoSim').textContent = C.aviso;
  $('provas').innerHTML = C.provas.map(p =>
    `<div class="proof-item"><strong>${esc(p.titulo)}</strong><span>${esc(p.texto)}</span></div>`).join('');
  document.querySelectorAll('a[href^="https://wa.me/"]').forEach(a => {
    a.href = a.href.replace(/wa\.me\/\d+/, 'wa.me/' + WHATSAPP);
  });
  document.querySelectorAll('a[href*="instagram.com/"]').forEach(a => {
    a.href = 'https://www.instagram.com/' + C.contato.instagram + '/';
    if (a.textContent.startsWith('@')) a.textContent = '@' + C.contato.instagram;
  });
  document.querySelectorAll('[data-zap]').forEach(el => {
    const n = WHATSAPP.replace(/^55/, '');
    el.textContent = `(${n.slice(0, 2)}) ${n.slice(2, -4)}-${n.slice(-4)}`;
  });
  document.querySelectorAll('[data-nome-bem]').forEach(el => { el.textContent = BENS[el.dataset.nomeBem].nome; });

  const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const curto = v => v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi' : 'R$ ' + Math.round(v / 1000) + ' mil';

  // consórcio (como na planilha): carta × (1 + taxa do prazo) ÷ prazo; meia parcela = metade até a contemplação
  // financiamento: tabela Price sobre 100% do valor, para comparar
  function calcular(bem, valor, idx) {
    const g = bem.prazos[Math.max(0, Math.min(bem.ultimo, Math.round(idx)))];
    const prazo = g.meses;
    const totalCons = valor * (1 + g.taxa);
    const parcelaFin = valor * bem.juros / (1 - Math.pow(1 + bem.juros, -prazo));
    return {
      prazo,
      taxa: g.taxa,
      parcelaCons: totalCons / prazo,
      meiaParcela: totalCons / prazo / 2,
      totalCons,
      parcelaFin,
      totalFin: parcelaFin * prazo,
      economia: parcelaFin * prazo - totalCons,
    };
  }

  // números que "rolam" até o valor novo
  function animar(el, para) {
    const de = el._v || 0;
    el._v = para;
    const t0 = performance.now();
    cancelAnimationFrame(el._raf);
    const passo = t => {
      const k = Math.min(1, (t - t0) / 450);
      el.textContent = brl(de + (para - de) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) el._raf = requestAnimationFrame(passo);
    };
    el._raf = requestAnimationFrame(passo);
  }

  /* ---------- cards do topo ---------- */
  // "a partir de": menor carta no maior prazo, com meia parcela quando ela estiver ativa (como na planilha)
  document.querySelectorAll('[data-from]').forEach(el => {
    const bem = BENS[el.dataset.from];
    const r = calcular(bem, bem.min, bem.ultimo);
    animar(el, MEIA ? r.meiaParcela : r.parcelaCons);
    const per = el.closest('.plan-card').querySelector('.plan-per');
    per.textContent = MEIA ? `meia parcela · ${r.prazo} meses` : `por mês · ${r.prazo} meses`;
  });
  document.querySelectorAll('.plan-card').forEach(card => card.addEventListener('click', () => {
    rolarPara($('simulador'));
    escolherBem(card.dataset.bem);
  }));

  /* ---------- rolagem suave própria (funciona mesmo com animações do sistema desligadas) ---------- */
  function rolarPara(alvo) {
    const topo = document.querySelector('.topbar').offsetHeight;
    const y0 = window.scrollY;
    const y1 = alvo.getBoundingClientRect().top + window.scrollY - topo - 12;
    const dur = Math.min(1300, 500 + Math.abs(y1 - y0) * 0.35);
    const t0 = performance.now();
    const passo = t => {
      const k = Math.min(1, (t - t0) / dur);
      const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      window.scrollTo({ top: y0 + (y1 - y0) * e, behavior: 'instant' });
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const alvo = document.querySelector(a.getAttribute('href'));
    if (!alvo) return;
    e.preventDefault();
    rolarPara(alvo);
    history.replaceState(null, '', a.getAttribute('href'));
  }));

  /* ---------- simulador ---------- */
  let bemAtual = 'auto';
  const inValor = $('inValor');
  const inPrazo = $('inPrazo');

  function pintarTrilho(input) {
    input.style.setProperty('--p', ((input.value - input.min) / (input.max - input.min) * 100) + '%');
  }

  const pill = $('tabPill');
  function moverPill() {
    const on = document.querySelector('#tabsBem .tab.is-on');
    pill.style.width = on.offsetWidth + 'px';
    pill.style.transform = `translateX(${on.offsetLeft}px)`;
  }
  window.addEventListener('resize', moverPill);

  // ao trocar de bem, os controles deslizam até os valores novos e o gráfico acompanha
  let tween = 0;
  function pararTween() {
    if (!tween) return;
    cancelAnimationFrame(tween);
    tween = 0;
    inValor.step = BENS[bemAtual].step;
    inPrazo.step = 1;
  }

  function escolherBem(chave, animarTroca = true) {
    const pctV = (inValor.value - inValor.min) / (inValor.max - inValor.min) || 0;
    const pctP = (inPrazo.value - inPrazo.min) / (inPrazo.max - inPrazo.min) || 0;
    pararTween();
    bemAtual = chave;
    const b = BENS[chave];
    document.querySelectorAll('#tabsBem .tab').forEach(t => t.classList.toggle('is-on', t.dataset.bem === chave));
    moverPill();
    // começa da mesma posição visual em que os controles estavam, na escala nova
    Object.assign(inValor, { min: b.min, max: b.max, step: 'any' });
    Object.assign(inPrazo, { min: 0, max: b.ultimo, step: 'any' });
    $('minValor').textContent = curto(b.min);
    $('maxValor').textContent = curto(b.max);
    $('minPrazo').textContent = b.prazos[0].meses + ' meses';
    $('maxPrazo').textContent = b.prazos[b.ultimo].meses + ' meses';
    $('jurosTxt').textContent = '· ' + b.jurosTxt;

    const fim = () => {
      tween = 0;
      inValor.step = b.step;
      inPrazo.step = 1;
      inValor.value = b.valor;
      inPrazo.value = b.ultimo;
      atualizarSimulador();
    };
    if (!animarTroca) return fim();

    const grafico = document.querySelector('.sim-chart');
    grafico.classList.add('is-swapping');
    setTimeout(() => grafico.classList.remove('is-swapping'), 280);

    const de = { v: b.min + pctV * (b.max - b.min), p: pctP * b.ultimo };
    const t0 = performance.now();
    const passo = t => {
      const k = Math.min(1, (t - t0) / 700);
      const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      inValor.value = de.v + (b.valor - de.v) * e;
      inPrazo.value = Math.round(de.p + (b.ultimo - de.p) * e);
      atualizarSimulador();
      if (k < 1) tween = requestAnimationFrame(passo); else fim();
    };
    tween = requestAnimationFrame(passo);
  }

  function atualizarSimulador() {
    const b = BENS[bemAtual];
    const valor = +inValor.value;
    const r = calcular(b, valor, +inPrazo.value);
    const prazo = r.prazo;
    pintarTrilho(inValor);
    pintarTrilho(inPrazo);
    $('outValor').textContent = brl(valor);
    $('outPrazo').textContent = prazo + ' meses';
    $('taxaCons').textContent = `· taxa ${pct(r.taxa * 100)}%`;
    $('labelCons').textContent = meia ? 'Consórcio · meia parcela' : 'Consórcio';
    $('subCons').innerHTML = meia
      ? `até a contemplação · cheia <b>${brl(r.parcelaCons)}</b>`
      : `por mês · total <b>${brl(r.totalCons)}</b>`;
    animar($('parcelaCons'), meia ? r.meiaParcela : r.parcelaCons);
    animar($('parcelaFin'), r.parcelaFin);
    animar($('totalFin'), r.totalFin);
    animar($('economia'), Math.max(0, r.economia));
    desenharGrafico(prazo, r.totalCons, r.totalFin);
  }

  function desenharGrafico(prazo, totalCons, totalFin) {
    const W = 600, H = 300, L = 8, R = 92, T = 20, B = 30;
    const x = m => L + (m / prazo) * (W - L - R);
    const y = v => H - B - (v / totalFin) * (H - T - B);
    let grade = '';
    for (let i = 1; i <= 4; i++) {
      const gy = T + (H - T - B) * i / 4;
      grade += `<line class="grid" x1="${L}" x2="${W - R}" y1="${gy}" y2="${gy}"/>`;
    }
    let eixo = '';
    for (let i = 0; i <= 4; i++) {
      const m = Math.round(prazo * i / 4);
      eixo += `<text class="axis" x="${x(m)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}">${m === 0 ? 'mês 0' : m + 'º mês'}</text>`;
    }
    const x0 = x(0), y0 = y(0), x1 = x(prazo);
    $('chart').innerHTML = `
      <defs>
        <linearGradient id="gapFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#d4a93a" stop-opacity=".35"/>
          <stop offset="1" stop-color="#d4a93a" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${grade}${eixo}
      <polygon class="gap" points="${x0},${y0} ${x1},${y(totalFin)} ${x1},${y(totalCons)}"/>
      <line class="line-fin draw" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y(totalFin)}"/>
      <line class="line-cons draw" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y(totalCons)}"/>
      <circle cx="${x1}" cy="${y(totalFin)}" r="5" fill="#6e6e76"/>
      <circle cx="${x1}" cy="${y(totalCons)}" r="6" fill="#f6e08f"/>
      <text class="end" x="${x1 + 10}" y="${y(totalFin) + 4}" fill="#9b968c">${curto(totalFin)}</text>
      <text class="end" x="${x1 + 10}" y="${y(totalCons) + 4}" fill="#f6e08f">${curto(totalCons)}</text>`;
  }

  document.querySelectorAll('#tabsBem .tab').forEach(t => t.addEventListener('click', () => escolherBem(t.dataset.bem)));
  [inValor, inPrazo].forEach(inp => {
    inp.addEventListener('pointerdown', pararTween);
    inp.addEventListener('input', atualizarSimulador);
  });
  // parcela cheia ou meia parcela: pílula dourada deslizando, como nas outras escolhas
  function moverPillParcela() {
    const on = document.querySelector('#tabsParcela .tab.is-on');
    $('pillParcela').style.width = on.offsetWidth + 'px';
    $('pillParcela').style.transform = `translateX(${on.offsetLeft}px)`;
  }
  $('tabsParcela').hidden = !MEIA;
  document.querySelectorAll('#tabsParcela .tab').forEach(t => {
    t.classList.toggle('is-on', (t.dataset.meia === '1') === meia);
    t.addEventListener('click', () => {
      meia = t.dataset.meia === '1';
      document.querySelectorAll('#tabsParcela .tab').forEach(x => x.classList.toggle('is-on', x === t));
      moverPillParcela();
      atualizarSimulador();
    });
  });
  window.addEventListener('resize', moverPillParcela);

  escolherBem('auto', false);
  moverPillParcela();
  // a fonte muda a largura das abas depois de carregar
  document.fonts && document.fonts.ready.then(() => { moverPill(); moverPillParcela(); });

  /* ---------- venda da cota contemplada ---------- */
  // regra da Gold Star: paga um % do crédito; no lance embutido, desconta o embutido antes
  const V = C.venda;
  let forma = 'sorteio';
  const pct2 = n => (isFinite(n) ? n * 100 : 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
  $('vCredito').value = V.exemplo.credito;
  $('vParcelas').value = V.exemplo.parcelas;
  $('vParcela').value = V.exemplo.parcela;
  $('vEmbutido').value = V.embutido;
  $('vMes').closest('.cmp').hidden = V.retornoMes === 'oculto';
  $('vNotaRetorno').textContent = V.retornoMes === 'oculto' ? ''
    : V.retornoMes === 'simples' ? 'Retorno ao mês: retorno total dividido pelo número de parcelas pagas. '
    : 'Retorno ao mês: taxa equivalente composta sobre o total investido no período. ';

  function calcularVenda() {
    const credito = Math.max(0, +$('vCredito').value || 0);
    const embutido = forma === 'embutido' ? Math.min(100, Math.max(0, +$('vEmbutido').value || 0)) / 100 : 0;
    const base = credito * (1 - embutido);
    const recebe = base * V.percentual / 100;
    const parcelas = Math.max(0, Math.round(+$('vParcelas').value || 0));
    const investido = parcelas * Math.max(0, +$('vParcela').value || 0);
    const lucro = recebe - investido;
    const roi = investido > 0 ? lucro / investido : 0;
    // retorno ao mês, conforme o dono escolheu no painel:
    // composto = taxa que transforma o total investido no valor recebido no mesmo número de meses
    // simples  = ROI dividido pelo número de meses
    let mes = 0, ano = 0;
    if (investido > 0 && parcelas > 0 && recebe > 0) {
      if (V.retornoMes === 'simples') { mes = roi / parcelas; ano = mes * 12; }
      else { mes = Math.pow(recebe / investido, 1 / parcelas) - 1; ano = Math.pow(1 + mes, 12) - 1; }
    }
    return { credito, embutido, base, recebe, parcelas, investido, lucro, roi, mes, ano };
  }

  function atualizarVenda() {
    const r = calcularVenda();
    $('vRegra').innerHTML = forma === 'sorteio'
      ? `Contemplação por sorteio: pagamos <b>${pct(V.percentual)}%</b> sobre o crédito cheio de <b>${brl(r.credito)}</b>.`
      : `Lance embutido: do crédito de ${brl(r.credito)} saem ${pct(r.embutido * 100)}% do lance, sobram <b>${brl(r.base)}</b>, e pagamos <b>${pct(V.percentual)}%</b> sobre esse valor.`;
    animar($('vRecebe'), r.recebe);
    animar($('vInvestido'), r.investido);
    animar($('vLucro'), r.lucro);
    $('vRoi').textContent = pct2(r.roi);
    $('vMes').textContent = pct2(r.mes);
    $('vAno').textContent = r.mes ? `≈ ${pct2(r.ano)} ao ano` : '';
  }

  // a pílula dourada desliza até a opção escolhida, como nas abas do simulador
  function moverPillContemplacao() {
    const on = document.querySelector('#tabsContemplacao .tab.is-on');
    $('pillContemplacao').style.width = on.offsetWidth + 'px';
    $('pillContemplacao').style.transform = `translateX(${on.offsetLeft}px)`;
  }
  window.addEventListener('resize', moverPillContemplacao);
  document.fonts && document.fonts.ready.then(moverPillContemplacao);
  moverPillContemplacao();

  document.querySelectorAll('#tabsContemplacao .tab').forEach(t => t.addEventListener('click', () => {
    forma = t.dataset.forma;
    document.querySelectorAll('#tabsContemplacao .tab').forEach(x => x.classList.toggle('is-on', x === t));
    moverPillContemplacao();
    $('campoEmbutido').hidden = forma !== 'embutido';
    atualizarVenda();
  }));
  ['vCredito', 'vEmbutido', 'vParcelas', 'vParcela'].forEach(id => $(id).addEventListener('input', atualizarVenda));
  atualizarVenda();

  /* ---------- mapa do patrimônio ---------- */
  const ICONES = {
    casa:        '<path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z"/>',
    terreno:     '<path d="M2 20l6-9 4 5 3-4 7 8z"/><circle cx="17" cy="6" r="2"/>',
    reforma:     '<path d="M14 3l7 7-3 3-7-7z"/><path d="M11 9l-8 8 4 4 8-8"/>',
    carro:       '<path d="M3 16v-4l2.5-5h13L21 12v4z"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/>',
    caminhonete: '<path d="M2 16v-4l3-5h7v5h10v4z"/><circle cx="6.5" cy="17" r="2"/><circle cx="17.5" cy="17" r="2"/>',
    moto:        '<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M5 17l5-7h4l5 7M12 10l-1-4h3"/>',
    trator:      '<circle cx="8" cy="16" r="5"/><circle cx="19" cy="18" r="2.5"/><path d="M13 16h4M4 11V5h7l2 6h6l1 5"/>',
  };
  const OBJETIVOS = {
    casa:        { nome: 'Casa',        bem: 'imovel' },
    terreno:     { nome: 'Terreno',     bem: 'imovel' },
    reforma:     { nome: 'Reforma',     bem: 'imovel' },
    carro:       { nome: 'Carro',       bem: 'auto' },
    caminhonete: { nome: 'Caminhonete', bem: 'auto' },
    moto:        { nome: 'Moto',        bem: 'auto' },
    trator:      { nome: 'Trator',      bem: 'pesados' },
  };
  // valor sugerido de cada objetivo vem do painel, sempre dentro da faixa do tipo de bem
  Object.entries(OBJETIVOS).forEach(([k, o]) => {
    const b = BENS[o.bem];
    o.valor = Math.min(b.max, Math.max(b.min, +C.objetivos[k] || b.valor));
  });
  const icone = k => `<svg viewBox="0 0 24 24">${ICONES[k]}</svg>`;

  const anoBase = new Date().getFullYear() + 1;
  const ANOS = Array.from({ length: 10 }, (_, i) => anoBase + i);
  let plano = [
    { id: 1, tipo: 'carro', ano: anoBase, valor: OBJETIVOS.carro.valor },
    { id: 2, tipo: 'casa', ano: anoBase + 3, valor: OBJETIVOS.casa.valor },
  ];
  let proximoId = 3;
  let mensalPlano = 0;
  let escolhido = null; // toque no celular: escolhe o objetivo e depois o ano

  const goalsEl = $('goals');
  const timelineEl = $('timeline');

  goalsEl.innerHTML = Object.entries(OBJETIVOS).map(([k, o]) =>
    `<button class="goal" draggable="true" data-tipo="${k}">${icone(k)}${o.nome}</button>`).join('');

  goalsEl.querySelectorAll('.goal').forEach(g => {
    g.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', g.dataset.tipo));
    g.addEventListener('click', () => {
      escolhido = escolhido === g.dataset.tipo ? null : g.dataset.tipo;
      goalsEl.querySelectorAll('.goal').forEach(x => x.classList.toggle('is-picked', x.dataset.tipo === escolhido));
      timelineEl.classList.toggle('is-picking', !!escolhido);
    });
  });

  function adicionar(tipo, ano) {
    plano.push({ id: proximoId++, tipo, ano, valor: OBJETIVOS[tipo].valor });
    renderMapa();
  }

  function renderMapa() {
    timelineEl.innerHTML = ANOS.map(ano => {
      const itens = plano.filter(p => p.ano === ano);
      return `<div class="year ${itens.length ? 'has-goal' : ''}" data-ano="${ano}">
        <span class="year-label">${ano}</span>
        ${itens.map(p => `<div class="token">${icone(p.tipo)}<span>${OBJETIVOS[p.tipo].nome}<small>${curto(p.valor)}</small></span>
          <button data-remover="${p.id}" aria-label="Remover">×</button></div>`).join('')}
      </div>`;
    }).join('');

    timelineEl.querySelectorAll('.year').forEach(col => {
      const ano = +col.dataset.ano;
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('is-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('is-over'));
      col.addEventListener('drop', e => {
        e.preventDefault();
        const tipo = e.dataTransfer.getData('text/plain');
        if (OBJETIVOS[tipo]) adicionar(tipo, ano);
      });
      col.addEventListener('click', e => {
        if (e.target.closest('[data-remover]') || !escolhido) return;
        adicionar(escolhido, ano);
      });
    });
    timelineEl.querySelectorAll('[data-remover]').forEach(b => b.addEventListener('click', () => {
      plano = plano.filter(p => p.id !== +b.dataset.remover);
      renderMapa();
    }));

    renderPlano();
  }

  function renderPlano() {
    const lista = $('planList');
    const ordenado = [...plano].sort((a, b) => a.ano - b.ano);
    if (!ordenado.length) {
      lista.innerHTML = '<p class="plan-empty">Arraste um objetivo para a linha do tempo para começar.</p>';
    } else {
      lista.innerHTML = ordenado.map(p => {
        const o = OBJETIVOS[p.tipo], b = BENS[o.bem];
        const r = calcular(b, p.valor, b.ultimo);
        return `<div class="plan-item">
          <div class="plan-item-top">${o.nome} em ${p.ano}<span>${brl(p.valor)}</span></div>
          <input type="range" min="${b.min}" max="${b.max}" step="${b.step}" value="${p.valor}" data-valor="${p.id}">
          <div class="plan-item-sub"><span>${b.prazos[b.ultimo].meses} meses</span><span>parcela <b>${brl(r.parcelaCons)}</b></span></div>
        </div>`;
      }).join('');
      lista.querySelectorAll('[data-valor]').forEach(inp => {
        pintarTrilho(inp);
        inp.addEventListener('input', () => {
          plano.find(p => p.id === +inp.dataset.valor).valor = +inp.value;
          pintarTrilho(inp);
          const item = inp.closest('.plan-item');
          const p = plano.find(x => x.id === +inp.dataset.valor);
          const b = BENS[OBJETIVOS[p.tipo].bem];
          item.querySelector('.plan-item-top span').textContent = brl(p.valor);
          item.querySelector('.plan-item-sub b').textContent = brl(calcular(b, p.valor, b.ultimo).parcelaCons);
          atualizarTotais();
          renderTokens();
        });
      });
    }
    atualizarTotais();
  }

  // atualiza só os valores dos tokens, sem redesenhar a linha do tempo enquanto arrasta
  function renderTokens() {
    plano.forEach(p => {
      const btn = timelineEl.querySelector(`[data-remover="${p.id}"]`);
      if (btn) btn.parentElement.querySelector('small').textContent = curto(p.valor);
    });
  }

  function atualizarTotais() {
    let patrimonio = 0, mensal = 0, juros = 0;
    plano.forEach(p => {
      const b = BENS[OBJETIVOS[p.tipo].bem];
      const r = calcular(b, p.valor, b.ultimo);
      patrimonio += p.valor;
      mensal += r.parcelaCons;
      juros += Math.max(0, r.economia);
    });
    mensalPlano = mensal;
    animar($('planPatrimonio'), patrimonio);
    animar($('planMensal'), mensal);
    animar($('planJuros'), juros);
  }

  $('btnLimpar').addEventListener('click', () => { plano = []; renderMapa(); });
  renderMapa();

  /* ---------- lead + WhatsApp ---------- */
  // o visitante informa nome, WhatsApp, estado e cidade; o lead fica salvo para o painel do dono
  // e a mensagem com a simulação abre pronta no WhatsApp da Gold Star
  let mensagemBase = '', origemLead = '';

  function abrirLead(titulo, corpo, origem) {
    mensagemBase = corpo;
    origemLead = origem;
    $('modalTitle').textContent = titulo;
    $('leadErro').textContent = '';
    $('modal').hidden = false;
    if (!cidadesCarregadas) carregarCidades($('leadUF').value);
    atualizarPreview();
    setTimeout(() => $('leadNome').focus(), 50);
  }

  // telefone: só dígitos, mostrado como (64) 99999-9999
  const digitos = s => String(s).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
  function formatarFone(d) {
    if (d.length <= 2) return d ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  $('leadFone').addEventListener('input', () => {
    $('leadFone').value = formatarFone(digitos($('leadFone').value));
    atualizarPreview();
  });

  // cidades do estado escolhido, direto da base pública do IBGE; se não responder, vira campo de texto
  const cacheCidades = {};
  let cidadesCarregadas = false;
  async function carregarCidades(uf) {
    cidadesCarregadas = true;
    const sel = $('leadCidade'), txt = $('leadCidadeTexto');
    sel.innerHTML = '<option value="">Carregando…</option>';
    try {
      if (!cacheCidades[uf]) {
        const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
        if (!r.ok) throw new Error('IBGE ' + r.status);
        cacheCidades[uf] = (await r.json()).map(m => m.nome);
      }
      if ($('leadUF').value !== uf) return; // o visitante já trocou de estado
      sel.innerHTML = '<option value="">Escolha a cidade</option>' +
        cacheCidades[uf].map(n => `<option>${esc(n)}</option>`).join('');
      sel.hidden = false; sel.required = true;
      txt.hidden = true; txt.required = false;
    } catch (e) {
      console.error(e);
      sel.hidden = true; sel.required = false;
      txt.hidden = false; txt.required = true;
    }
    atualizarPreview();
  }
  $('leadUF').addEventListener('change', () => { carregarCidades($('leadUF').value); atualizarPreview(); });
  const cidadeEscolhida = () => ($('leadCidade').hidden ? $('leadCidadeTexto').value : $('leadCidade').value).trim();

  function montarMensagem() {
    const nome = $('leadNome').value.trim() || '...';
    const cidade = cidadeEscolhida();
    return `Olá! Vim pelo site da Gold Star.\nNome: ${nome}${cidade ? `\nCidade: ${cidade}/${$('leadUF').value}` : ''}\n\n${mensagemBase}`;
  }
  function atualizarPreview() { $('leadPreview').textContent = montarMensagem(); }

  ['leadNome', 'leadCidadeTexto'].forEach(id => $(id).addEventListener('input', atualizarPreview));
  $('leadCidade').addEventListener('change', atualizarPreview);
  $('modalX').addEventListener('click', () => { $('modal').hidden = true; });
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal') $('modal').hidden = true; });
  $('leadForm').addEventListener('submit', e => {
    e.preventDefault();
    const fone = digitos($('leadFone').value);
    if (fone.length < 10) { $('leadErro').textContent = 'Informe o WhatsApp com DDD.'; $('leadFone').focus(); return; }
    if (!cidadeEscolhida()) { $('leadErro').textContent = 'Escolha a sua cidade.'; return; }
    // o WhatsApp abre na hora (navegadores bloqueiam janelas abertas depois de esperar o salvamento)
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(montarMensagem())}`, '_blank', 'noopener');
    Store.salvarLead({
      criadoEm: new Date().toISOString(),
      nome: $('leadNome').value.trim().slice(0, 80),
      telefone: fone,
      estado: $('leadUF').value,
      cidade: cidadeEscolhida().slice(0, 80),
      origem: origemLead,
      resumo: mensagemBase.slice(0, 1500),
    }).catch(err => console.error('lead não salvo', err));
    $('modal').hidden = true;
  });

  $('btnMetodo').addEventListener('click', () => {
    abrirLead('Construir meu patrimônio',
      'Conheci o Método API (Aplicar • Poupar • Investir) e quero construir meu patrimônio.', 'Método API');
  });

  $('btnSim').addEventListener('click', () => {
    const b = BENS[bemAtual];
    const r = calcular(b, +inValor.value, +inPrazo.value);
    abrirLead('Receber minha simulação',
      `Fiz uma simulação:\nBem: ${b.nome}\nCarta: ${brl(+inValor.value)}\nPrazo: ${r.prazo} meses\n` +
      (meia ? `Meia parcela até a contemplação: ${brl(r.meiaParcela)} (cheia ${brl(r.parcelaCons)})` : `Parcela estimada: ${brl(r.parcelaCons)}`) +
      `\n\nQuero falar com um consultor.`, "Simulador");
  });

  $('btnVender').addEventListener('click', () => {
    const r = calcularVenda();
    abrirLead('Vender minha cota',
      `Quero vender minha cota contemplada:\nContemplação: ${forma === 'sorteio' ? 'sorteio' : 'lance embutido (' + pct(r.embutido * 100) + '%)'}\n` +
      `Crédito: ${brl(r.credito)}\nParcelas pagas: ${r.parcelas} (total ${brl(r.investido)})\nValor estimado da proposta: ${brl(r.recebe)}\n\nQuero uma proposta para a minha cota.`, "Venda da cota");
  });

  $('btnPlano').addEventListener('click', () => {
    if (!plano.length) { rolarPara($('mapa')); return; }
    const linhas = [...plano].sort((a, b) => a.ano - b.ano)
      .map(p => `• ${p.ano}: ${OBJETIVOS[p.tipo].nome} (${brl(p.valor)})`).join('\n');
    abrirLead('Revisar meu plano',
      `Montei meu mapa do patrimônio:\n${linhas}\n\nParcelas somadas: ${brl(mensalPlano)}/mês\nQuero que um consultor revise meu plano.`, "Mapa do patrimônio");
  });

  /* ---------- avaliações ---------- */
  // vêm do painel; as marcadas como exemplo levam o selo "exemplo" e o aviso no título
  const AVALIACOES = C.avaliacoes.filter(a => a && a.texto);
  const cartao = (a, copia) => `<article class="review${copia ? ' review-copia' : ''}"${copia ? ' aria-hidden="true"' : ''}>
    <span class="review-stars" aria-label="5 estrelas">★★★★★</span>
    <p>${esc(a.texto)}</p>
    <div class="review-who"><span class="review-avatar">${esc((a.nome || '?')[0])}</span>
      <div><strong>${esc(a.nome || '')}</strong><span>${esc(a.bem || '')}</span></div>${a.exemplo ? '<span class="review-tag">exemplo</span>' : ''}</div>
  </article>`;
  $('avisoAvaliacoes').hidden = !AVALIACOES.some(a => a.exemplo);
  $('avaliacoes').hidden = !AVALIACOES.length;
  // a lista vai duas vezes para a faixa girar sem emenda
  $('reviews').innerHTML = AVALIACOES.map(a => cartao(a, false)).join('') + AVALIACOES.map(a => cartao(a, true)).join('');

  /* ---------- vídeo do consultor: começa mudo (exigência dos navegadores), o visitante liga o som ---------- */
  const ctaVideo = $('ctaVideo');
  // o vídeo só baixa quando o visitante chega perto dele, para não pesar na abertura do site
  new IntersectionObserver((es, obs) => {
    if (!es[0].isIntersecting) return;
    ctaVideo.src = ctaVideo.dataset.src;
    ctaVideo.play().catch(() => {});
    obs.disconnect();
  }, { rootMargin: '300px' }).observe(ctaVideo);
  $('ctaSom').addEventListener('click', () => {
    ctaVideo.muted = !ctaVideo.muted;
    if (!ctaVideo.muted) { ctaVideo.currentTime = 0; ctaVideo.play(); }
    $('ctaSom').textContent = ctaVideo.muted ? 'Ativar som' : 'Desativar som';
  });

  /* ---------- imagem que não carregar some, em vez de mostrar o texto alternativo ---------- */
  function esconderSeFalhar(img) {
    // imagem com loading="lazy" ainda não carregada também aparece como "completa" com largura 0, então só confere as normais
    if (img.loading !== 'lazy' && img.complete && img.naturalWidth === 0) img.classList.add('img-falhou');
    img.addEventListener('error', () => img.classList.add('img-falhou'));
  }
  document.querySelectorAll('img').forEach(esconderSeFalhar);

  /* ---------- revelar ao rolar ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll('.sec-head, .sim-head, .proof-item, .gallery figure, .faq details, .cta').forEach(el => {
    el.classList.add('reveal');
    io.observe(el);
  });
}

// carrega a configuração (navegador ou Firebase) e monta o site; se falhar, usa os valores iniciais
Store.iniciar()
  .then(() => Store.lerConfig())
  .catch(e => { console.error(e); return GS_juntar(null); })
  .then(iniciarSite);
