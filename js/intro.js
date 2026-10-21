// Gold Star · abertura do site (3 s no total)
// 0,0–1,1 s  mãos douradas se apertam
// 0,9–1,4 s  faísca com partículas no ponto do aperto
// 1,0–1,6 s  logo entra do desfoque para o foco enquanto as mãos somem
// 1,4–2,0 s  reflexo metálico atravessa o logo e a estrela cintila
// 2,0–2,9 s  fundo esmaece e o logo encolhe até o lugar dele na barra do topo
(function () {
  const raiz = document.getElementById('intro');
  if (!raiz) return;

  function encerrar() {
    document.documentElement.classList.remove('intro-ativa');
    raiz.remove();
  }

  const D = window.INTRO_DADOS;
  if (!D) return encerrar();

  try {
    iniciar();
  } catch (e) {
    console.error(e);
    encerrar();
  }

  function iniciar() {
    const CENTRO = { x: 300, y: 410 }; // centro do logo; as mãos e a faísca ficam aqui
    // recorte do logo do topo (img/logo-grupostar-topo.svg): o logo sem as duas linhas de frases
    const TOPO = { x: 2, y: 183, w: 592 };

    const particulas = Array.from({ length: 14 }, (_, i) =>
      `<circle class="intro-particula" cx="${CENTRO.x}" cy="${CENTRO.y}" r="${1.4 + (i % 3) * .7}" fill="#f6e08f"/>`).join('');

    raiz.insertAdjacentHTML('beforeend', `${D.style}
      <div class="intro-palco">
        <svg class="intro-svg" viewBox="0 176 600 470" aria-label="Grupo Star · Patrimônio, Investimentos e Negócios">
          ${D.defs}
          <defs>
            <radialGradient id="introFaisca">
              <stop offset="0" stop-color="#fff6d6" stop-opacity="1"/>
              <stop offset=".3" stop-color="#f6e08f" stop-opacity=".6"/>
              <stop offset="1" stop-color="#d4a93a" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="introReflexo" x1="0" x2="1">
              <stop offset="0" stop-color="#fff" stop-opacity="0"/>
              <stop offset=".5" stop-color="#fff" stop-opacity=".85"/>
              <stop offset="1" stop-color="#fff" stop-opacity="0"/>
            </linearGradient>
            <mask id="introMascara" mask-type="alpha" maskUnits="userSpaceOnUse" x="0" y="170" width="620" height="480">
              <use href="#introLogoBase"/>
            </mask>
          </defs>
          <circle class="intro-faisca" cx="${CENTRO.x}" cy="${CENTRO.y}" r="0" fill="url(#introFaisca)"/>
          ${particulas}
          <g class="intro-logo">
            <g id="introLogoBase" filter="url(#relevo)">${D.art}</g>
            <g mask="url(#introMascara)">
              <rect class="intro-reflexo" x="-140" y="176" width="90" height="470" fill="url(#introReflexo)"/>
            </g>
            <path class="intro-cintilar" d="M0 -14 L3 -3 L14 0 L3 3 L0 14 L-3 3 L-14 0 L-3 -3 Z" fill="#fff6d6"/>
          </g>
        </svg>
        <div class="intro-maos" aria-hidden="true"></div>
      </div>
      <button type="button" class="intro-pular">Pular</button>`);

    const palco = raiz.querySelector('.intro-palco');
    const svg = raiz.querySelector('.intro-svg');
    const logo = raiz.querySelector('.intro-logo');
    const base = raiz.querySelector('#introLogoBase');
    const maos = raiz.querySelector('.intro-maos');
    const faisca = raiz.querySelector('.intro-faisca');
    const pontos = [...raiz.querySelectorAll('.intro-particula')];
    const reflexo = raiz.querySelector('.intro-reflexo');
    const cintilar = raiz.querySelector('.intro-cintilar');

    // estrela e arco: as peças douradas (classe st1) do alto do logo; as frases de baixo somem na saída
    const estrela = [], frases = [];
    [...base.querySelectorAll('path')].forEach(p => {
      const b = p.getBBox();
      if (p.classList.contains('st1') && b.y < 400) estrela.push(p);
      if (b.y >= 565) frases.push(p);
    });
    const brilhoEstrela = v => estrela.forEach(p => { p.style.filter = v; });
    const PONTA = { x: 304, y: 194 }; // ponta de cima da estrela

    // direção e distância de cada partícula, fixas para a animação ser sempre igual
    const rumo = pontos.map((_, i) => {
      const ang = (i / pontos.length) * Math.PI * 2 + (i % 2) * .25;
      return { dx: Math.cos(ang), dy: Math.sin(ang), dist: 46 + (i * 37 % 40) };
    });

    // mãos: "Handshake Loop" de Brian Karungani (LottieFiles, Lottie Simple License), recolorida em dourado
    const M = window.MAOS_JSON;
    const anim = window.lottie && M
      ? window.lottie.loadAnimation({ container: maos, renderer: 'svg', loop: false, autoplay: false, animationData: M })
      : null;
    const MAOS = { tam: 240 };
    function posicionarMaos() {
      const r = svg.getBoundingClientRect(), s = palco.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      const k = r.width / vb.width;
      maos.style.width = maos.style.height = MAOS.tam * k + 'px';
      maos.style.left = (r.left - s.left + (CENTRO.x - vb.x - MAOS.tam / 2) * k) + 'px';
      maos.style.top = (r.top - s.top + (CENTRO.y - vb.y - MAOS.tam / 2) * k) + 'px';
    }
    posicionarMaos();
    window.addEventListener('resize', posicionarMaos);

    const clamp = v => Math.max(0, Math.min(1, v));
    const seg = (t, a, b) => clamp((t - a) / (b - a));
    const lerp = (a, b, k) => a + (b - a) * k;
    const easeOut = k => 1 - Math.pow(1 - k, 3);
    const easeInOut = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const sino = k => Math.sin(k * Math.PI); // sobe e desce

    const FIM = 2000; // depois disso começa a saída (0,9 s)

    function quadro(t) {
      // mãos: o aperto roda um pouco mais rápido para caber no tempo
      if (anim && t < 1600) anim.goToAndStop((t / 1000 * M.fr * 1.3) % (M.op - M.ip), true);
      const troca = easeInOut(seg(t, 1000, 1600));
      maos.style.opacity = Math.min(seg(t, 0, 300), 1 - troca);
      maos.style.transform = `scale(${lerp(.94, 1, easeOut(seg(t, 0, 600))) + troca * .06})`;

      // faísca no aperto
      const f = seg(t, 900, 1400);
      faisca.setAttribute('r', easeOut(f) * 60);
      faisca.style.opacity = sino(f);
      pontos.forEach((p, i) => {
        const r = rumo[i], d = easeOut(f) * r.dist;
        p.setAttribute('transform', `translate(${r.dx * d} ${r.dy * d})`);
        p.style.opacity = f > 0 ? 1 - f : 0;
      });

      // logo: do desfoque para o foco, encolhendo de leve
      logo.style.opacity = troca;
      logo.style.filter = `blur(${(1 - troca) * 8}px)`;
      logo.style.transform = `scale(${lerp(1.08, 1, troca)})`;

      // reflexo metálico da esquerda para a direita
      const ref = easeInOut(seg(t, 1400, 2000));
      reflexo.setAttribute('transform', `translate(${ref * 860} 0) skewX(-20)`);
      reflexo.style.opacity = ref > 0 && ref < 1 ? 1 : 0;

      // estrela cintila: brilho em volta e um pontinho de luz na ponta
      const c = seg(t, 1550, 2000);
      brilhoEstrela(`drop-shadow(0 0 ${sino(c) * 12}px rgba(246,224,143,.9))`);
      const sc = sino(c);
      cintilar.setAttribute('transform', `translate(${PONTA.x} ${PONTA.y}) rotate(${c * 90}) scale(${sc})`);
      cintilar.style.opacity = sc;
    }

    // saída: o fundo esmaece e o logo encolhe até o logo da barra do topo
    let saindo = false, raf = 0;
    function sair() {
      if (saindo) return;
      saindo = true;
      cancelAnimationFrame(raf);
      quadro(FIM);
      brilhoEstrela('');
      // as frases não existem no logo do topo: somem enquanto o logo encolhe
      frases.forEach(p => { p.style.transition = 'opacity .45s'; p.style.opacity = 0; });
      logo.style.filter = '';
      logo.style.transform = '';

      const alvo = document.querySelector('.brand img');
      raiz.classList.add('is-saindo');
      if (!alvo) { setTimeout(encerrar, 900); return; }

      // caixa do logo no SVG da abertura, no mesmo recorte do logo do topo
      const ctm = svg.getScreenCTM();
      const de = { x: TOPO.x * ctm.a + ctm.e, y: TOPO.y * ctm.d + ctm.f, w: TOPO.w * ctm.a };
      const caixa = svg.getBoundingClientRect();
      const para = alvo.getBoundingClientRect();
      const k = para.width / de.w;
      const tx = para.left - caixa.left - (de.x - caixa.left) * k;
      const ty = para.top - caixa.top - (de.y - caixa.top) * k;
      svg.style.transformOrigin = '0 0';
      svg.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
      setTimeout(encerrar, 950);
    }

    raiz.querySelector('.intro-pular').addEventListener('click', sair);
    quadro(0);
    const comecar = () => {
      const t0 = performance.now();
      const passo = agora => {
        const t = agora - t0;
        quadro(Math.min(t, FIM));
        if (t < FIM) raf = requestAnimationFrame(passo);
        else sair();
      };
      raf = requestAnimationFrame(passo);
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(comecar, 100));
  }
})();
