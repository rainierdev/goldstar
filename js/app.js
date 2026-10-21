// Gold Star · demo interativo (simulador + mapa do patrimônio)
// Taxas de exemplo para a demonstração: trocar pela tabela real da administradora.
const WHATSAPP = '556493232861';

const BENS = {
  auto:    { nome: 'Automóvel',      min: 30000,  max: 300000,  step: 5000,  valor: 90000,  pMin: 24, pMax: 100, prazo: 72,  adm: 0.15, fr: 0.02, juros: 0.0189, jurosTxt: '1,89% a.m.' },
  imovel:  { nome: 'Imóvel',         min: 100000, max: 1500000, step: 10000, valor: 350000, pMin: 60, pMax: 220, prazo: 180, adm: 0.18, fr: 0.02, juros: 0.0099, jurosTxt: '0,99% a.m.' },
  pesados: { nome: 'Pesados e agro', min: 80000,  max: 1000000, step: 10000, valor: 300000, pMin: 36, pMax: 120, prazo: 100, adm: 0.14, fr: 0.02, juros: 0.0160, jurosTxt: '1,60% a.m.' },
};

const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const curto = v => v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi' : 'R$ ' + Math.round(v / 1000) + ' mil';
const $ = id => document.getElementById(id);

// consórcio: carta + taxa de administração + fundo de reserva, dividido no prazo
// financiamento: tabela Price sobre 100% do valor, para comparar
function calcular(bem, valor, prazo) {
  const totalCons = valor * (1 + bem.adm + bem.fr);
  const parcelaFin = valor * bem.juros / (1 - Math.pow(1 + bem.juros, -prazo));
  return {
    parcelaCons: totalCons / prazo,
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
document.querySelectorAll('[data-from]').forEach(el => {
  const bem = BENS[el.dataset.from];
  animar(el, calcular(bem, bem.min, bem.pMax).parcelaCons);
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
  const on = document.querySelector('.tab.is-on');
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
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-on', t.dataset.bem === chave));
  moverPill();
  // começa da mesma posição visual em que os controles estavam, na escala nova
  Object.assign(inValor, { min: b.min, max: b.max, step: 'any' });
  Object.assign(inPrazo, { min: b.pMin, max: b.pMax, step: 'any' });
  $('minValor').textContent = curto(b.min);
  $('maxValor').textContent = curto(b.max);
  $('minPrazo').textContent = b.pMin + ' meses';
  $('maxPrazo').textContent = b.pMax + ' meses';
  $('jurosTxt').textContent = '· ' + b.jurosTxt;

  const fim = () => {
    tween = 0;
    inValor.step = b.step;
    inPrazo.step = 1;
    inValor.value = b.valor;
    inPrazo.value = b.prazo;
    atualizarSimulador();
  };
  if (!animarTroca) return fim();

  const grafico = document.querySelector('.sim-chart');
  grafico.classList.add('is-swapping');
  setTimeout(() => grafico.classList.remove('is-swapping'), 280);

  const de = { v: b.min + pctV * (b.max - b.min), p: b.pMin + pctP * (b.pMax - b.pMin) };
  const t0 = performance.now();
  const passo = t => {
    const k = Math.min(1, (t - t0) / 700);
    const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    inValor.value = de.v + (b.valor - de.v) * e;
    inPrazo.value = Math.round(de.p + (b.prazo - de.p) * e);
    atualizarSimulador();
    if (k < 1) tween = requestAnimationFrame(passo); else fim();
  };
  tween = requestAnimationFrame(passo);
}

function atualizarSimulador() {
  const b = BENS[bemAtual];
  const valor = +inValor.value;
  const prazo = +inPrazo.value;
  const r = calcular(b, valor, prazo);
  pintarTrilho(inValor);
  pintarTrilho(inPrazo);
  $('outValor').textContent = brl(valor);
  $('outPrazo').textContent = prazo + ' meses';
  animar($('parcelaCons'), r.parcelaCons);
  animar($('parcelaFin'), r.parcelaFin);
  animar($('totalCons'), r.totalCons);
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

document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => escolherBem(t.dataset.bem)));
[inValor, inPrazo].forEach(inp => {
  inp.addEventListener('pointerdown', pararTween);
  inp.addEventListener('input', atualizarSimulador);
});
escolherBem('auto', false);
// a fonte muda a largura das abas depois de carregar
document.fonts && document.fonts.ready.then(moverPill);

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
  casa:        { nome: 'Casa',        bem: 'imovel',  valor: 350000 },
  terreno:     { nome: 'Terreno',     bem: 'imovel',  valor: 150000 },
  reforma:     { nome: 'Reforma',     bem: 'imovel',  valor: 80000 },
  carro:       { nome: 'Carro',       bem: 'auto',    valor: 90000 },
  caminhonete: { nome: 'Caminhonete', bem: 'auto',    valor: 250000 },
  moto:        { nome: 'Moto',        bem: 'auto',    valor: 30000 },
  trator:      { nome: 'Trator',      bem: 'pesados', valor: 400000 },
};
const icone = k => `<svg viewBox="0 0 24 24">${ICONES[k]}</svg>`;

const anoBase = new Date().getFullYear() + 1;
const ANOS = Array.from({ length: 10 }, (_, i) => anoBase + i);
let plano = [
  { id: 1, tipo: 'carro', ano: anoBase, valor: 90000 },
  { id: 2, tipo: 'casa', ano: anoBase + 3, valor: 350000 },
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
      const r = calcular(b, p.valor, b.prazo);
      return `<div class="plan-item">
        <div class="plan-item-top">${o.nome} em ${p.ano}<span>${brl(p.valor)}</span></div>
        <input type="range" min="${b.min}" max="${b.max}" step="${b.step}" value="${p.valor}" data-valor="${p.id}">
        <div class="plan-item-sub"><span>${b.prazo} meses</span><span>parcela <b>${brl(r.parcelaCons)}</b></span></div>
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
        item.querySelector('.plan-item-sub b').textContent = brl(calcular(b, p.valor, b.prazo).parcelaCons);
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
    const r = calcular(b, p.valor, b.prazo);
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
let mensagemBase = '';

function abrirLead(titulo, corpo) {
  mensagemBase = corpo;
  $('modalTitle').textContent = titulo;
  $('modal').hidden = false;
  atualizarPreview();
  setTimeout(() => $('leadNome').focus(), 50);
}
function montarMensagem() {
  const nome = $('leadNome').value.trim() || '...';
  const cidade = $('leadCidade').value.trim();
  return `Olá! Vim pelo site da Gold Star.\nNome: ${nome}${cidade ? '\nCidade: ' + cidade : ''}\n\n${mensagemBase}`;
}
function atualizarPreview() { $('leadPreview').textContent = montarMensagem(); }

$('leadNome').addEventListener('input', atualizarPreview);
$('leadCidade').addEventListener('input', atualizarPreview);
$('modalX').addEventListener('click', () => { $('modal').hidden = true; });
$('modal').addEventListener('click', e => { if (e.target.id === 'modal') $('modal').hidden = true; });
$('leadForm').addEventListener('submit', e => {
  e.preventDefault();
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(montarMensagem())}`, '_blank', 'noopener');
  $('modal').hidden = true;
});

