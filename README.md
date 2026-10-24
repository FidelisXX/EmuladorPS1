# EmuladorPS1

Emulador de PlayStation 1 no navegador usando [EmulatorJS](https://emulatorjs.org) (core `pcsx_rearmed` em WebAssembly).

## Online (Vercel ou qualquer hospedagem estática)

Abra o site e use "+ Enviar jogo". O jogo fica salvo **só no navegador** daquele aparelho (IndexedDB) e roda localmente; nada é enviado para o servidor. Nesse modo não há seleção de BIOS: o emulador usa a BIOS embutida (HLE).

## No PC (com servidor local)


1. Envie os jogos pelo botão "+ Enviar jogo" da página (ou copie-os para `roms/`). Formatos: `.chd`, `.pbp`, `.iso`, `.bin`, `.img`, `.zip`, `.7z`. O botão "Excluir" remove o jogo da pasta.
   - Jogos em `.cue` + `.bin` (ou com várias trilhas): compacte tudo num `.zip` ou converta para `.chd`.
2. (Opcional, recomendado) Coloque a BIOS em `bios/`, ex.: `scph5501.bin`. Sem ela o core usa BIOS HLE, que roda a maioria dos jogos.
3. Dê dois cliques em `iniciar.bat` (ou rode `node server.js`) e abra http://localhost:8080.

### Jogar no celular

1. PC e celular na mesma rede Wi-Fi.
2. Rode `iniciar-celular.bat` e permita o Node no Firewall apenas em "Redes privadas".
3. No celular, abra o endereço `http://192.168.x.x:8080` mostrado na janela. O controle na tela aparece automaticamente.
4. Para enviar ou excluir jogos pelo celular, use o PIN mostrado na janela do servidor (muda a cada inicialização).

## Saves na nuvem (Supabase)

Com login (link mágico por e-mail), o memory card e o save state de cada jogo são salvos no Supabase Storage e sincronizam entre aparelhos. As ROMs nunca vão para a nuvem. Sem login, tudo continua salvo só no navegador.

- O memory card é salvo automaticamente a cada 30 s e ao sair da aba; é o mesmo para todos os discos do jogo (CD1, CD2...).
- Os botões "Salvar/Carregar estado" do menu usam a nuvem (um estado por disco).

Configuração (uma vez, no painel do Supabase):

1. **SQL Editor**: rode o arquivo `supabase.sql` (cria o bucket privado `saves` e as regras RLS: cada usuário só acessa a própria pasta).
2. **Authentication → URL Configuration**: em *Site URL* coloque o endereço do site no Vercel e, em *Redirect URLs*, adicione `https://SEU-SITE.vercel.app/**` e `http://localhost:8080/**`.
3. **Authentication → Providers → Email**: deixe habilitado. O SMTP padrão do Supabase tem limite baixo de e-mails por hora; para mais usuários, configure um SMTP próprio.

A URL do projeto e a chave `anon` ficam em `nuvem.js`. A chave `anon` é pública por natureza; a proteção vem das regras RLS. Nunca coloque a chave `service_role` no site.

Saves e save states ficam no navegador (IndexedDB). Use os mesmos jogos e BIOS de sua propriedade.

Requer internet nos dois modos: os arquivos do EmulatorJS vêm de `cdn.emulatorjs.org`.
