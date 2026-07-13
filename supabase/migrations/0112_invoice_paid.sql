-- ============================================================================
-- Cod373 — Migrare 0112: sumă încasată / avans primit pe factură
--
-- Permite să notezi cât s-a încasat deja (avans sau plată parțială) pe o
-- factură, ca să apară „Achitat" și „Rest de plată" pe document.
-- ============================================================================
alter table public.invoices
  add column if not exists amount_paid numeric(14,2);
