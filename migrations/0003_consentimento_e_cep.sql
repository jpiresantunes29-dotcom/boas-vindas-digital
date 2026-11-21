-- Adiciona CEP, opt-in de WhatsApp e registro do consentimento (LGPD) ao cadastro.

alter table public.visitantes
  add column if not exists cep text,
  add column if not exists aceita_whatsapp boolean not null default false,
  add column if not exists consentimento_privacidade_em timestamptz;

comment on column public.visitantes.cep is
  'CEP do visitante, só os 8 dígitos (sem hífen) — opcional; usado para autocompletar o endereço.';
comment on column public.visitantes.aceita_whatsapp is
  'Opt-in: true quando o visitante pediu para receber a confirmação do cadastro no WhatsApp.';
comment on column public.visitantes.consentimento_privacidade_em is
  'Data/hora (gerada pelo servidor) em que o visitante concordou com o aviso de privacidade — nulo nos cadastros anteriores ao aviso.';
