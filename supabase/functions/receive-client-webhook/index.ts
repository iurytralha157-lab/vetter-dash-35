import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    console.log("[receive-client-webhook] Payload:", JSON.stringify(body).slice(0, 1000));

    // Expected fields from external system
    const nome = body.nome || body.name || body.nome_cliente;
    const telefone = body.telefone || body.phone || body.whatsapp;
    const email = body.email || null;
    const groupJid = body.group_jid || body.grupo_jid || body.id_grupo || null;
    const instanceName = body.instance_name || body.instancia || null;

    if (!nome || !telefone) {
      return jsonResponse({ error: "Campos obrigatórios: nome e telefone" }, 400);
    }

    console.log(`[receive-client-webhook] Creating cliente: ${nome}, tel: ${telefone}, group: ${groupJid}`);

    // 1. Create cliente
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .insert({
        nome: nome,
        telefone: telefone,
        email: email,
        status: "Aprovado",
        id_grupo: groupJid || null,
      })
      .select()
      .single();

    if (clienteError) {
      console.error("[receive-client-webhook] Error creating cliente:", clienteError);
      throw new Error(`Erro ao criar cliente: ${clienteError.message}`);
    }

    console.log(`[receive-client-webhook] Cliente created: ${cliente.id}`);

    // 2. Get first admin user to set as user_id for the account
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .single();

    const adminUserId = adminRole?.user_id;

    if (!adminUserId) {
      console.error("[receive-client-webhook] No admin user found");
      throw new Error("Nenhum administrador encontrado no sistema");
    }

    // 3. Create account linked to cliente
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .insert({
        nome_cliente: nome,
        telefone: telefone,
        email: email,
        cliente_id: cliente.id,
        user_id: adminUserId,
        id_grupo: groupJid || null,
        canais: [],
        status: "Ativo",
      })
      .select()
      .single();

    if (accountError) {
      console.error("[receive-client-webhook] Error creating account:", accountError);
      throw new Error(`Erro ao criar conta: ${accountError.message}`);
    }

    console.log(`[receive-client-webhook] Account created: ${account.id}`);

    // 4. Send welcome message to WhatsApp group if groupJid is provided
    if (groupJid && instanceName) {
      try {
        const evolutionUrl = Deno.env.get("EVOLUTION_API_URL")?.replace(/\/+$/, "");
        const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

        if (evolutionUrl && evolutionKey) {
          const welcomeMessage = 
            `🎉 *Bem-vindos ao grupo!*\n\n` +
            `Olá equipe! O cliente *${nome}* foi cadastrado com sucesso no sistema.\n\n` +
            `📋 *Próximo passo:* Estamos aguardando o preenchimento das informações complementares (Link do Drive, canais de mídia, etc).\n\n` +
            `Qualquer dúvida, estamos à disposição! 🚀`;

          const sendRes = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: evolutionKey,
            },
            body: JSON.stringify({
              number: groupJid,
              text: welcomeMessage,
            }),
          });

          if (sendRes.ok) {
            console.log("[receive-client-webhook] Welcome message sent successfully");
          } else {
            const errText = await sendRes.text();
            console.warn("[receive-client-webhook] Failed to send welcome message:", errText);
          }
        }
      } catch (msgErr) {
        console.warn("[receive-client-webhook] Error sending welcome message:", msgErr);
        // Don't fail the whole request if message fails
      }
    }

    return jsonResponse({
      success: true,
      message: "Cliente e conta criados com sucesso",
      cliente_id: cliente.id,
      account_id: account.id,
      welcome_sent: !!(groupJid && instanceName),
    });

  } catch (err) {
    console.error("[receive-client-webhook] Error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Erro interno" },
      500
    );
  }
});
