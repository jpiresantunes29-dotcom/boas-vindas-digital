# WhatsApp com Evolution API — guia de instalação (gratuito)

Este guia coloca no ar o servidor de WhatsApp usado pelo cadastro de visitantes, sem custo e sem cartão de crédito:

| Peça | Serviço | Para quê |
|---|---|---|
| Banco de dados | [Neon](https://neon.tech) (Postgres grátis) | Guardar a sessão do WhatsApp |
| Servidor | [Render](https://render.com) (plano Free) | Rodar a Evolution API, com HTTPS |
| Despertador | [cron-job.org](https://cron-job.org) | Não deixar o servidor da Render dormir |
| Site | Vercel (já existente) | Envia as mensagens pela Evolution API |

> **Use um número de WhatsApp só da igreja**, não um número pessoal. A Evolution API usa o WhatsApp Web por baixo (não é a API oficial da Meta), e o número corre algum risco de bloqueio se enviar muitas mensagens. O volume deste projeto é baixo e o visitante só recebe mensagem se marcar a opção (opt-in), o que reduz bastante esse risco.

---

## Etapa 1 — Banco de dados no Neon

1. Entre em [neon.tech](https://neon.tech) → **Sign up** (Google ou GitHub, sem cartão).
2. **New Project** → nome `evolution-api` → região **AWS South America (São Paulo)**.
3. Na tela do projeto, clique em **Connect** e copie a **connection string**.

### Corrija a string antes de usar

O Neon mostra por padrão a conexão **com pooler**. A Evolution API cria as próprias tabelas ao iniciar (migrations do Prisma), e isso costuma falhar através do pooler. Use a **conexão direta**:

1. **Apague `-pooler`** do endereço do servidor.
2. **Apague `&channel_binding=require`** do final.

```text
Antes:  postgresql://neondb_owner:SENHA@ep-xxxx-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
Depois: postgresql://neondb_owner:SENHA@ep-xxxx.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

(No painel do Neon também dá para desligar a chave **Connection pooling** na janela **Connect**, que já mostra a string direta.)

> A string contém a senha do banco. Não cole em chats, e-mails ou no código — só no painel da Render.

---

## Etapa 2 — Servidor na Render (pelo Blueprint deste repositório)

O arquivo [`render.yaml`](../render.yaml) na raiz do repositório já traz a imagem correta e todas as variáveis. Você só preenche os dois valores secretos.

1. Entre em [render.com](https://render.com) com o **GitHub** (a conta que tem acesso a este repositório).
2. **New +** → **Blueprint**.
3. Escolha o repositório **boas-vindas-digital** (se não aparecer, clique em *Configure account* e dê acesso a ele).
4. A Render lê o `render.yaml` e mostra o serviço **evolution-aliancacrista**. Ela pede dois valores:
   - **`AUTHENTICATION_API_KEY`**: a chave da Evolution API. Pode ser uma que você já tenha, ou gere uma nova (ex.: no terminal, `openssl rand -hex 32`). Guarde — ela vai também na Vercel como `EVOLUTION_API_KEY`.
   - **`DATABASE_CONNECTION_URI`**: a string **corrigida** do Neon (Etapa 1).
5. **Apply** / **Deploy Blueprint**. O primeiro deploy leva alguns minutos.
6. Quando terminar, abra o endereço do serviço (ex.: `https://evolution-aliancacrista.onrender.com`). Deve aparecer uma mensagem de boas-vindas da Evolution API em JSON.

> **O endereço ficou diferente?** Se a Render acrescentar um sufixo ao nome (ex.: `evolution-aliancacrista-ab12.onrender.com`), vá no serviço → **Environment** e corrija `SERVER_URL` para o endereço real. Use esse mesmo endereço no resto do guia.

<details>
<summary>Alternativa: criar o serviço manualmente, sem Blueprint</summary>

**New +** → **Web Service** → **Existing Image** → Image URL `docker.io/evoapicloud/evolution-api:latest` → Region **Virginia** → Instance Type **Free**. Em **Environment Variables**, cadastre as mesmas chaves e valores que estão no [`render.yaml`](../render.yaml) (as duas com `sync: false` recebem os valores secretos acima). Health Check Path: `/`.

</details>

### Por que estas configurações

- **Imagem `evoapicloud/evolution-api`**: desde a v2.3.0 a imagem oficial é publicada nesse endereço. A antiga (`atendai/evolution-api`) parou na v2.2.3 e há relatos de falha ao criar o container.
- **`DATABASE_SAVE_DATA_INSTANCE=true`**: o plano gratuito da Render apaga o disco a cada reinício ou desligamento. Com essa opção, a sessão do WhatsApp fica no Neon e você não precisa escanear o QR Code de novo.
- **`DATABASE_SAVE_DATA_*=false`** (mensagens, contatos, conversas…): a Evolution não copia as conversas do WhatsApp da igreja para o banco — melhor para a privacidade (LGPD) e para o limite do Neon gratuito.
- **`CACHE_REDIS_ENABLED=false` + `CACHE_LOCAL_ENABLED=true`**: dispensa um servidor Redis; o cache em memória basta para este volume.
- **`PORT=8080`**: diz à Render em qual porta a Evolution atende.

---

## Etapa 3 — Não deixar o servidor dormir (cron-job.org)

A Render desliga serviços gratuitos após **15 minutos sem receber requisições**, e o primeiro acesso depois disso demora de 30 a 60 segundos. Para manter o servidor acordado:

1. Entre em [cron-job.org](https://cron-job.org) → crie uma conta gratuita.
2. **Create cronjob**:
   - **URL**: o endereço do serviço na Render, terminado em `/` (ex.: `https://evolution-aliancacrista.onrender.com/`)
   - **Execution schedule**: a cada **10 minutos**
3. Salve. Em **History** você confere se os pings estão voltando com status 200.

> Isso consome as 750 horas gratuitas mensais da Render, que bastam para um serviço ligado o mês inteiro. A Render não gosta desse uso no plano gratuito; se um dia ela reclamar ou o serviço ficar instável, o plano **Starter** (US$ 7/mês) remove o desligamento automático.

---

## Etapa 4 — Conectar o WhatsApp (QR Code)

1. Abra `https://SEU-SERVICO.onrender.com/manager` (o painel da Evolution API).
2. Faça login com:
   - **Server URL**: `https://SEU-SERVICO.onrender.com`
   - **API Key Global**: o valor de `AUTHENTICATION_API_KEY`
3. **Instance** → **+** (criar instância):
   - **Name**: `igreja` (anote: vai em `EVOLUTION_INSTANCE` na Vercel — precisa ser idêntico)
   - **Channel / Integration**: **Baileys**
4. Abra a instância → **Get QR Code**.
5. No celular com o WhatsApp **da igreja**: **Configurações** → **Aparelhos conectados** → **Conectar um aparelho** → escaneie o QR Code.
6. A instância deve mudar para **open / connected**. No WhatsApp, o aparelho aparece como "Cadastro Visitantes".

---

## Etapa 5 — Variáveis na Vercel e teste

Na Vercel: projeto → **Settings** → **Environment Variables** → **Add** (ambiente **Production**):

| Key | Value | Tipo |
|---|---|---|
| `EVOLUTION_API_URL` | `https://SEU-SERVICO.onrender.com` (sem `/` no final) | Config |
| `EVOLUTION_API_KEY` | o mesmo valor de `AUTHENTICATION_API_KEY` | Secret |
| `EVOLUTION_INSTANCE` | `igreja` (o nome exato da instância) | Config |
| `NOTIFICACAO_WHATSAPP_NUMERO` | WhatsApp do responsável, só dígitos, com DDI e DDD (ex.: `5541999999999`) | Config |

Depois: **Deployments** → ⋯ no mais recente → **Redeploy**.

**Teste:** recarregue o formulário, preencha com o seu celular, marque **"Quero receber a confirmação do cadastro no WhatsApp"** e o consentimento, e envie. Devem chegar duas mensagens: a confirmação no seu celular e o aviso de novo visitante no número do responsável.

---

## Problemas comuns

Os erros do envio aparecem em **Vercel → Logs**, nas linhas que começam com **`[WhatsApp]`**. Os do servidor, em **Render → seu serviço → Logs**.

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Deploy falha na Render em segundos, sem log | Imagem antiga `atendai/...` | Confirme que a imagem é `docker.io/evoapicloud/evolution-api:latest` |
| Log da Render com erro de banco / migration (`P1001`, `P1017`, "prepared statement") | String do Neon com pooler | Use a string direta (Etapa 1) em `DATABASE_CONNECTION_URI` |
| Render diz que nenhuma porta foi detectada | Variável de porta ausente | Confira `PORT=8080` e `SERVER_PORT=8080` |
| `[WhatsApp] Variáveis Evolution API não configuradas` | Faltou variável na Vercel ou o Redeploy | Confira as 4 variáveis e faça o Redeploy |
| `[WhatsApp] Erro 401` | Chave diferente nos dois lados | `EVOLUTION_API_KEY` (Vercel) tem de ser igual a `AUTHENTICATION_API_KEY` (Render) |
| `[WhatsApp] Erro 404` | Nome da instância errado | `EVOLUTION_INSTANCE` igual ao nome criado no `/manager` (maiúsculas contam) |
| `[WhatsApp] Erro 400` mencionando `exists: false` | O número não tem WhatsApp | Confira o celular informado / `NOTIFICACAO_WHATSAPP_NUMERO` |
| `[WhatsApp] ... tempo esgotado` | Servidor da Render estava dormindo | Confira o cron-job.org (Etapa 3) |
| Instância aparece como `close` / desconectada | Sessão perdida ou WhatsApp desconectou o aparelho | Gere um novo QR Code no `/manager` e escaneie de novo; confira `DATABASE_SAVE_DATA_INSTANCE=true` |
