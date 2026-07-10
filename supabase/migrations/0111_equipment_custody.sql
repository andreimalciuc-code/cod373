-- ============================================================================
-- Cod373 — Migrare 0111: bunuri încredințate angajaților + act de primire-predare
--
-- Extindem employee_equipment ca să acopere „bunuri încredințate" (telefon de
-- lucru, tehnică, chei/acces): serie/IMEI/nr. inventar, valoare, stare la
-- predare și retur. Astfel putem genera un Act de primire-predare (proces-verbal).
-- ============================================================================
alter table public.employee_equipment
  add column if not exists serial_no   text,          -- serie / IMEI / nr. inventar
  add column if not exists value       numeric(12,2), -- valoarea bunului (pentru act)
  add column if not exists condition   text,          -- starea la predare (nou/bun/uzat…)
  add column if not exists returned_at date,           -- data returului (NULL = încă în custodie)
  add column if not exists return_note text;

-- Tipuri noi permise: telefon de lucru, tehnică/electronice, cheie/acces.
alter table public.employee_equipment drop constraint if exists employee_equipment_kind_check;
alter table public.employee_equipment
  add constraint employee_equipment_kind_check
  check (kind in ('haine','instrument','eip','telefon','tehnica','cheie','altul'));
