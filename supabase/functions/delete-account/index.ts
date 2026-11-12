// Удаление аккаунта родителя по его запросу из приложения (требование App Store и GDPR).
// Удаляется пользователь auth.users; профили детей, прогресс, расписание, покупки
// и подписка удаляются каскадом (ON DELETE CASCADE).
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "method" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return reply({ error: "unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Кто вызывает — определяем только по его собственному токену.
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return reply({ error: "unauthorized" }, 401);

  const { error } = await admin.auth.admin.deleteUser(userData.user.id);
  if (error) return reply({ error: "failed" }, 500);
  return reply({ ok: true });
});
