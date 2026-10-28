/* =========================================================
   GRUPO STAR — CONFIGURAÇÃO
   ---------------------------------------------------------
   MODO DEMONSTRAÇÃO (firebase: null):
     o que o dono salva no painel fica só no navegador
     daquele aparelho. Serve para testar o site e o painel.

   MODO ONLINE (para uso real):
     cole abaixo o objeto de configuração do projeto Firebase
     (passo a passo no LEIAME.md). Assim o que o dono salva
     no painel aparece para todos os visitantes.
   ========================================================= */
window.GS_CONFIG = {
  // Supabase (recomendado): URL do projeto e chave "anon public" (Project Settings › API).
  // A chave anon é pública por natureza; quem protege os dados são as regras de supabase.sql.
  supabase: null,
  /* Exemplo:
  supabase: {
    url: "https://abcdefghijkl.supabase.co",
    chave: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  */
  firebase: null
  /* Exemplo:
  firebase: {
    apiKey: "AIza...",
    authDomain: "grupo-star.firebaseapp.com",
    projectId: "grupo-star",
    storageBucket: "grupo-star.appspot.com",
    messagingSenderId: "000000000",
    appId: "1:000000000:web:abc123"
  }
  */
};

/* Valores iniciais. Depois que o dono salva no painel, o que vale é o painel.
   Taxas em porcentagem: adm e fundo de reserva sobre o valor da carta (total do plano);
   juros do financiamento ao mês. */
window.GS_PADRAO = {
  contato: {
    whatsapp: '556493232861',            // DDI + DDD + número, só dígitos
    instagram: 'goldstarconsultoria'
  },
  topo: {
    titulo: 'Conquiste o seu próximo bem',
    destaque: 'sem pagar juros',
    subtitulo: 'Carro, casa, caminhonete ou trator: a Gold Star planeja o caminho com você, do primeiro boleto à chave na mão.'
  },
  // Prazos e taxas da planilha "Proposta direcionada com Investimento" (aba Simulação):
  // taxa = taxa de administração + fundo de reserva sobre o crédito, por prazo de grupo.
  // fundo = algum percentual extra além da taxa (a planilha já inclui o fundo na taxa, por isso 0).
  // O simulador sempre abre na carta mínima e no maior prazo (menor parcela).
  bens: {
    auto: {
      nome: 'Automóvel', min: 30000, max: 300000, passo: 5000, fundo: 0, juros: 1.89,
      prazos: [{ meses: 36, taxa: 9.5 }, { meses: 72, taxa: 16 }, { meses: 100, taxa: 16 }, { meses: 120, taxa: 16 }, { meses: 140, taxa: 16 }]
    },
    imovel: {
      nome: 'Imóvel', min: 100000, max: 1500000, passo: 10000, fundo: 0, juros: 0.95,
      prazos: [{ meses: 180, taxa: 23 }, { meses: 200, taxa: 23 }, { meses: 220, taxa: 23 }, { meses: 240, taxa: 24 }]
    },
    pesados: {
      nome: 'Pesados e agro', min: 80000, max: 1000000, passo: 10000, fundo: 0, juros: 1.60,
      prazos: [{ meses: 36, taxa: 9.5 }, { meses: 72, taxa: 16 }, { meses: 100, taxa: 16 }, { meses: 120, taxa: 16 }, { meses: 140, taxa: 16 }]
    }
  },
  // meia parcela: paga metade da parcela até a contemplação (como na planilha)
  meiaParcela: { ativa: true, padrao: false },
  // compra de cotas contempladas: a Gold Star paga um % do crédito (cheio no sorteio,
  // descontado o lance embutido quando for o caso)
  venda: {
    percentual: 20,                      // % pago sobre o crédito que sobra
    embutido: 30,                        // % do crédito usado no lance embutido
    retornoMes: 'composto',              // 'composto', 'simples' (ROI ÷ meses) ou 'oculto'
    // no mínimo: menor carta, 1 parcela paga, meia parcela da carta de R$ 30 mil em 140 meses (16%)
    exemplo: { credito: 30000, parcelas: 1, parcela: 124.29 }
  },
  aviso: 'Valores estimados para demonstração, com taxas médias de mercado. A contemplação ocorre por sorteio ou lance e não tem data garantida. Condições finais dependem da administradora.',
  provas: [
    { titulo: '1º lugar', texto: 'Troféu Fama 2025 · Montividiu-GO' },
    { titulo: 'R$ 42.120', texto: 'em crédito para o automóvel de um cliente' },
    { titulo: 'Planejar · Proteger · Multiplicar', texto: 'atendimento do primeiro boleto à chave na mão' }
  ],
  // valor sugerido de cada objetivo quando o visitante o coloca no mapa do patrimônio
  // no mínimo de cada tipo de bem; o site nunca passa da faixa de carta
  objetivos: { casa: 100000, terreno: 100000, reforma: 100000, carro: 30000, caminhonete: 30000, moto: 30000, trator: 80000 },
  avaliacoes: [
    { nome: 'Cliente de Montividiu', bem: 'Automóvel', texto: 'Atendimento atencioso do começo ao fim. Me explicaram o lance com calma e fui contemplado antes do que imaginava.', exemplo: true },
    { nome: 'Cliente de Rio Verde', bem: 'Imóvel', texto: 'Eu achava que consórcio era só sorte. Com o planejamento deles entendi o caminho e hoje estou na casa própria.', exemplo: true },
    { nome: 'Produtor rural', bem: 'Pesados e agro', texto: 'Comprei minha máquina sem pagar juros de banco. A parcela coube no planejamento da safra.', exemplo: true },
    { nome: 'Cliente de Jataí', bem: 'Automóvel', texto: 'Sempre que tive dúvida me responderam rápido no WhatsApp. Recomendo para quem quer comprar com segurança.', exemplo: true },
    { nome: 'Cliente de Montividiu', bem: 'Imóvel', texto: 'Fizeram as contas comigo lado a lado com o financiamento. A diferença foi tão grande que nem pensei duas vezes.', exemplo: true },
    { nome: 'Cliente de Rio Verde', bem: 'Caminhonete', texto: 'Equipe séria e premiada. Acompanharam cada assembleia e me avisaram na hora da contemplação.', exemplo: true }
  ],
  pin: '1234'                            // senha do painel no modo demonstração
};
