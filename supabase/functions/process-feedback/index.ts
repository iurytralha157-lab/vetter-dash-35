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
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const {
      mensagem_original,
      account_id,
      id_grupo,
      numero_grupo,
      telefone_origem,
      nome_origem,
      usuario_origem,
    } = body;

    if (!mensagem_original || mensagem_original.trim().length < 5) {
      return new Response(JSON.stringify({ error: "mensagem_original é obrigatória (mínimo 5 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!account_id) {
      return new Response(JSON.stringify({ error: "account_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const msg = mensagem_original.trim();

    // Generate hash for dedup
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(msg.toLowerCase()));
    const mensagem_hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    // Check duplicate
    const { data: existing } = await supabase
      .from("feedback_campanha")
      .select("id")
      .eq("mensagem_hash", mensagem_hash)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, duplicado: true, message: "Mensagem já processada" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sharedFields = {
      account_id,
      mensagem_original: msg,
      mensagem_hash,
      id_grupo: id_grupo || null,
      numero_grupo: numero_grupo || null,
      telefone_origem: telefone_origem || null,
      nome_origem: nome_origem || null,
      usuario_origem: usuario_origem || null,
    };

    // Call AI to parse the message into campaigns
    let campaigns: CampaignData[] = [];
    let tipoFunil = "";
    let aiModel = "google/gemini-3-flash-preview";
    let processamentoStatus = "pendente";
    let processamentoErro: string | null = null;
    let aiJson: any = null;

    if (lovableApiKey) {
      try {
        const result = await callAI(msg, lovableApiKey, aiModel);
        tipoFunil = result.tipo_funil;
        campaigns = result.campanhas;
        aiJson = result;
        processamentoStatus = "processado";
      } catch (err) {
        console.error("[process-feedback] AI error:", err);
        processamentoStatus = "erro";
        processamentoErro = err instanceof Error ? err.message : "AI processing failed";
      }
    } else {
      processamentoStatus = "erro";
      processamentoErro = "LOVABLE_API_KEY not configured";
    }

    // If AI failed, save a raw record
    if (campaigns.length === 0) {
      const { error: insertError } = await supabase.from("feedback_campanha").insert({
        ...sharedFields,
        tipo_funil: tipoFunil || "lancamento",
        campanha_nome: "desconhecida",
        data_referencia: new Date().toISOString().split("T")[0],
        processamento_status: processamentoStatus,
        processamento_erro: processamentoErro,
        ai_modelo: aiModel,
        ai_json: aiJson,
      });

      if (insertError) console.error("[process-feedback] Insert error:", insertError);

      return new Response(JSON.stringify({
        success: true,
        processamento_status: processamentoStatus,
        campanhas_count: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate tipo_funil
    if (!["lancamento", "terceiros"].includes(tipoFunil)) {
      tipoFunil = "lancamento";
    }

    // Insert one record per campaign
    const inserted: any[] = [];
    for (const camp of campaigns) {
      const record = {
        ...sharedFields,
        tipo_funil: tipoFunil,
        campanha_nome: camp.campanha_nome || "desconhecida",
        campanha_codigo_curto: camp.campanha_codigo_curto || null,
        data_referencia: camp.data_referencia || new Date().toISOString().split("T")[0],
        quantidade_recebida: camp.quantidade_recebida || 0,
        quantidade_descartado: camp.quantidade_descartado || 0,
        quantidade_aguardando_retorno: camp.quantidade_aguardando_retorno || 0,
        quantidade_atendimento: camp.quantidade_atendimento || 0,
        quantidade_passou_corretor: camp.quantidade_passou_corretor || 0,
        quantidade_visita: camp.quantidade_visita || 0,
        quantidade_proposta: camp.quantidade_proposta || 0,
        quantidade_venda: camp.quantidade_venda || 0,
        processamento_status: processamentoStatus,
        processamento_erro: processamentoErro,
        ai_modelo: aiModel,
        ai_json: aiJson,
      };

      const { error: insertError } = await supabase.from("feedback_campanha").insert(record);
      if (insertError) {
        console.error("[process-feedback] Insert error:", insertError);
      } else {
        inserted.push(record);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processamento_status: processamentoStatus,
      tipo_funil: tipoFunil,
      campanhas_count: inserted.length,
      campanhas: inserted.map(c => ({ nome: c.campanha_nome, recebidos: c.quantidade_recebida })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[process-feedback] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface CampaignData {
  campanha_nome: string;
  campanha_codigo_curto?: string;
  data_referencia?: string;
  quantidade_recebida: number;
  quantidade_descartado: number;
  quantidade_aguardando_retorno: number;
  quantidade_atendimento: number;
  quantidade_passou_corretor: number;
  quantidade_visita: number;
  quantidade_proposta: number;
  quantidade_venda: number;
}

async function callAI(mensagem: string, apiKey: string, model: string): Promise<{ tipo_funil: string; campanhas: CampaignData[] }> {
  const systemPrompt = `Você é um assistente que interpreta mensagens de feedback de vendas imobiliárias enviadas via WhatsApp.

A mensagem segue o formato:
#feedback
<tipo_funil> (lancamento ou terceiros)

referente à campanha <NOME>
recebidos <N>
descartados <N>
aguardando retorno <N>
em atendimento <N> (ou "atendimento SDR" para terceiros)
passou para corretor <N> (apenas terceiros)
visita <N>
proposta <N>
venda <N>

Pode haver MÚLTIPLAS campanhas na mesma mensagem.

Extraia:
1. tipo_funil: "lancamento" ou "terceiros" (da linha logo após #feedback)
2. Para cada campanha mencionada, extraia as quantidades

Retorne usando a tool extract_feedback_campaigns.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: mensagem },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_feedback_campaigns",
            description: "Extract campaign-level feedback data from a WhatsApp message",
            parameters: {
              type: "object",
              properties: {
                tipo_funil: {
                  type: "string",
                  enum: ["lancamento", "terceiros"],
                  description: "Tipo do funil, extraído da linha após #feedback",
                },
                campanhas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      campanha_nome: { type: "string", description: "Nome completo da campanha" },
                      campanha_codigo_curto: { type: "string", description: "Código curto se houver (ex: REF47, AP0145)" },
                      quantidade_recebida: { type: "integer", description: "Leads recebidos" },
                      quantidade_descartado: { type: "integer", description: "Leads descartados" },
                      quantidade_aguardando_retorno: { type: "integer", description: "Aguardando retorno" },
                      quantidade_atendimento: { type: "integer", description: "Em atendimento / Atendimento SDR" },
                      quantidade_passou_corretor: { type: "integer", description: "Passou para corretor (só terceiros)" },
                      quantidade_visita: { type: "integer", description: "Visitas" },
                      quantidade_proposta: { type: "integer", description: "Propostas" },
                      quantidade_venda: { type: "integer", description: "Vendas" },
                    },
                    required: ["campanha_nome", "quantidade_recebida"],
                  },
                },
              },
              required: ["tipo_funil", "campanhas"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_feedback_campaigns" } },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI Gateway error ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

  if (toolCall?.function?.arguments) {
    const parsed = JSON.parse(toolCall.function.arguments);
    return {
      tipo_funil: parsed.tipo_funil || "lancamento",
      campanhas: Array.isArray(parsed.campanhas) ? parsed.campanhas : [],
    };
  }

  // Fallback: parse content
  const content = result.choices?.[0]?.message?.content;
  if (content) {
    const parsed = JSON.parse(content);
    return {
      tipo_funil: parsed.tipo_funil || "lancamento",
      campanhas: Array.isArray(parsed.campanhas) ? parsed.campanhas : [],
    };
  }

  throw new Error("No AI response");
}
