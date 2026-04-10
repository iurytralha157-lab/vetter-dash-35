import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return jsonResponse({ error: "Evolution API not configured" }, 500);
  }

  const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, "");

  try {
    const { action, ...params } = await req.json();

    switch (action) {
      // ─── Linked instances management ───

      case "list-linked": {
        const { data, error } = await supabaseAdmin
          .from("whatsapp_instances")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) {
          // Table may not exist yet - return empty array
          console.warn("[evolution-api] list-linked error:", error.message);
          return jsonResponse([]);
        }
        return jsonResponse(data || []);
      }

      case "link-instance": {

        const { instanceName, displayName } = params;
        if (!instanceName) return jsonResponse({ error: "instanceName required" }, 400);

        // Verify it exists in Evolution
        try {
          await evoFetch(`${baseUrl}/instance/connectionState/${instanceName}`, "GET", EVOLUTION_API_KEY);
        } catch {
          return jsonResponse({ error: `Instância "${instanceName}" não encontrada na Evolution API` }, 404);
        }

        const { data, error } = await supabaseAdmin
          .from("whatsapp_instances")
          .upsert(
            { instance_name: instanceName, display_name: displayName || instanceName, linked_by: user.id },
            { onConflict: "instance_name" }
          )
          .select()
          .single();
        if (error) throw new Error(error.message);
        return jsonResponse(data);
      }

      case "unlink-instance": {
        const { instanceName } = params;
        if (!instanceName) return jsonResponse({ error: "instanceName required" }, 400);
        const { error } = await supabaseAdmin
          .from("whatsapp_instances")
          .delete()
          .eq("instance_name", instanceName);
        if (error) throw new Error(error.message);
        return jsonResponse({ success: true });
      }

      case "create-instance": {

        const { instanceName, number, qrcode = true } = params;
        if (!instanceName) return jsonResponse({ error: "instanceName required" }, 400);
        const body: Record<string, unknown> = {
          instanceName,
          qrcode,
          integration: "WHATSAPP-BAILEYS",
        };
        if (number) body.number = number;
        const res = await evoFetch(`${baseUrl}/instance/create`, "POST", EVOLUTION_API_KEY, body);

        // Auto-link new instance
        await supabaseAdmin
          .from("whatsapp_instances")
          .upsert(
            { instance_name: instanceName, display_name: instanceName, linked_by: user.id },
            { onConflict: "instance_name" }
          );

        return jsonResponse(res);
      }

      // ─── Evolution API proxy (only for linked instances) ───

      case "instance-status": {
        const { instanceName } = params;
        if (!instanceName) return jsonResponse({ error: "instanceName required" }, 400);
        const res = await evoFetch(`${baseUrl}/instance/connectionState/${instanceName}`, "GET", EVOLUTION_API_KEY);
        return jsonResponse(res);
      }

      case "connect-instance": {
        const { instanceName } = params;
        if (!instanceName) return jsonResponse({ error: "instanceName required" }, 400);
        const res = await evoFetch(`${baseUrl}/instance/connect/${instanceName}`, "GET", EVOLUTION_API_KEY);
        return jsonResponse(res);
      }

      case "list-groups": {
        const { instanceName } = params;
        if (!instanceName) return jsonResponse({ error: "instanceName required" }, 400);
        const res = await evoFetch(
          `${baseUrl}/group/fetchAllGroups/${instanceName}?getParticipants=false`,
          "GET",
          EVOLUTION_API_KEY
        );
        return jsonResponse(res);
      }

      case "group-participants": {
        const { instanceName, groupJid } = params;
        if (!instanceName || !groupJid)
          return jsonResponse({ error: "instanceName and groupJid required" }, 400);
        const res = await evoFetch(
          `${baseUrl}/group/participants/${instanceName}?groupJid=${encodeURIComponent(groupJid)}`,
          "GET",
          EVOLUTION_API_KEY
        );
        return jsonResponse(res);
      }

      case "send-text": {
        const { instanceName, number, text } = params;
        if (!instanceName || !number || !text)
          return jsonResponse({ error: "instanceName, number, and text required" }, 400);
        const res = await evoFetch(
          `${baseUrl}/message/sendText/${instanceName}`,
          "POST",
          EVOLUTION_API_KEY,
          { number, text }
        );
        return jsonResponse(res);
      }

      case "send-group": {
        const { instanceName, groupJid, text } = params;
        if (!instanceName || !groupJid || !text)
          return jsonResponse({ error: "instanceName, groupJid, and text required" }, 400);
        const res = await evoFetch(
          `${baseUrl}/message/sendText/${instanceName}`,
          "POST",
          EVOLUTION_API_KEY,
          { number: groupJid, text }
        );
        return jsonResponse(res);
      }

      case "send-media": {
        const { instanceName, number, mediatype, media, caption, fileName } = params;
        if (!instanceName || !number || !mediatype || !media)
          return jsonResponse({ error: "instanceName, number, mediatype, and media required" }, 400);
        const res = await evoFetch(
          `${baseUrl}/message/sendMedia/${instanceName}`,
          "POST",
          EVOLUTION_API_KEY,
          { number, mediatype, media, caption, fileName }
        );
        return jsonResponse(res);
      }

      // ─── List all from Evolution (for linking dialog) ───
      case "list-all-evolution": {
        const res = await evoFetch(`${baseUrl}/instance/fetchInstances`, "GET", EVOLUTION_API_KEY);
        console.log("[evolution-api] list-all-evolution response keys:", JSON.stringify(
          Array.isArray(res) ? res.map((r: any) => Object.keys(r)) : Object.keys(res)
        ));
        if (Array.isArray(res) && res.length > 0) {
          console.log("[evolution-api] first instance sample:", JSON.stringify(res[0]).slice(0, 500));
        }
        return jsonResponse(res);
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("[evolution-api]", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});

// Table must exist in Supabase - no auto-creation needed

async function evoFetch(url: string, method: string, apiKey: string, body?: unknown) {
  const opts: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Evolution API [${res.status}]: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
