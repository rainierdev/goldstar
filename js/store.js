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
    Object.keys(p.bens).forEach(k => { bens[k] = { ...p.bens[k], ...((salvo.bens || {})[k] || {}) }; });
    return {
      ...p, ...salvo,
      contato: { ...p.contato, ...(salvo.contato || {}) },
      topo: { ...p.topo, ...(salvo.topo || {}) },
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
    async entrar(email, senha) { await this.auth.signInWithEmailAndPassword(email, senha); },
    logado() { return !!this.auth.currentUser; },
    async sair() { await this.auth.signOut(); }
  };

  window.Store = CFG.firebase ? Fire : Local;
  window.GS_juntar = juntar;
})();
