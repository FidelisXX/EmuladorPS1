// Servidor local mínimo para o EmulatorJS (não funciona abrindo o HTML via file://).
// Uso: node server.js  ->  http://localhost:8080
//      node server.js --rede  ->  também acessível por outros aparelhos da rede local (celular)
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PORT = process.env.PORT || 8080;
const REDE = process.argv.includes("--rede");
const HOST = REDE ? "0.0.0.0" : "127.0.0.1";
// No modo rede, enviar/excluir jogos exige este PIN (mostrado só na janela do servidor)
const PIN = REDE ? String(require("crypto").randomInt(100000, 1000000)) : null;
const ROOT = __dirname;
const ROM_EXT = [".chd", ".pbp", ".iso", ".bin", ".img", ".zip", ".7z"];
const BIOS_EXT = [".bin"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function listar(pasta, extensoes) {
  try {
    return fs
      .readdirSync(path.join(ROOT, pasta))
      .filter((f) => extensoes.includes(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function enviarJson(res, dados) {
  res.writeHead(200, { "Content-Type": MIME[".json"] });
  res.end(JSON.stringify(dados));
}

function enviarArquivo(req, res, arquivo) {
  fs.stat(arquivo, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      return res.end("Não encontrado");
    }
    const tipo = MIME[path.extname(arquivo).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      const inicio = range[1] ? parseInt(range[1], 10) : 0;
      const fim = range[2] ? parseInt(range[2], 10) : stat.size - 1;
      res.writeHead(206, {
        "Content-Type": tipo,
        "Content-Length": fim - inicio + 1,
        "Content-Range": `bytes ${inicio}-${fim}/${stat.size}`,
        "Accept-Ranges": "bytes",
      });
      return fs.createReadStream(arquivo, { start: inicio, end: fim }).pipe(res);
    }
    res.writeHead(200, { "Content-Type": tipo, "Content-Length": stat.size, "Accept-Ranges": "bytes" });
    fs.createReadStream(arquivo).pipe(res);
  });
}

// Aceita só um nome de arquivo simples, com extensão de jogo
function nomeValido(nome) {
  return (
    nome.length > 0 &&
    nome.length <= 200 &&
    !/[\\/:*?"<>|\x00-\x1f]/.test(nome) &&
    !nome.startsWith(".") &&
    ROM_EXT.includes(path.extname(nome).toLowerCase())
  );
}

function mesmaOrigem(req) {
  const origem = req.headers.origin;
  if (!origem) return true; // ferramentas fora do navegador não enviam Origin
  try {
    return new URL(origem).host === req.headers.host;
  } catch {
    return false;
  }
}

function responder(res, status, msg) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(msg);
}

function enviarRom(req, res, nome) {
  const destino = path.join(ROOT, "roms", nome);
  if (fs.existsSync(destino)) return responder(res, 409, "Já existe um jogo com esse nome.");

  const temp = destino + ".part";
  const saida = fs.createWriteStream(temp);
  let ok = false;
  const limpar = () => { if (!ok) fs.rm(temp, { force: true }, () => {}); };

  req.on("aborted", () => { saida.destroy(); limpar(); });
  saida.on("error", (err) => { req.destroy(); limpar(); responder(res, 500, "Erro ao salvar: " + err.message); });
  saida.on("finish", () => {
    fs.rename(temp, destino, (err) => {
      if (err) { limpar(); return responder(res, 500, "Erro ao salvar: " + err.message); }
      ok = true;
      console.log(`Jogo enviado: ${nome}`);
      responder(res, 201, "Enviado.");
    });
  });
  req.pipe(saida);
}

function excluirRom(res, nome) {
  const alvo = path.join(ROOT, "roms", nome);
  fs.rm(alvo, (err) => {
    if (err) return responder(res, err.code === "ENOENT" ? 404 : 500, "Não foi possível excluir.");
    console.log(`Jogo excluído: ${nome}`);
    responder(res, 200, "Excluído.");
  });
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);

    // Enviar (PUT) ou excluir (DELETE) um jogo: /api/roms/<nome>
    if (url.startsWith("/api/roms/") && (req.method === "PUT" || req.method === "DELETE")) {
      // Bloqueia pedidos vindos de outros sites abertos no navegador
      if (!mesmaOrigem(req)) return responder(res, 403, "Origem não permitida.");
      if (PIN && req.headers["x-pin"] !== PIN) return responder(res, 401, "PIN incorreto.");

      const nome = url.slice("/api/roms/".length);
      if (!nomeValido(nome)) return responder(res, 400, "Nome ou formato de arquivo não aceito.");
      return req.method === "PUT" ? enviarRom(req, res, nome) : excluirRom(res, nome);
    }

    if (url === "/api/info") return enviarJson(res, { pin: !!PIN, formatos: ROM_EXT });
    if (url === "/api/roms") return enviarJson(res, listar("roms", ROM_EXT));
    if (url === "/api/bios") return enviarJson(res, listar("bios", BIOS_EXT));

    // Impede acesso fora da pasta do projeto
    const arquivo = path.normalize(path.join(ROOT, url === "/" ? "index.html" : url));
    if (!arquivo.startsWith(ROOT + path.sep)) {
      res.writeHead(403);
      return res.end("Proibido");
    }
    enviarArquivo(req, res, arquivo);
  })
  .listen(PORT, HOST, () => {
    console.log(`PS1 Web rodando em http://localhost:${PORT}`);
    if (REDE) {
      // Só IPs de rede privada (Wi-Fi/cabo de casa)
      const ips = Object.values(os.networkInterfaces())
        .flat()
        .filter((i) => i.family === "IPv4" && !i.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(i.address))
        .map((i) => i.address);
      console.log("\nNo celular (mesma rede Wi-Fi), abra:");
      for (const ip of ips) console.log(`  http://${ip}:${PORT}`);
      if (!ips.length) console.log("  (nenhum IP de rede local encontrado)");
      console.log(`\nPIN para enviar/excluir jogos: ${PIN}\n`);
    }
    // Abre o navegador só depois que o servidor está ouvindo
    if (process.argv.includes("--abrir") && process.platform === "win32") {
      require("child_process").exec(`start "" http://localhost:${PORT}`);
    }
  });