$('btnSim').addEventListener('click', () => {
  const b = BENS[bemAtual];
  const r = calcular(b, +inValor.value, +inPrazo.value);
  abrirLead('Receber minha simulação',
    `Fiz uma simulação:\nBem: ${b.nome}\nCarta: ${brl(+inValor.value)}\nPrazo: ${inPrazo.value} meses\nParcela estimada: ${brl(r.parcelaCons)}\n\nQuero falar com um consultor.`);
});

$('btnPlano').addEventListener('click', () => {
  if (!plano.length) { rolarPara($('mapa')); return; }
  const linhas = [...plano].sort((a, b) => a.ano - b.ano)
    .map(p => `• ${p.ano}: ${OBJETIVOS[p.tipo].nome} (${brl(p.valor)})`).join('\n');
  abrirLead('Revisar meu plano',
    `Montei meu mapa do patrimônio:\n${linhas}\n\nParcelas somadas: ${brl(mensalPlano)}/mês\nQuero que um consultor revise meu plano.`);
});

/* ---------- avaliações ---------- */
// EXEMPLOS para a demonstração: substituir pelos comentários reais, com autorização de cada cliente
const AVALIACOES = [
  { nome: 'Cliente de Montividiu', bem: 'Automóvel', texto: 'Atendimento atencioso do começo ao fim. Me explicaram o lance com calma e fui contemplado antes do que imaginava.' },
  { nome: 'Cliente de Rio Verde', bem: 'Imóvel', texto: 'Eu achava que consórcio era só sorte. Com o planejamento deles entendi o caminho e hoje estou na casa própria.' },
  { nome: 'Produtor rural', bem: 'Pesados e agro', texto: 'Comprei minha máquina sem pagar juros de banco. A parcela coube no planejamento da safra.' },
  { nome: 'Cliente de Jataí', bem: 'Automóvel', texto: 'Sempre que tive dúvida me responderam rápido no WhatsApp. Recomendo para quem quer comprar com segurança.' },
  { nome: 'Cliente de Montividiu', bem: 'Imóvel', texto: 'Fizeram as contas comigo lado a lado com o financiamento. A diferença foi tão grande que nem pensei duas vezes.' },
  { nome: 'Cliente de Rio Verde', bem: 'Caminhonete', texto: 'Equipe séria e premiada. Acompanharam cada assembleia e me avisaram na hora da contemplação.' },
];
const cartao = (a, copia) => `<article class="review${copia ? ' review-copia' : ''}"${copia ? ' aria-hidden="true"' : ''}>
  <span class="review-stars" aria-label="5 estrelas">★★★★★</span>
  <p>${a.texto}</p>
  <div class="review-who"><span class="review-avatar">${a.nome[0]}</span>
    <div><strong>${a.nome}</strong><span>${a.bem}</span></div><span class="review-tag">exemplo</span></div>
</article>`;
// a lista vai duas vezes para a faixa girar sem emenda
$('reviews').innerHTML = AVALIACOES.map(a => cartao(a, false)).join('') + AVALIACOES.map(a => cartao(a, true)).join('');

/* ---------- vídeo do consultor: começa mudo (exigência dos navegadores), o visitante liga o som ---------- */
const ctaVideo = $('ctaVideo');
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
