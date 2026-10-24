// Saves na nuvem (Supabase): memory card e save state de cada jogo, por usuário.
// A chave anon é pública por natureza; quem protege os saves são as regras RLS do supabase.sql.
const Nuvem = (() => {
  const URL_SUPABASE = "https://namftbwwukfflumwdsxh.supabase.co";
  const CHAVE_ANON =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hbWZ0Ynd3dWtmZmx1bXdkc3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MDEyMDcsImV4cCI6MjEwODM3NzIwN30.E51bxf7cTFPtHE4O0KFJu-2w0rQy6fePDyIxR0YUWPs";
  const BUCKET = "saves";

  // Se o CDN do supabase-js não carregar, o site continua funcionando só com saves locais
  const cliente = window.supabase ? window.supabase.createClient(URL_SUPABASE, CHAVE_ANON) : null;

  async function usuario() {
    if (!cliente) return null;
    const { data } = await cliente.auth.getSession();
    return (data.session && data.session.user) || null;
  }

  // Nome do jogo -> pasta segura para o Storage (sem acentos e caracteres especiais).
  // semDisco: "Jogo CD1" e "Jogo CD2" viram a mesma pasta (memory card é um só para todos os discos).
  function pastaDoJogo(jogo, semDisco) {
    let nome = jogo.replace(/\.[^.]+$/, "");
    if (semDisco) nome = nome.replace(/[\s_-]*[([]?(?<![A-Za-z])(cd|disc|disco|disk)[\s_-]*\d+(?!\d)[)\]]?/gi, "");
    return nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "_");
  }

  async function caminho(jogo, arquivo) {
    const u = await usuario();
    // Save states dependem do disco; o memory card é compartilhado entre os discos
    const semDisco = !arquivo.endsWith(".state");
    return u && `${u.id}/${pastaDoJogo(jogo, semDisco)}/${arquivo}`;
  }

  return {
    disponivel: !!cliente,
    usuario,
    aoMudarLogin: (fn) => cliente && cliente.auth.onAuthStateChange((_evento, sessao) => fn(sessao && sessao.user)),

    // Login sem senha: o Supabase envia um link por e-mail que volta para esta página
    entrar: (email) =>
      cliente.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }),
    sair: () => cliente.auth.signOut(),

    async enviar(jogo, arquivo, dados) {
      const c = await caminho(jogo, arquivo);
      if (!c) throw new Error("Não está logado.");
      const { error } = await cliente.storage
        .from(BUCKET)
        .upload(c, new Blob([dados]), { upsert: true, cacheControl: "0", contentType: "application/octet-stream" });
      if (error) throw error;
    },

    // Retorna os bytes do arquivo ou null se ainda não existir na nuvem
    async baixar(jogo, arquivo) {
      const c = await caminho(jogo, arquivo);
      if (!c) return null;
      const { data, error } = await cliente.storage.from(BUCKET).download(c);
      if (error) {
        if (error.status === 400 || error.status === 404 || /not.?found/i.test(error.message || "")) return null;
        throw error;
      }
      return new Uint8Array(await data.arrayBuffer());
    },
  };
})();
