# Boas-Vindas Digital — Aliança Cristã Curitiba

Cadastro digital de visitantes por QR Code, substituindo a folha de papel que circulava na prancheta durante os cultos.

## 1. O que é este projeto

Um formulário web, otimizado para celular, que o visitante preenche depois de escanear um QR Code exibido no telão da igreja. Os dados caem direto em um banco de dados e a equipe responsável pelo primeiro contato é avisada por e-mail (e, se configurado, por WhatsApp) assim que o cadastro é concluído.

## 2. Problema que resolve

O processo antigo era todo manual: folha impressa → preenchimento à mão → entrega a um obreiro → transcrição para alguma planilha (quando acontecia). Isso gerava letra ilegível, folhas perdidas, demora entre a visita e o primeiro contato, e nenhuma forma confiável de saber se um visitante já tinha sido contatado.

## 3. Objetivo

Fechar o ciclo entre "a pessoa visitou" e "alguém da igreja falou com ela", com o mínimo de atrito possível para quem está preenchendo — sentado no culto, com pouco tempo e, às vezes, pouca familiaridade com tecnologia.

## 4. Principais funcionalidades

- Página de boas-vindas com a identidade visual da igreja (logo, cores, versículo do tema anual).
- Formulário mobile-first com os 13 campos da folha física original, mais e-mail (novo, opcional), pedido de oração (opcional) e **CEP com máscara que autocompleta o endereço via ViaCEP** (novo).
- **Consentimento LGPD**: caixa de seleção obrigatória de concordância com o aviso de privacidade, registrada com data e hora no banco.
- **Página `/privacidade`** com o aviso de privacidade, acessível pelo formulário, pelo rodapé e pela tela de sucesso.
- Validação em duas camadas: no navegador (feedback imediato) e no servidor (nunca confia só no cliente).
- Proteção contra spam (honeypot) e contra picos de bots (limite de taxa por IP), sem captcha visível.
- Botão de envio desabilitado enquanto o cadastro está sendo enviado, evitando o toque duplo acidental.
- Reconhecimento silencioso de visitante recorrente (celular já cadastrado antes).
- Notificação automática por e-mail aos responsáveis configurados a cada novo cadastro.
- Notificação por WhatsApp (Evolution API, opcional): ficha completa do visitante para o responsável e confirmação ao visitante — esta **só se ele marcar** que quer receber (opt-in).
- Tela de sucesso que já mostra cultos, contato e Instagram — substituindo o QR "Saiba Mais" do cartão físico.

## 5. Tecnologias utilizadas

| Camada | Tecnologia | Por quê |
|---|---|---|
| Framework | Next.js 16 (App Router) | Frontend e backend num único projeto — sem servidor separado para manter no ar. |
| Linguagem | TypeScript | Tipagem de ponta a ponta, do formulário ao banco. |
| Estilo | Tailwind CSS v4 | Sem biblioteca de componentes pesada; o formulário é simples o bastante para não precisar. |
| Validação | Zod | Um único schema compartilhado entre cliente e servidor — nunca divergem. |
| Formulário | React Hook Form | Estados de erro/loading sem re-renderizações desnecessárias em um celular modesto. |
| Banco de dados | Supabase (Postgres) | Gerenciado, gratuito nesta escala, com Row Level Security nativo. |
| Notificação (e-mail) | Resend | E-mail transacional gratuito até 3.000/mês, sem processo de aprovação. |
| Notificação (WhatsApp) | Evolution API | API open source para WhatsApp, gratuita, sem custo por mensagem. |
| Deploy | Vercel | Deploy automático a cada push, HTTPS e CDN grátis. |
| Testes | Vitest + Testing Library | Padrão atual para projetos Vite/Next, rápido em modo watch. |
| CI | GitHub Actions | Lint, tipos, testes e build a cada push e Pull Request. |

## 6. Arquitetura

```
QR Code → Página de boas-vindas (Next.js, estática)
        → Formulário (client component, valida com Zod; CEP consultado na ViaCEP pelo navegador)
        → Server Action (app/actions/visitantes.ts)
              ├─ rate limit + honeypot
              ├─ revalida com o mesmo schema Zod (inclui o consentimento LGPD)
              ├─ grava no Supabase (service role — nunca exposta ao navegador)
              └─ after(): notificações best-effort, depois da resposta
                    ├─ e-mail aos responsáveis (Resend)
                    └─ WhatsApp ao responsável e, se aceitou, ao visitante (Evolution API)
        → Tela de sucesso (cultos, contato, Instagram)
```

