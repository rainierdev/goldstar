// Grupo Star · onde ficam as configurações que o dono edita no painel
// modo demonstração: navegador (localStorage) · modo online: Firebase Firestore, documento config/site
(function () {
  const CFG = window.GS_CONFIG || {};
  const PADRAO = window.GS_PADRAO;
  const clone = o => JSON.parse(JSON.stringify(o));

  // junta o que foi salvo com os valores iniciais, para nunca faltar um campo novo
  function juntar(salvo) {
    const p = clone(PADRAO);
    if (!salvo) return p;
    const bens = {};
    Object.keys(p.bens).forEach(k => {
      const s = (salvo.bens || {})[k] || {};
      bens[k] = { ...p.bens[k], ...s };
      // configuração salva antes da lista de prazos da planilha: usa os prazos padrão
      if (!Array.isArray(s.prazos) || !s.prazos.length) bens[k].prazos = p.bens[k].prazos;
    });
    return {
      ...p, ...salvo,
      contato: { ...p.contato, ...(salvo.contato || {}) },
      topo: { ...p.topo, ...(salvo.topo || {}) },
      meiaParcela: { ...p.meiaParcela, ...(salvo.meiaParcela || {}) },
      venda: { ...p.venda, ...(salvo.venda || {}), exemplo: { ...p.venda.exemplo, ...((salvo.venda || {}).exemplo || {}) } },
      bens,
      objetivos: { ...p.objetivos, ...(salvo.objetivos || {}) },
      provas: Array.isArray(salvo.provas) ? salvo.provas : p.provas,
      avaliacoes: Array.isArray(salvo.avaliacoes) ? salvo.avaliacoes : p.avaliacoes
    };
  }

  /* ---------- MODO DEMONSTRAÇÃO (navegador) ---------- */
  const Local = {
    modo: 'local',
    async iniciar() {},
    async lerConfig() {
      try { return juntar(JSON.parse(localStorage.getItem('gs_config'))); } catch (e) { return juntar(null); }
    },
    async salvarConfig(c) { localStorage.setItem('gs_config', JSON.stringify(c)); },
    async restaurarPadrao() { localStorage.removeItem('gs_config'); },
    // leads: no modo demonstração ficam só no navegador onde a simulação foi feita
    _leads() { try { return JSON.parse(localStorage.getItem('gs_leads')) || []; } catch (e) { return []; } },
    async salvarLead(l) {
      const lista = this._leads();
      lista.push({ ...l, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7) });
      localStorage.setItem('gs_leads', JSON.stringify(lista));
    },
    async listarLeads() { return this._leads().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)); },
    async apagarLead(id) { localStorage.setItem('gs_leads', JSON.stringify(this._leads().filter(l => l.id !== id))); },
    async entrar(_email, senha) {
      const c = await this.lerConfig();
      if (String(senha) !== String(c.pin)) throw new Error('Senha incorreta.');
      try { sessionStorage.setItem('gs_dono', '1'); } catch (e) {}
    },
    logado() { try { return sessionStorage.getItem('gs_dono') === '1'; } catch (e) { return false; } },
    async sair() { try { sessionStorage.removeItem('gs_dono'); } catch (e) {} }
  };

  /* ---------- MODO ONLINE (Firebase Firestore) ---------- */
  const Fire = {
    modo: 'firebase',
    async iniciar() {
      firebase.initializeApp(CFG.firebase);
      this.db = firebase.firestore();
      this.auth = firebase.auth();
      await new Promise(r => { const u = this.auth.onAuthStateChanged(() => { u(); r(); }); });
    },
    async lerConfig() {
      const s = await this.db.doc('config/site').get();
      const c = juntar(s.exists ? s.data() : null);
      delete c.pin;
      return c;
    },
    async salvarConfig(c) { const d = clone(c); delete d.pin; await this.db.doc('config/site').set(d); },
    async restaurarPadrao() { await this.db.doc('config/site').delete(); },
    // leads: o visitante só cria; ler e apagar é só para o dono (ver firestore.rules)
    async salvarLead(l) { await this.db.collection('leads').add(l); },
    async listarLeads() {
      const s = await this.db.collection('leads').orderBy('criadoEm', 'desc').get();
      return s.docs.map(d => ({ ...d.data(), id: d.id }));
    },
    async apagarLead(id) { await this.db.collection('leads').doc(id).delete(); },
    async entrar(email, senha) { await this.auth.signInWithEmailAndPassword(email, senha); },
    logado() { return !!this.auth.currentUser; },
    async sair() { await this.auth.signOut(); }
  };

  /* ---------- MODO ONLINE (Supabase) ---------- */
  // tabelas e regras de segurança em supabase.sql: o visitante lê a config e só cria leads;
  // ler, apagar e editar é só para o dono logado
  const Supa = {
    modo: 'supabase',
    async iniciar() {
      this.sb = window.supabase.createClient(CFG.supabase.url, CFG.supabase.chave);
      const { data } = await this.sb.auth.getSession();
      this.sessao = data.session;
    },
    _ok(r) { if (r.error) throw r.error; return r.data; },
    async lerConfig() {
      const d = this._ok(await this.sb.from('config').select('dados').eq('id', 1).maybeSingle());
      const c = juntar(d ? d.dados : null);
      delete c.pin;
      return c;
    },
    async salvarConfig(c) {
      const dados = clone(c); delete dados.pin;
      this._ok(await this.sb.from('config').upsert({ id: 1, dados, atualizado_em: new Date().toISOString() }));
    },
    async restaurarPadrao() { this._ok(await this.sb.from('config').delete().eq('id', 1)); },
    // a data do lead é do servidor; o site manda só os campos do formulário
    async salvarLead(l) {
      const { nome, telefone, estado, cidade, origem, resumo } = l;
      this._ok(await this.sb.from('leads').insert({ nome, telefone, estado, cidade, origem, resumo }));
    },
    async listarLeads() {
      const linhas = this._ok(await this.sb.from('leads').select('*').order('criado_em', { ascending: false }));
      return linhas.map(({ criado_em, ...l }) => ({ ...l, criadoEm: criado_em }));
    },
    async apagarLead(id) { this._ok(await this.sb.from('leads').delete().eq('id', id)); },
    async entrar(email, senha) {
      this.sessao = this._ok(await this.sb.auth.signInWithPassword({ email, password: senha })).session;
    },
    logado() { return !!this.sessao; },
    async sair() { await this.sb.auth.signOut(); this.sessao = null; }
  };

  window.Store = CFG.supabase ? Supa : CFG.firebase ? Fire : Local;
  window.GS_juntar = juntar;
})();
