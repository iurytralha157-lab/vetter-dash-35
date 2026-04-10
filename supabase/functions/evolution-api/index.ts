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

  // Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // Get Evolution API config
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return jsonResponse({ error: "Evolution API not configured" }, 500);
  }

  // Remove trailing slash
  const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, "");

  try {
    const { action, ...params } = await req.json();

    switch (action) {
      // ─── Instance info ───
      case "instance-status": {
        const { instanceName } = params;
        if (!instanceName) return jsonResponse({ error: "instanceName required" }, 400);
        const res = await evoFetch(`${baseUrl}/instance/connectionState/${instanceName}`, "GET", EVOLUTION_API_KEY);
        return jsonResponse(res);
      }

      // ─── List instances ───
      case "list-instances": {
        const res = await evoFetch(`${baseUrl}/instance/fetchInstances`, "GET", EVOLUTION_API_KEY);
        return jsonResponse(res);
      }

      // ─── List groups ───
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

      // ─── Group participants ───
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

      // ─── Send text message ───
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

      // ─── Send message to group ───
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

      // ─── Send media ───
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
