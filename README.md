# Boas-Vindas Digital — Aliança Cristã Curitiba

Cadastro digital de visitantes por QR Code, substituindo a folha de papel que circulava na prancheta durante os cultos.

## 1. O que é este projeto

Um formulário web, otimizado para celular, que o visitante preenche depois de escanear um QR Code exibido no telão da igreja. Os dados caem direto em um banco de dados e a equipe responsável pelo primeiro contato é avisada por e-mail assim que o cadastro é concluído.

## 2. Problema que resolve

O processo antigo era todo manual: folha impressa → preenchimento à mão → entrega a um obreiro → transcrição para alguma planilha (quando acontecia). Isso gerava letra ilegível, folhas perdidas, demora entre a visita e o primeiro contato, e nenhuma forma confiável de saber se um visitante já tinha sido contatado.

## 3. Objetivo

Fechar o ciclo entre "a pessoa visitou" e "alguém da igreja falou com ela", com o mínimo de atrito possível para quem está preenchendo — sentado no culto, com pouco tempo e, às vezes, pouca familiaridade com tecnologia.

## 4. Principais funcionalidades

- Página de boas-vindas com a identidade visual da igreja (logo, cores, versículo do tema anual).
- Formulário mobile-first com os 13 campos da folha física original, mais e-mail (novo, opcional), pedido de oração (opcional), e **CEP que autocompletar endereço via ViaCEP** (novo).
- Validação em duas camadas: no navegador (feedback imediato) e no servidor (nunca confia só no cliente).
- Proteção contra spam (honeypot) e contra picos de bots (limite de taxa por IP), sem captcha visível.
- Bloqueio de reenvio duplicado do mesmo formulário.
- Reconhecimento silencioso de visitante recorrente (celular já cadastrado antes).
- Notificação automática por e-mail aos dois responsáveis configurados a cada novo cadastro.
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
| Notificação | Resend | E-mail transacional gratuito até 3.000/mês, sem processo de aprovação. |
| Deploy | Vercel | Deploy automático a cada push, HTTPS e CDN grátis. |
| Testes | Vitest + Testing Library | Padrão atual para projetos Vite/Next, rápido em modo watch. |

## 6. Arquitetura

```
QR Code → Página de boas-vindas (Next.js, estática)
        → Formulário (client component, valida com Zod)
        → Server Action (app/actions/visitantes.ts)
              ├─ honeypot + rate limit
              ├─ revalida com o mesmo schema Zod
              ├─ grava no Supabase (service role — nunca exposta ao navegador)
              └─ notifica os responsáveis por e-mail (best-effort)
        → Tela de sucesso (cultos, contato, Instagram)
```

Não há autenticação de visitante — o cadastro é 100% anônimo, sem conta nem senha. O acesso aos dados pela equipe acontece pelo próprio painel do Supabase, restrito às contas autorizadas.

## 7. Estrutura do projeto

```
app/
  actions/visitantes.ts     Server Action — único ponto que fala com o Supabase
  page.tsx                  Rota "/"
  layout.tsx, globals.css
components/
  formulario/FormularioVisitante.tsx
  ui/                       Campo, OpcaoToggle, Botao — peças reutilizáveis
  PaginaVisitante.tsx        Alterna entre formulário e tela de sucesso
  TelaSucesso.tsx
lib/
  validacao/visitanteSchema.ts   Schema Zod único (cliente + servidor)
  supabase/client.ts              Cliente admin (server-only)
  notificacao/enviarEmail.ts      Envio via Resend (best-effort)
  seguranca/honeypot.ts, rateLimit.ts
migrations/
  0001_criar_visitantes.sql       Schema da tabela `visitantes`
docs/original/                    Folha física original (.docx), para referência histórica
tests/                            Vitest + Testing Library
```

## 8. Como instalar

