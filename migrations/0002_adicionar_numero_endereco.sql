-- Adiciona número, complemento e tipo de moradia ao endereço do visitante.

alter table public.visitantes
  add column if not exists numero text not null default '',
  add column if not exists complemento text,
  add column if not exists tipo_moradia text check (
    tipo_moradia in ('casa', 'apartamento', 'condominio')
  );

alter table public.visitantes
  alter column numero drop default;

comment on column public.visitantes.numero is
  'Número do endereço — obrigatório a partir deste cadastro.';
comment on column public.visitantes.tipo_moradia is
  'Casa, apartamento ou condomínio — usado pela equipe para organizar visitas.';
