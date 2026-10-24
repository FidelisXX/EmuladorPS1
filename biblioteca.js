// Biblioteca de jogos guardada no próprio navegador (IndexedDB).
// Usada quando não há server.js rodando (ex.: site no Vercel): os jogos ficam só neste aparelho.
const Biblioteca = (() => {
  let conexao;

  function abrir() {
    conexao = conexao || new Promise((ok, erro) => {
      const req = indexedDB.open("ps1web", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("jogos", { keyPath: "nome" });
      req.onsuccess = () => ok(req.result);
      req.onerror = () => erro(req.error);
    });
    return conexao;
  }

  async function transacao(modo, fn) {
    const db = await abrir();
    return new Promise((ok, erro) => {
      const t = db.transaction("jogos", modo);
      const req = fn(t.objectStore("jogos"));
      t.oncomplete = () => ok(req.result);
      t.onerror = t.onabort = () => erro(t.error);
    });
  }

  return {
    listar: () => transacao("readonly", (s) => s.getAllKeys()),
    obter: (nome) =>
      transacao("readonly", (s) => s.get(nome)).then((r) => r && new File([r.arquivo], r.nome)),
    salvar: (arquivo) => {
      // Pede ao navegador para não apagar os jogos quando faltar espaço
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
      return transacao("readwrite", (s) => s.add({ nome: arquivo.name, arquivo, tamanho: arquivo.size }));
    },
    excluir: (nome) => transacao("readwrite", (s) => s.delete(nome)),
  };
})();
