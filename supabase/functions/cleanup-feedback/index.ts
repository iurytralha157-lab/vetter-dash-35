import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const accountId = "d5c1e4f1-3a69-44ea-9437-490f650b8e9d";

  const { error: e1 } = await supabase.from("feedback_campanha").delete().eq("account_id", accountId);
  const { error: e2 } = await supabase.from("feedback_funnel").delete().eq("account_id", accountId);

  return new Response(JSON.stringify({ done: true, errors: [e1, e2].filter(Boolean) }), {
    headers: { "Content-Type": "application/json" },
  });
});
