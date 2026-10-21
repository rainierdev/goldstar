// Grupo Star · abertura do site (3 s no total)
// 0,0–1,1 s  mãos douradas se apertam
// 0,9–1,4 s  faísca com partículas no ponto do aperto
// 1,0–1,6 s  logo aparece crescendo de leve enquanto as mãos somem
// 1,4–2,0 s  reflexo metálico atravessa o logo e a estrela cintila
// 2,0–2,9 s  fundo esmaece e o logo encolhe até o lugar dele na barra do topo
// O logo é uma imagem já renderizada (img/logo-*-1600.webp) e a animação só mexe em
// transform e opacidade, que o celular faz na placa de vídeo sem engasgar.
(function () {
  const raiz = document.getElementById('intro');
  if (!raiz) return;

  function encerrar() {
    document.documentElement.classList.remove('intro-ativa');
    raiz.remove();
  }

  try {
    iniciar();
  } catch (e) {
    console.error(e);
    encerrar();
  }

  function iniciar() {
    const particulas = Array.from({ length: 14 }, () => '<span class="intro-particula"></span>').join('');
    raiz.insertAdjacentHTML('beforeend', `
      <div class="intro-palco">
        <div class="intro-brilho"></div>
        <div class="intro-faisca"></div>
        ${particulas}
        <div class="intro-maos" aria-hidden="true"></div>
        <div class="intro-logo">
          <div class="intro-topo">
            <img src="img/logo-topo-1600.webp" alt="Grupo Star" decoding="async">
            <div class="intro-reflexo"><i></i></div>
            <span class="intro-cintilar"></span>
          </div>
          <img class="intro-frases" src="img/logo-frases-1600.webp" alt="Patrimônio, Investimentos e Negócios. Planejar, Proteger, Multiplicar." decoding="async">
        </div>
      </div>
      <button type="button" class="intro-pular">Pular</button>`);

    const palco = raiz.querySelector('.intro-palco');
    const logo = raiz.querySelector('.intro-logo');
    const topoImg = raiz.querySelector('.intro-topo img');
    const frasesImg = raiz.querySelector('.intro-frases');
    const maos = raiz.querySelector('.intro-maos');
    const brilho = raiz.querySelector('.intro-brilho');
    const faisca = raiz.querySelector('.intro-faisca');
    const pontos = [...raiz.querySelectorAll('.intro-particula')];
    const reflexo = raiz.querySelector('.intro-reflexo i');
    const cintilar = raiz.querySelector('.intro-cintilar');

    // direção e distância de cada partícula (em fração da largura do palco), fixas para a animação ser sempre igual
    const rumo = pontos.map((_, i) => {
      const ang = (i / pontos.length) * Math.PI * 2 + (i % 2) * .25;
      return { dx: Math.cos(ang), dy: Math.sin(ang), dist: .08 + (i * 37 % 40) / 600 };
    });

    // mãos: "Handshake Loop" de Brian Karungani (LottieFiles, Lottie Simple License), recolorida em dourado
    const M = window.MAOS_JSON;
    const anim = window.lottie && M
      ? window.lottie.loadAnimation({ container: maos, renderer: 'svg', loop: false, autoplay: false, animationData: M,
          rendererSettings: { progressiveLoad: true, hideOnTransparent: true } })
      : null;

    const clamp = v => Math.max(0, Math.min(1, v));
    const seg = (t, a, b) => clamp((t - a) / (b - a));
    const lerp = (a, b, k) => a + (b - a) * k;
    const easeOut = k => 1 - Math.pow(1 - k, 3);
    const easeInOut = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const sino = k => Math.sin(k * Math.PI);

    const FIM = 2000; // depois disso começa a saída (0,9 s)
    let largura = palco.clientWidth;
    window.addEventListener('resize', () => { largura = palco.clientWidth; });

    function quadro(t) {
      // mãos: o aperto roda um pouco mais rápido para caber no tempo
      if (anim && t < 1600) anim.goToAndStop((t / 1000 * M.fr * 1.3) % (M.op - M.ip), true);
      const troca = easeInOut(seg(t, 1000, 1600));
      maos.style.opacity = Math.min(seg(t, 0, 300), 1 - troca);
      maos.style.transform = `translate(-50%, -50%) scale(${lerp(.94, 1, easeOut(seg(t, 0, 600))) + troca * .06})`;

      // faísca no aperto
      const f = seg(t, 900, 1400);
      faisca.style.opacity = sino(f);
      faisca.style.transform = `translate(-50%, -50%) scale(${easeOut(f)})`;
      pontos.forEach((p, i) => {
        const r = rumo[i], d = easeOut(f) * r.dist * largura;
        p.style.transform = `translate(${r.dx * d}px, ${r.dy * d}px)`;
        p.style.opacity = f > 0 ? 1 - f : 0;
      });

      // logo aparece crescendo de leve até o tamanho certo; o brilho dourado atrás acompanha
      logo.style.opacity = troca;
      logo.style.transform = `scale(${lerp(1.08, 1, easeOut(troca))})`;
      brilho.style.opacity = troca * (1 - .4 * seg(t, 1600, 2000));

      // reflexo metálico da esquerda para a direita
      const ref = easeInOut(seg(t, 1400, 2000));
      reflexo.style.transform = `translateX(${ref * 760}%) skewX(-20deg)`;
      reflexo.style.opacity = ref > 0 && ref < 1 ? 1 : 0;

      // estrela cintila na ponta de cima
      const c = seg(t, 1550, 2000);
      cintilar.style.opacity = sino(c);
      cintilar.style.transform = `translate(-50%, -50%) rotate(${c * 90}deg) scale(${sino(c)})`;
    }

    // saída: o fundo esmaece, as frases somem e o logo encolhe até o logo da barra do topo
    let saindo = false, raf = 0;
    function sair() {
      if (saindo) return;
      saindo = true;
      cancelAnimationFrame(raf);
      quadro(FIM);
      if (anim) anim.destroy();

      const alvo = document.querySelector('.brand img');
      raiz.classList.add('is-saindo');
      if (!alvo) { setTimeout(encerrar, 900); return; }

      logo.style.transform = 'none';
      const de = topoImg.getBoundingClientRect();
      const para = alvo.getBoundingClientRect();
      const k = para.width / de.width;
      logo.style.transformOrigin = '0 0';
      void logo.offsetWidth; // aplica a origem antes de ligar a transição
      logo.style.transition = 'transform .9s cubic-bezier(.7, 0, .2, 1)';
      logo.style.transform = `translate(${para.left - de.left}px, ${para.top - de.top}px) scale(${k})`;
      setTimeout(encerrar, 950);
    }

    raiz.querySelector('.intro-pular').addEventListener('click', sair);
    quadro(0);
    const comecar = () => {
      largura = palco.clientWidth;
      const t0 = performance.now();
      const passo = agora => {
        const t = agora - t0;
        quadro(Math.min(t, FIM));
        if (t < FIM) raf = requestAnimationFrame(passo);
        else sair();
      };
      raf = requestAnimationFrame(passo);
    };
    // começa quando o logo já está decodificado, para não piscar
    const pronto = img => (img.decode ? img.decode() : Promise.resolve()).catch(() => {});
    Promise.all([pronto(topoImg), pronto(frasesImg)]).then(() => setTimeout(comecar, 60));
  }
})();
