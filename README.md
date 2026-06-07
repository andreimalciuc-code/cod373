# Cod373 — ERP pentru construcții (Republica Moldova)

Aplicație web (single-page) pentru gestiunea firmelor de construcții: șantiere, devize,
facturi, materiale, angajați, grafic de lucrări, portal client. Backend: Supabase (RLS).

- **Aplicația birou:** [app.html](./app.html)
- **Aplicația de teren (mobil):** [mobil.html](./mobil.html)
- **Portal client:** [portal.html](./portal.html)

Cheia Supabase inclusă este `publishable` (anon) — sigură în browser; datele sunt
protejate prin Row-Level Security și roluri impuse la nivel de bază de date.