As notificações rodam dentro de [`after()`](https://nextjs.org/docs/app/api-reference/functions/after) do Next.js: o visitante recebe a resposta na hora, sem esperar e-mail e WhatsApp, e a Vercel mantém a função serverless viva até os envios terminarem. (Antes, uma Promise "solta" podia ser interrompida quando a função era congelada, e a notificação se perdia.) Falha em uma notificação nunca desfaz nem sinaliza erro no cadastro, que já foi gravado.

Não há autenticação de visitante — o cadastro é 100% anônimo, sem conta nem senha. O acesso aos dados pela equipe acontece pelo próprio painel do Supabase, restrito às contas autorizadas.

## 7. Estrutura do projeto

```
app/
  actions/visitantes.ts     Server Action — único ponto que fala com o Supabase
  page.tsx                  Rota "/"
  privacidade/page.tsx      Rota "/privacidade" — aviso de privacidade (LGPD)
  layout.tsx, globals.css   Layout raiz, metadados de SEO e JSON-LD
  sitemap.ts, robots.ts, manifest.ts
components/
  formulario/FormularioVisitante.tsx
  ui/                       Campo, OpcaoToggle, Botao — peças reutilizáveis
  PaginaVisitante.tsx       Alterna entre formulário e tela de sucesso
  TelaSucesso.tsx
lib/
  config/igreja.ts                Dados da igreja (endereço, telefones, cultos, Instagram)
  validacao/visitanteSchema.ts    Schema Zod único (cliente + servidor)
  supabase/client.ts              Cliente admin (server-only)
  notificacao/enviarEmail.ts      Envio via Resend (best-effort)
  notificacao/enviarWhatsApp.ts   Envio via Evolution API (best-effort)
  cep/useBuscaCEP.ts              Hook que busca o endereço na ViaCEP
  seo/siteUrl.ts                  URL pública do site (metadados, sitemap, robots)
  seguranca/honeypot.ts, rateLimit.ts
migrations/
  0001_criar_visitantes.sql            Schema da tabela `visitantes`
  0002_adicionar_numero_endereco.sql   Número, complemento e tipo de moradia
  0003_consentimento_e_cep.sql         CEP, opt-in de WhatsApp e consentimento LGPD
docs/whatsapp-evolution.md           Guia de instalação do WhatsApp (Neon + Render + cron-job.org)
render.yaml                          Blueprint da Render para o servidor da Evolution API
.github/workflows/ci.yml          CI: lint, tipos, testes e build
next.config.ts                    Headers de segurança (CSP, HSTS etc.)
docs/original/                    Folha física original (.docx), para referência histórica
tests/                            Vitest + Testing Library
```

## 8. Como instalar

Pré-requisitos: **Node.js 22+** (a versão está fixada em `.nvmrc` — com nvm, basta `nvm use`) e uma conta gratuita no [Supabase](https://supabase.com) e na [Resend](https://resend.com).

```bash
npm install
```

## 9. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

| Variável | Obrigatória? | Onde encontrar |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Não | URL pública do site, usada em SEO (Open Graph, canonical, sitemap). Em branco, usa o domínio de produção `*.vercel.app` ou `localhost`. Defina assim que o domínio final existir. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Sim** | Painel do Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sim** | Painel do Supabase → Project Settings → API (chave **secreta** — nunca commitar) |
| `RESEND_API_KEY` | Para e-mail | resend.com/api-keys |
| `RESEND_EMAIL_REMETENTE` | Não | Use `onboarding@resend.dev` até verificar um domínio próprio no Resend |
| `NOTIFICACAO_EMAIL_PRINCIPAL` | Para e-mail | E-mail do responsável pelo primeiro contato |
| `NOTIFICACAO_EMAIL_ADMIN` | Não | E-mail de quem administra o projeto (também recebe o aviso) |
| `EVOLUTION_API_URL` | Para WhatsApp | URL base da sua instalação da Evolution API (ex: `https://evolution.suaigreja.com.br`) |
| `EVOLUTION_API_KEY` | Para WhatsApp | Chave da Evolution API (enviada no header `apikey`) |
| `EVOLUTION_INSTANCE` | Para WhatsApp | Nome da instância (o WhatsApp conectado) criada na Evolution API |
| `NOTIFICACAO_WHATSAPP_NUMERO` | Para WhatsApp | WhatsApp do responsável que recebe o aviso — só dígitos, **com DDI e DDD** (ex: `5541999999999`) |

Sem as variáveis do Resend, o e-mail é pulado; sem as da Evolution, o WhatsApp é pulado. Em ambos os casos o cadastro continua funcionando e o motivo fica registrado no log.

`.env.local` nunca é commitado (já está no `.gitignore`).

## 10. Configurar o Supabase

1. Crie um projeto novo no [painel do Supabase](https://supabase.com/dashboard).
2. Abra o **SQL Editor** e rode, **nesta ordem**, o conteúdo de cada migration:
   1. [`migrations/0001_criar_visitantes.sql`](migrations/0001_criar_visitantes.sql) — cria a tabela `visitantes`;
   2. [`migrations/0002_adicionar_numero_endereco.sql`](migrations/0002_adicionar_numero_endereco.sql) — número, complemento e tipo de moradia;
   3. [`migrations/0003_consentimento_e_cep.sql`](migrations/0003_consentimento_e_cep.sql) — CEP, opt-in de WhatsApp e data do consentimento LGPD.

   As três são obrigatórias: a Server Action grava todas essas colunas, e sem alguma delas o insert falha e o visitante vê a mensagem de erro. Já tem um banco rodando? Rode só as que faltam — todas usam `if not exists` e podem ser repetidas sem estrago.
3. Confirme em **Table Editor** que a tabela `visitantes` foi criada com Row Level Security **ativado** e nenhuma policy de `anon` — toda escrita deve passar pela Server Action, nunca diretamente do navegador.
4. Copie a URL do projeto e a `service_role key` para o `.env.local`.

## 11. Dados da igreja

Telefones, WhatsApp, endereço, horários de culto, Instagram e versículo do tema ficam num único arquivo: [`lib/config/igreja.ts`](lib/config/igreja.ts). Eles alimentam a tela de sucesso, os metadados de SEO (JSON-LD), o aviso de privacidade e as mensagens de WhatsApp. Mudou o horário de um culto ou o número de contato? Altere só ali.

## 12. Campo CEP com autocomplete

O campo CEP tem máscara (`00000-000`). Quando o visitante termina de digitar os 8 dígitos e sai do campo, o formulário busca automaticamente o endereço via [ViaCEP](https://viacep.com.br/), uma API pública gratuita:

- **Logradouro** (rua, avenida, etc)
- **Bairro**
- **Cidade**

Os campos são preenchidos automaticamente, o foco vai direto para o campo **Número** e o visitante pode editar o que quiser. Se o CEP não existir ou a rede falhar, uma mensagem de erro é exibida e o visitante continua podendo preencher manualmente. O campo CEP é opcional e é gravado só com os 8 dígitos.

Não há dependência externa — usa apenas `fetch` do navegador. A Content Security Policy libera conexões apenas para o próprio site e para `viacep.com.br`.

## 13. Notificações

Todas as notificações são best-effort e rodam em `after()` (ver [Arquitetura](#6-arquitetura)).

### 13.1 E-mail (Resend)

A cada cadastro, `NOTIFICACAO_EMAIL_PRINCIPAL` (e `NOTIFICACAO_EMAIL_ADMIN`, se definido) recebe um e-mail com os dados do visitante. O SDK do Resend não lança exceção quando o envio é recusado — ele devolve um `error` —, então esse retorno é verificado e registrado no log.

### 13.2 WhatsApp (Evolution API)

Após o cadastro bem-sucedido, o sistema envia até **duas** mensagens de WhatsApp:

1. **Para o responsável** (`NOTIFICACAO_WHATSAPP_NUMERO`): a ficha completa do novo visitante — os mesmos dados do e-mail (contato, dados pessoais, endereço, como conheceu, o que gostaria, pedido de oração, recorrência) — e um link `wa.me` para abrir a conversa com ele. E-mail e WhatsApp montam a ficha a partir do mesmo módulo (`lib/notificacao/fichaVisitante.ts`), então nunca divergem.
2. **Para o visitante**: confirmação de que o cadastro foi recebido — **somente se ele marcou** no formulário que aceita receber mensagem pelo WhatsApp (opt-in, gravado em `aceita_whatsapp`).

Detalhes que já estão tratados no código:

- Autenticação pelo header `apikey`, como a Evolution API exige.
- Datas e horas das mensagens no fuso `America/Sao_Paulo` (a Vercel roda em UTC).
- O celular do visitante ganha o DDI 55 corretamente, inclusive quando o DDD também é 55 (região de Santa Maria/RS).

Usa a [Evolution API](https://doc.evolution-api.com/), uma solução open source gratuita. **Guia completo, passo a passo e sem custo (Neon + Render + cron-job.org): [`docs/whatsapp-evolution.md`](docs/whatsapp-evolution.md).** O servidor sobe na Render a partir do Blueprint [`render.yaml`](render.yaml), que já traz a imagem correta (`evoapicloud/evolution-api`) e todas as variáveis — só a chave e a string do banco são pedidas na criação.

Resumo:

1. Crie o banco no Neon e use a string de conexão **direta** (sem `-pooler`).
2. Suba a Evolution API na Render pelo Blueprint (`render.yaml`) e mantenha-a acordada com um ping a cada 10 minutos (cron-job.org).
3. Crie uma instância no painel `/manager` da Evolution e conecte o WhatsApp **da igreja** pelo QR Code.
4. Configure as variáveis de ambiente no `.env.local` (e na Vercel):
   ```
   EVOLUTION_API_URL=https://evolution.suaigreja.com.br
   EVOLUTION_API_KEY=sua-chave-api
   EVOLUTION_INSTANCE=nome-da-instancia
   NOTIFICACAO_WHATSAPP_NUMERO=5541999999999
   ```

Se as variáveis da Evolution não forem configuradas, o WhatsApp é pulado (com um aviso no log) — o cadastro e o e-mail funcionam normalmente.

## 14. Executar localmente

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Sem as variáveis do Supabase configuradas, a página carrega normalmente e o formulário mostra uma mensagem de erro amigável ao tentar enviar — o que já é o comportamento esperado para "servidor indisponível".

Outros comandos úteis:

```bash
npm run lint        # ESLint
npm run typecheck   # gera os tipos de rota do Next (next typegen) e roda o tsc
npm test            # Vitest (validação, honeypot, rate limit, formulário, CEP, Server Action, e-mail, WhatsApp)
npm run build       # build de produção (baixa as fontes do Google — precisa de internet)
```

### Integração contínua

A cada push na `main` e em todo Pull Request, o GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) instala as dependências com `npm ci` e roda `lint`, `typecheck`, testes e `build`, usando a versão do Node definida em `.nvmrc`. Antes de fazer merge, confira se a verificação passou.

## 15. Deploy na Vercel

1. Suba o repositório para o GitHub.
2. Importe o projeto em [vercel.com/new](https://vercel.com/new).
3. Configure as mesmas variáveis de ambiente do `.env.local` no painel da Vercel (Settings → Environment Variables).
4. Deploy automático a cada push em `main`; cada Pull Request ganha uma preview própria.

## 16. Gerar e configurar o QR Code

O QR deve apontar para um **domínio estável**, não para a URL temporária `*.vercel.app` — assim, se a hospedagem mudar no futuro, o material impresso não precisa ser trocado.

1. Na Vercel, adicione um domínio próprio (Settings → Domains) — recomendado um subdomínio como `visitantes.SEUDOMINIO.com.br`, apontado via CNAME, mantendo este projeto independente do site institucional da igreja.
2. Gere o QR Code apontando para esse domínio (qualquer gerador de QR gratuito serve — o conteúdo é só a URL).
3. Só substitua o QR exibido no telão depois de confirmar que o domínio final está no ar.

## 17. Segurança

- A `service_role key` do Supabase só existe como variável de ambiente no servidor — nunca no código-fonte, no repositório ou no bundle enviado ao navegador.
- A tabela `visitantes` tem Row Level Security ativado e nenhuma policy pública de leitura/escrita: toda operação passa pela Server Action.
- Validação dupla (cliente com Zod + servidor com o mesmo schema) — o frontend nunca é a única barreira.
- Honeypot (campo invisível) e limite de taxa por IP contêm bots sem exigir captcha do visitante real. O limite é de **30 envios por minuto por IP**: durante o culto, muitos visitantes usam o Wi-Fi da igreja e chegam ao servidor pelo mesmo IP, então um limite baixo (era 5) bloquearia famílias de verdade. A contagem é em memória, por instância serverless — suficiente para conter abusos nesta escala, não um limite global exato.
- O botão de envio fica desabilitado enquanto o cadastro está sendo enviado, o que evita o toque duplo acidental (não há deduplicação no servidor).
- Headers de segurança em todas as rotas ([`next.config.ts`](next.config.ts)):
  - **Content-Security-Policy**: scripts, estilos, imagens e fontes só do próprio domínio; conexões só para o próprio site e a ViaCEP; nada de `<object>`; formulários só para o próprio site; a página não pode ser embutida em iframe (`frame-ancestors 'none'`). `script-src` inclui `'unsafe-inline'` porque o Next.js injeta scripts inline e o JSON-LD é inline (a alternativa seria CSP com nonce, que obriga renderização dinâmica); `'unsafe-eval'` só em desenvolvimento.
  - **Strict-Transport-Security** (HTTPS obrigatório por 2 anos), **X-Content-Type-Options: nosniff**, **Referrer-Policy: strict-origin-when-cross-origin**, **X-Frame-Options: DENY** e **Permissions-Policy** desligando câmera, microfone e geolocalização.
  - O header `X-Powered-By` foi removido.
- O JSON-LD do layout escapa `<` ao ser serializado, impedindo que um valor feche a tag `<script>` antes da hora.
- O celular do visitante não aparece nos logs (Vercel): falhas de notificação são registradas sem o número.
- A busca de CEP é feita no navegador (cliente) contra a ViaCEP pública — nenhum dado além do próprio CEP é enviado para a API.

## 18. LGPD e privacidade

- **Finalidade**: os dados são coletados apenas para o primeiro contato pastoral e organização de visitas — nunca para fins comerciais ou compartilhamento com terceiros.
- **Consentimento explícito**: o formulário só é enviado com a caixa "li e concordo com o aviso de privacidade" marcada — o servidor também recusa o cadastro sem ela. A data e a hora do aceite são geradas pelo servidor e gravadas em `consentimento_privacidade_em` (cadastros anteriores ao aviso ficam com esse campo vazio).
- **Dados sensíveis**: o próprio cadastro numa igreja, a pergunta sobre outra igreja e o pedido de oração revelam convicção religiosa — e, às vezes, informações de saúde —, que a LGPD trata como dado pessoal sensível (art. 5º, II). Por isso o consentimento é específico e destacado (art. 11, I), o pedido de oração é opcional e o acesso aos dados é restrito.
- **WhatsApp só com opt-in**: o visitante recebe mensagem no WhatsApp apenas se marcar essa opção (gravada em `aceita_whatsapp`, desmarcada por padrão).
- **Transparência**: a página [`/privacidade`](app/privacidade/page.tsx) explica em linguagem simples quais dados são coletados e como são usados. Ela é acessível pelo formulário (caixa de consentimento e rodapé, abrindo em nova aba para não perder o que já foi digitado) e pela tela de sucesso. Revise o texto com a liderança sempre que a forma de uso dos dados mudar.
- **Minimização**: só nome e celular são estritamente necessários para o objetivo central; os demais campos existem porque a própria igreja confirmou seu uso (endereço para visitas, data de nascimento para acompanhamento pastoral).
- **Acesso**: restrito às contas autorizadas no Supabase — sem endpoint público de leitura.
- **Pedido de exclusão**: quando alguém pedir para ter os dados apagados:
  1. Confirme que o pedido vem da própria pessoa (por exemplo, pelo mesmo celular ou e-mail cadastrado).
  2. No Supabase, abra **Table Editor → visitantes**, filtre pelo celular e apague as linhas — pode haver mais de uma, se a pessoa visitou mais de uma vez. Pelo SQL Editor: `delete from public.visitantes where celular = '41999999999';` (o celular fica gravado só com dígitos, DDD + número).
  3. Apague também os e-mails e mensagens de WhatsApp de notificação daquele cadastro nas caixas dos responsáveis.
  4. Responda à pessoa confirmando a exclusão.

## 19. Roadmap (fora do escopo desta fase)

- Dashboard próprio de acompanhamento (fora do painel do Supabase).
- Autenticação da equipe com papéis (admin, obreiro, pastor).
- Múltiplos responsáveis com escala/rodízio de notificação.
- WhatsApp oficial (Meta/Twilio), se o volume justificar o custo e a complexidade.
- Estatísticas e histórico de visitantes ao longo do tempo.
- Exportação de dados.

## 20. Licença

Projeto de uso interno da Igreja Aliança Cristã Curitiba. Sem licença de código aberto definida.
