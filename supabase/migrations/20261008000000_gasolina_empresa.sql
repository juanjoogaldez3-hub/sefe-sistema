-- Gasolina (control compartido): agregar columna 'empresa' para registrar
-- qué empresa pagó/consumió cada carga de combustible. El reporte sigue
-- siendo compartido (se ven las dos empresas), pero cada fila queda marcada.
-- Seguro de correr de más (if not exists).

alter table public.ctrl_gasolina
  add column if not exists empresa text not null default 'SEFE';
