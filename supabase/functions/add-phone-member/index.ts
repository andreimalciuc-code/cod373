// Cod373 — Edge Function: "Adaugă angajat DOAR cu telefon" (fără email, fără SMS)
// Owner/admin creează contul instant-activ; angajatul se loghează cu telefon + parolă.
// Emailul real îl poate adăuga ulterior din 🎨 Contul meu.
//
// DEPLOY (la lansare):
//   supabase secrets set SERVICE_ROLE_KEY=<service_role>   (sau folosește SUPABASE_SERVICE_ROLE_KEY implicit)
//   supabase functions deploy add-phone-member
//
// Apel din app (owner logat): sb.functions.invoke('add-phone-member',{ body:{ name, phone, password, role } })
// (tenant_id se ia din membership-ul apelantului, nu din body — siguranță.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const J = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const ALLOWED_ROLES = ["worker", "driver", "manager", "accountant", "admin"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth) return J({ error: "no-auth" }, 401);

    // 1) cine apelează (din JWT) — trebuie să fie owner/admin într-o firmă
    const asUser = createClient(URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: u } = await asUser.auth.getUser();
    if (!u?.user) return J({ error: "no-auth" }, 401);
    const { data: mem } = await asUser
      .from("memberships").select("tenant_id, role").eq("active", true).limit(1).maybeSingle();
    if (!mem || !["owner", "admin"].includes(mem.role)) return J({ error: "forbidden" }, 403);

    const { name, phone, password, role } = await req.json();
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length < 6) return J({ error: "phone" }, 400);
    if (!password || String(password).length < 6) return J({ error: "password" }, 400);
    const r = ALLOWED_ROLES.includes(role) ? role : "worker";

    const admin = createClient(URL, SERVICE);

    // telefon deja folosit?
    const { data: dupe } = await admin.from("profiles").select("id").eq("phone", phone).limit(1).maybeSingle();
    if (dupe) return J({ error: "phone-exists" }, 409);

    // 2) creează userul instant-confirmat, cu email-ascuns derivat din telefon
    const synthEmail = "t" + digits + "@phone.cod373.app";
    const { data: created, error: ce } = await admin.auth.admin.createUser({
      email: synthEmail, password, email_confirm: true,
      user_metadata: { full_name: name || null, phone, pw_set: true, phone_only: true },
    });
    if (ce || !created?.user) return J({ error: ce?.message || "create-failed" }, 400);
    const uid = created.user.id;

    // 3) profil (telefon pentru logare) + membership în firma apelantului
    await admin.from("profiles").upsert({ id: uid, full_name: name || null, phone }, { onConflict: "id" });
    const { error: me } = await admin.from("memberships")
      .insert({ tenant_id: mem.tenant_id, user_id: uid, role: r, active: true });
    if (me) { try { await admin.auth.admin.deleteUser(uid); } catch (_) {} return J({ error: me.message }, 400); }

    return J({ ok: true, phone, role: r });
  } catch (e) {
    return J({ error: String((e as Error)?.message || e) }, 500);
  }
});