Pré-requisitos: Node.js 20+ e uma conta gratuita no [Supabase](https://supabase.com) e na [Resend](https://resend.com).

```bash
npm install
```

## 9. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Painel do Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Painel do Supabase → Project Settings → API (chave **secreta** — nunca commitar) |
| `RESEND_API_KEY` | resend.com/api-keys |
| `RESEND_EMAIL_REMETENTE` | Use `onboarding@resend.dev` até verificar um domínio próprio no Resend |
| `NOTIFICACAO_EMAIL_PRINCIPAL` | E-mail do responsável pelo primeiro contato |
| `NOTIFICACAO_EMAIL_ADMIN` | E-mail de quem administra o projeto |

`.env.local` nunca é commitado (já está no `.gitignore`).

## 10. Configurar o Supabase

1. Crie um projeto novo no [painel do Supabase](https://supabase.com/dashboard).
2. Abra o **SQL Editor** e rode o conteúdo de [`migrations/0001_criar_visitantes.sql`](migrations/0001_criar_visitantes.sql).
3. Confirme em **Table Editor** que a tabela `visitantes` foi criada com Row Level Security **ativado** e nenhuma policy de `anon` — toda escrita deve passar pela Server Action, nunca diretamente do navegador.
4. Copie a URL do projeto e a `service_role key` para o `.env.local`.

## 11. Campo CEP com autocomplete

Quando o visitante preenche o campo CEP (8 dígitos) e sai do campo, o formulário busca automaticamente os dados de endereço via [ViaCEP](https://viacep.com.br/), uma API pública gratuita:

- **Logradouro** (rua, avenida, etc)
- **Bairro**
- **Cidade**

Os campos são preenchidos automaticamente e o visitante pode editar se necessário. Se o CEP não existir ou a rede falhar, uma mensagem de erro é exibida e o visitante continua podendo preencher manualmente. O campo CEP é opcional.

Não há dependência externa — usa apenas `fetch` do navegador.

## 12. Executar localmente

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Sem as variáveis do Supabase configuradas, a página carrega normalmente e o formulário mostra uma mensagem de erro amigável ao tentar enviar — o que já é o comportamento esperado para "servidor indisponível".

Outros comandos úteis:

```bash
npm run lint    # ESLint
npm run test    # Vitest (validação, honeypot, rate limit, formulário)
npm run build   # build de produção
```

## 13. Deploy na Vercel

1. Suba o repositório para o GitHub.
2. Importe o projeto em [vercel.com/new](https://vercel.com/new).
3. Configure as mesmas variáveis de ambiente do `.env.local` no painel da Vercel (Settings → Environment Variables).
4. Deploy automático a cada push em `main`; cada Pull Request ganha uma preview própria.

## 14. Gerar e configurar o QR Code

O QR deve apontar para um **domínio estável**, não para a URL temporária `*.vercel.app` — assim, se a hospedagem mudar no futuro, o material impresso não precisa ser trocado.

1. Na Vercel, adicione um domínio próprio (Settings → Domains) — recomendado um subdomínio como `visitantes.SEUDOMINIO.com.br`, apontado via CNAME, mantendo este projeto independente do site institucional da igreja.
2. Gere o QR Code apontando para esse domínio (qualquer gerador de QR gratuito serve — o conteúdo é só a URL).
3. Só substitua o QR exibido no telão depois de confirmar que o domínio final está no ar.

## 15. Segurança

- A `service_role key` do Supabase só existe como variável de ambiente no servidor — nunca no código-fonte, no repositório ou no bundle enviado ao navegador.
- A tabela `visitantes` tem Row Level Security ativado e nenhuma policy pública de leitura/escrita: toda operação passa pela Server Action.
- Validação dupla (cliente com Zod + servidor com o mesmo schema) — o frontend nunca é a única barreira.
- Honeypot (campo invisível) e limite de taxa por IP contêm bots sem exigir captcha do visitante real.
- Bloqueio de reenvio duplicado do mesmo formulário.
- A busca de CEP é feita no navegador (cliente) contra a ViaCEP pública — nenhum dado sensível é enviado para a API de CEP.

## 16. LGPD e privacidade

- **Finalidade**: os dados são coletados apenas para o primeiro contato pastoral e organização de visitas — nunca para fins comerciais ou compartilhamento com terceiros.
- **Minimização**: só nome e celular são estritamente necessários para o objetivo central; os demais campos existem porque a própria igreja confirmou seu uso (endereço para visitas, data de nascimento para acompanhamento pastoral).
- **Transparência**: o próprio tom da página já comunica que os dados são para contato da equipe.
- **Acesso**: restrito às contas autorizadas no Supabase — sem endpoint público de leitura.
- **Exclusão**: como é uma tabela simples em Postgres, remover o registro de alguém que solicitar exclusão é uma operação direta via painel do Supabase.

## 17. Roadmap (fora do escopo desta fase)

- Dashboard próprio de acompanhamento (fora do painel do Supabase).
- Autenticação da equipe com papéis (admin, obreiro, pastor).
- Múltiplos responsáveis com escala/rodízio de notificação.
- WhatsApp oficial (Meta/Twilio), se o volume justificar o custo e a complexidade.
- Estatísticas e histórico de visitantes ao longo do tempo.
- Exportação de dados.

## 17. Licença

Projeto de uso interno da Igreja Aliança Cristã Curitiba. Sem licença de código aberto definida.
