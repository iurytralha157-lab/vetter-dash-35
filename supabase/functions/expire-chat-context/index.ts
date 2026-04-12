import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const evolutionUrl = Deno.env.get("EVOLUTION_API_URL")!.replace(/\/+$/, "");
  const evolutionKey = Deno.env.get("EVOLUTION_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Find expired contexts that haven't been notified yet
    const now = new Date().toISOString();
    const { data: expiredContexts, error } = await supabase
      .from("whatsapp_chat_context")
      .select("id, group_jid, account_id, context_type, instance_name")
      .lt("expires_at", now)
      .eq("expiry_notified", false);

    if (error) {
      console.error("[expire-chat-context] Query error:", error);
      throw error;
    }

    if (!expiredContexts || expiredContexts.length === 0) {
      console.log("[expire-chat-context] No expired contexts to notify.");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[expire-chat-context] Found ${expiredContexts.length} expired context(s) to notify.`);

    let processed = 0;

    for (const ctx of expiredContexts) {
      try {
        // Determine instance_name: from context row, or look up from whatsapp_groups
        let instanceName = ctx.instance_name;

        if (!instanceName) {
          const { data: groupData } = await supabase
            .from("whatsapp_groups")
            .select("instance_name")
            .eq("group_jid", ctx.group_jid)
            .limit(1)
            .single();

          instanceName = groupData?.instance_name;
        }

        if (!instanceName) {
          console.warn(`[expire-chat-context] No instance_name for group ${ctx.group_jid}, skipping.`);
          // Mark as notified to avoid retrying forever
          await supabase
            .from("whatsapp_chat_context")
            .update({ expiry_notified: true })
            .eq("id", ctx.id);
          continue;
        }

        // Send expiry message
        const msg =
          `⏰ *Sessão encerrada*\n\n` +
          `O contexto da consulta anterior expirou após 30 minutos de inatividade.\n\n` +
          `Para uma nova consulta, envie o comando novamente (ex: *#campanhas*, *#saldo*, etc).\n` +
          `Digite *#comandos* para ver todas as opções disponíveis.`;

        const url = `${evolutionUrl}/message/sendText/${instanceName}`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: evolutionKey,
          },
          body: JSON.stringify({ number: ctx.group_jid, text: msg }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`[expire-chat-context] Failed to send to ${ctx.group_jid}:`, errText);
        } else {
          console.log(`[expire-chat-context] Notified ${ctx.group_jid} about expiry.`);
        }

        // Mark as notified
        await supabase
          .from("whatsapp_chat_context")
          .update({ expiry_notified: true })
          .eq("id", ctx.id);

        processed++;

        // Delay between messages to avoid WhatsApp blocking
        if (processed < expiredContexts.length) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (err) {
        console.error(`[expire-chat-context] Error processing context ${ctx.id}:`, err);
        // Mark as notified to avoid infinite retries
        await supabase
          .from("whatsapp_chat_context")
          .update({ expiry_notified: true })
          .eq("id", ctx.id);
      }
    }

    // Clean up old expired contexts (older than 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("whatsapp_chat_context")
      .delete()
      .lt("expires_at", twoHoursAgo)
      .eq("expiry_notified", true);

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[expire-chat-context] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
