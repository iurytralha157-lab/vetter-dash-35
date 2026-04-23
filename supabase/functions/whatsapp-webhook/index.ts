import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeSenderValue(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  try {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  } catch (e) {
    return dateStr || "N/A";
  }
}

function getSenderJid(key: any): string {
  return key?.participantAlt || key?.participant || "";
}

function contextBelongsToSender(contextData: any, senderJid: string, senderName?: string): boolean {
  const normalizedContextSenderJid = normalizeSenderValue(contextData?.sender_jid);
  const normalizedSenderJid = normalizeSenderValue(senderJid);

  if (normalizedContextSenderJid && normalizedSenderJid) {
    return normalizedContextSenderJid === normalizedSenderJid;
  }

  const normalizedContextSenderName = normalizeSenderValue(contextData?.sender_name);
  const normalizedSenderName = normalizeSenderValue(senderName);

  if (normalizedContextSenderName && normalizedSenderName) {
    return normalizedContextSenderName === normalizedSenderName;
  }

  return false;
}

function getMatchingContextRow(rows: any[] | null | undefined, senderJid: string, senderName?: string): any | null {
  if (!rows?.length) return null;

  const matchedRow = rows.find((row: any) => contextBelongsToSender(row.context_data, senderJid, senderName));
  if (matchedRow) return matchedRow;

  if (rows.length === 1) {
    const onlyRow = rows[0];
    const hasSenderMetadata = Boolean(
      normalizeSenderValue(onlyRow?.context_data?.sender_jid) ||
      normalizeSenderValue(onlyRow?.context_data?.sender_name)
    );

    if (!hasSenderMetadata) {
      return onlyRow;
    }
  }

  return null;
}

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
    const payload = await req.json();
    console.log("[whatsapp-webhook] Received:", JSON.stringify(payload).slice(0, 500));

    const event = payload.event;
    if (event !== "messages.upsert") {
      return new Response(JSON.stringify({ ignored: true, event }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = payload.data;
    if (!data) {
      return new Response(JSON.stringify({ ignored: true, reason: "no data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = data.message;
    const key = data.key;
    const instanceName = payload.instance;
    const senderJid = getSenderJid(key);
    const senderName = data.pushName || senderJid || "Desconhecido";

    if (!key || !message) {
      return new Response(JSON.stringify({ ignored: true, reason: "no key/message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remoteJid = key.remoteJid || "";
    const isGroup = remoteJid.endsWith("@g.us");
    if (!isGroup) {
      return new Response(JSON.stringify({ ignored: true, reason: "not a group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (key.fromMe) {
      return new Response(JSON.stringify({ ignored: true, reason: "own message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let text = (
      message.conversation ||
      message.extendedTextMessage?.text ||
      ""
    ).trim();

    // Check for audio message
    const isAudio = !!(message.audioMessage);
    const messageId = key.id;

    if (isAudio) {
      // Process audio: download, transcribe, interpret
      console.log("[whatsapp-webhook] Audio message detected, messageId:", messageId);

      const groupNumber = remoteJid.replace("@g.us", "");
      const possibleFormats = [groupNumber, `${groupNumber}-group`, remoteJid];

      let account: any = null;
      for (const fmt of possibleFormats) {
        const { data: accData } = await supabase
          .from("accounts")
          .select("id, nome_cliente, meta_account_id, cliente_id")
          .eq("id_grupo", fmt)
          .limit(1)
          .maybeSingle();
        if (accData) {
          account = accData;
          break;
        }
      }

      if (!account) {
        return new Response(JSON.stringify({ ignored: true, reason: "no linked account for audio" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        // 1. Download audio via Evolution API getBase64FromMediaMessage
        // Must pass the complete message object (key + audioMessage) for media decryption
        const base64Res = await fetch(
          `${evolutionUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: evolutionKey },
            body: JSON.stringify({ message: { key, message }, convertToMp4: false }),
          }
        );

        if (!base64Res.ok) {
          console.error("[whatsapp-webhook] Failed to download audio:", await base64Res.text());
          return new Response(JSON.stringify({ ignored: true, reason: "audio download failed" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const base64Data = await base64Res.json();
        const audioBase64 = base64Data.base64 || base64Data.data;

        if (!audioBase64) {
          console.error("[whatsapp-webhook] No base64 data in response");
          return new Response(JSON.stringify({ ignored: true, reason: "no audio data" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 2. Use AI Gateway (Gemini) to transcribe and interpret the audio
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          console.error("[whatsapp-webhook] LOVABLE_API_KEY not configured");
          return new Response(JSON.stringify({ ignored: true, reason: "no AI key" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const mimetype = message.audioMessage?.mimetype || "audio/ogg";

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `Você é um assistente que transcreve áudios de WhatsApp e identifica comandos.
A palavra-chave de ativação é "Vetter" (ou variações como "better", "véter", "veter").

Se o áudio começar com a palavra-chave "Vetter", extraia o comando e retorne-o no formato de hashtag.
Se NÃO começar com "Vetter", retorne exatamente: IGNORAR

Comandos disponíveis:
- #campanhas [período] — ex: "campanhas dos últimos 7 dias" → #campanhas 7
- #campanha [número] — ex: "campanha número 3" → #campanha 3
- #saldo — consultar saldo
- #gasto [período] — ex: "gasto de março" → #gasto março
- #leads — ver leads
- #resumo — resumo geral
- #funil — ver funil de vendas
- #comandos — listar comandos
- #feedback [texto] — registrar feedback
- #followup [texto] — registrar follow-up

Exemplos:
- "Vetter, me mostra as campanhas dos últimos 7 dias" → #campanhas 7
- "Vetter, qual o saldo?" → #saldo
- "Vetter, quanto gastou esse mês?" → #gasto mês
- "Vetter, me dá um resumo" → #resumo
- "Vetter, quero ver o gasto de janeiro até março" → #gasto 01/01 a 31/03
- "Oi pessoal, tudo bem?" → IGNORAR (não começa com Vetter)

Responda APENAS com o comando em hashtag ou IGNORAR. Nada mais.`,
              },
              {
                role: "user",
                content: [
                  {
                    type: "input_audio",
                    input_audio: {
                      data: audioBase64,
                      format: mimetype.includes("ogg") ? "ogg" : mimetype.includes("mp4") ? "mp4" : "mp3",
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error("[whatsapp-webhook] AI transcription error:", aiResponse.status, errText.slice(0, 300));
          return new Response(JSON.stringify({ ignored: true, reason: "transcription failed" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const aiResult = await aiResponse.json();
        const interpretedCommand = (aiResult.choices?.[0]?.message?.content || "").trim();
        console.log("[whatsapp-webhook] Audio interpreted as:", interpretedCommand);

        if (!interpretedCommand || interpretedCommand === "IGNORAR" || !interpretedCommand.startsWith("#")) {
          console.log("[whatsapp-webhook] Audio not a Vetter command, ignoring");
          return new Response(JSON.stringify({ ignored: true, reason: "not a vetter command" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 3. Send "processing" message and execute the command
        await sendEvolutionMessage(
          evolutionUrl, evolutionKey, instanceName, remoteJid,
          `🎙️ *Comando por voz recebido!*\n_"${interpretedCommand}"_\n\nProcessando...`
        );

        return await processCommand(interpretedCommand, account, remoteJid, instanceName, evolutionUrl, evolutionKey, supabase, senderName, senderJid);
      } catch (audioErr) {
        console.error("[whatsapp-webhook] Audio processing error:", audioErr);
        return new Response(JSON.stringify({ ignored: true, reason: "audio error" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!text || !text.startsWith("#")) {
      return new Response(JSON.stringify({ ignored: true, reason: "not a command" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groupNumber = remoteJid.replace("@g.us", "");
    const possibleFormats = [groupNumber, `${groupNumber}-group`, remoteJid];

    let account: any = null;
    let isTeamGroup = false;
    let multipleAccounts: any[] = [];
    
    for (const fmt of possibleFormats) {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, nome_cliente, meta_account_id, cliente_id")
        .eq("id_grupo", fmt);
      if (data && data.length === 1) {
        account = data[0];
        break;
      } else if (data && data.length > 1) {
        multipleAccounts = data;
        break;
      }
    }

    // If multiple accounts found for this group, first check if there's a pending context
    // (e.g., #feedback sim, #feedback não, #atualizar) that already knows which account to use
    if (!account && multipleAccounts.length > 1) {
      const cmdLower = text.toLowerCase().trim();
      const isContextCommand = 
        cmdLower === "#feedback sim" || cmdLower === "#feedback\nsim" ||
        cmdLower === "#feedback não" || cmdLower === "#feedback nao" ||
        cmdLower === "#feedback\nnão" || cmdLower === "#feedback\nnao" ||
        cmdLower === "#atualizar" ||
        cmdLower === "#sim" || cmdLower === "#todas" || cmdLower === "#todos" ||
        /^#\d+(\s+#?\d+)*$/.test(cmdLower);
      
      if (isContextCommand) {
        // Look up pending context for this group to resolve the account
        const { data: ctxRows } = await supabase
          .from("whatsapp_chat_context")
          .select("account_id, context_type, created_at, context_data")
          .eq("group_jid", remoteJid)
          .in("context_type", ["feedback_confirm", "feedback_update", "campanhas"])
          .gte("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(10);

        const matchedContext = getMatchingContextRow(ctxRows, senderJid, senderName);
        const ctxAccountId = matchedContext?.account_id;
        if (ctxAccountId) {
          const matched = multipleAccounts.find((a: any) => a.id === ctxAccountId);
          if (matched) {
            account = matched;
            console.log("[whatsapp-webhook] Resolved account from pending context:", matched.nome_cliente);
          }
        }
      }
    }

    // If multiple accounts and still no match, check if user specified which one
    if (!account && multipleAccounts.length > 1) {
      const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
      const cmdLine = lines[0];
      
      // Check if there's a second line with account name
      if (lines.length >= 2) {
        const accountNameLine = lines[1].trim();
        const matched = multipleAccounts.find((a: any) => 
          a.nome_cliente.toLowerCase() === accountNameLine.toLowerCase() ||
          a.nome_cliente.toLowerCase().includes(accountNameLine.toLowerCase())
        );
        if (matched) {
          account = matched;
          const restLines = lines.slice(2);
          text = [cmdLine, ...restLines].join("\n");
        }
      }
      
      // If still no match, list accounts for the user
      if (!account) {
        const accountList = multipleAccounts.map((a: any, i: number) => 
          `${i + 1}. *${a.nome_cliente}*`
        ).join("\n");
        
        const helpMsg = `📋 *Este grupo tem ${multipleAccounts.length} contas vinculadas:*\n\n${accountList}\n\n📝 Envie o comando assim:\n*${cmdLine}*\n*NOME_DA_CONTA*\n\nExemplo:\n*${cmdLine}*\n*${multipleAccounts[0].nome_cliente}*`;
        
        await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, remoteJid, helpMsg);
        return new Response(JSON.stringify({ success: true, multiple_accounts: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // If no account found, check if this is the team group
    if (!account) {
      // Check system_settings for team group JID, with hardcoded fallback
      const HARDCODED_TEAM_GROUPS = ["120363419496533710@g.us"];
      
      const { data: teamSetting } = await supabase
        .from("system_settings")
        .select("value, enabled")
        .eq("key", "team_group_jid")
        .single();

      let teamGroupJids = [...HARDCODED_TEAM_GROUPS];
      if (teamSetting?.enabled && teamSetting.value) {
        const fromDb = teamSetting.value.split(",").map((s: string) => s.trim()).filter(Boolean);
        teamGroupJids = [...new Set([...teamGroupJids, ...fromDb])];
      }

      if (teamGroupJids.includes(remoteJid) || teamGroupJids.includes(groupNumber)) {
        isTeamGroup = true;
        console.log("[whatsapp-webhook] Team group detected:", remoteJid);

        // FIRST: For context-dependent commands (confirmations, shortcuts), resolve account from stored context
        const cmdLowerTeam = text.toLowerCase().trim();
        const isTeamContextCommand = 
          cmdLowerTeam === "#feedback sim" || cmdLowerTeam === "#feedback\nsim" ||
          cmdLowerTeam === "#feedback não" || cmdLowerTeam === "#feedback nao" ||
          cmdLowerTeam === "#feedback\nnão" || cmdLowerTeam === "#feedback\nnao" ||
          cmdLowerTeam === "#atualizar" ||
          cmdLowerTeam === "#sim" || cmdLowerTeam === "#todas" || cmdLowerTeam === "#todos" ||
          /^#\d+(\s+#?\d+)*$/.test(cmdLowerTeam);
        
        if (isTeamContextCommand) {
          const { data: ctxRows } = await supabase
            .from("whatsapp_chat_context")
            .select("account_id, context_type, created_at, context_data")
            .eq("group_jid", remoteJid)
            .in("context_type", ["feedback_confirm", "feedback_update", "campanhas"])
            .gte("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .limit(10);

          const matchedContext = getMatchingContextRow(ctxRows, senderJid, senderName);
          const ctxAccountId = matchedContext?.account_id;
          if (ctxAccountId) {
            const { data: ctxAccount } = await supabase
              .from("accounts")
              .select("id, nome_cliente, meta_account_id, cliente_id")
              .eq("id", ctxAccountId)
              .single();
            if (ctxAccount) {
              account = ctxAccount;
              console.log("[whatsapp-webhook] Team group resolved account from context:", ctxAccount.nome_cliente);
            }
          }
        }

        // SECOND: If no context match, extract account name from message lines
        if (!account) {
        // For team group, extract account name from message lines
        const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
        // First line is the command (e.g., #feedback), second line should be account name
        let accountName: string | null = null;
        
        if (lines.length >= 2) {
          const firstLine = lines[0].toLowerCase();
          // For commands that need an account name on the next line
          const commandsNeedingAccount = ["#feedback", "#followup", "#campanhas", "#saldo", "#gasto", "#leads", "#resumo", "#funil", "#comandos", "#ajuda", "#help"];
          const cmdMatch = commandsNeedingAccount.find(c => firstLine.startsWith(c));
          
          if (cmdMatch) {
            // Check if second line looks like an account name (not a funnel type or data)
            const secondLine = lines[1].trim();
            const funnelTypes = ["lancamento", "lançamento", "terceiros"];
            if (!secondLine.startsWith("#") && !funnelTypes.includes(secondLine.toLowerCase())) {
              accountName = secondLine;
            } else if (funnelTypes.includes(secondLine.toLowerCase()) && lines.length >= 3) {
              accountName = null;
            }
          } else {
            // Simple commands like #saldo - second line is account name
            accountName = lines[1].trim();
          }
        }

        if (!accountName) {
          // For simple single-word commands from team group, check if command has account inline
          const cmdParts = text.split(/\s+/);
          if (cmdParts.length >= 2 && ["#saldo", "#funil", "#resumo", "#leads"].includes(cmdParts[0].toLowerCase())) {
            accountName = cmdParts.slice(1).join(" ").trim();
          }
        }

        if (accountName) {
          // Look up account by name (case-insensitive)
          const { data: accByName } = await supabase
            .from("accounts")
            .select("id, nome_cliente, meta_account_id, cliente_id")
            .ilike("nome_cliente", accountName)
            .single();

          if (accByName) {
            account = accByName;
            console.log("[whatsapp-webhook] Team group resolved account:", accByName.nome_cliente);
          } else {
            // Try partial match
            const { data: accPartial } = await supabase
              .from("accounts")
              .select("id, nome_cliente, meta_account_id, cliente_id")
              .ilike("nome_cliente", `%${accountName}%`)
              .limit(1)
              .single();
            
            if (accPartial) {
              account = accPartial;
              console.log("[whatsapp-webhook] Team group resolved account (partial):", accPartial.nome_cliente);
            }
          }
        }
        } // end if (!account)

        if (!account) {
          // List available accounts for the user
          const { data: allAccounts } = await supabase
            .from("accounts")
            .select("nome_cliente")
            .eq("status", "Ativo")
            .order("nome_cliente")
            .limit(20);

          const accountList = (allAccounts || []).map((a: any, i: number) => `${i + 1}. ${a.nome_cliente}`).join("\n");
          
          const errorMsg = `❌ *Nome da conta não informado ou não encontrado!*\n\nNo grupo da equipe, informe o nome da conta na segunda linha:\n*#feedback*\n*NOME_DA_CONTA*\nterceiros\nreferente à campanha...\n\nContas disponíveis:\n${accountList}`;

          await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, remoteJid, errorMsg);
          return new Response(JSON.stringify({ success: true, team_group: true, error: "account not found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // For team group with account resolved via name (not context), remove the account name line
        if (!isTeamContextCommand) {
          const lines2 = text.split("\n");
          const firstLine2 = lines2[0];
          const restLines = lines2.slice(1);
          // Try to find and remove the account name line
          const accNameLower = account.nome_cliente.toLowerCase();
          const filteredLines = restLines.filter((l: string) => {
            const trimmed = l.trim().toLowerCase();
            return trimmed !== accNameLower && !accNameLower.includes(trimmed) && !trimmed.includes(accNameLower);
          });
          text = [firstLine2, ...filteredLines].join("\n");
        }
      } else {
        console.log("[whatsapp-webhook] No account linked to group:", groupNumber);
        return new Response(JSON.stringify({ ignored: true, reason: "no linked account" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return await processCommand(text, account, remoteJid, instanceName, evolutionUrl, evolutionKey, supabase, senderName, senderJid);
  } catch (err) {
    console.error("[whatsapp-webhook] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processCommand(
  text: string,
  account: { id: string; nome_cliente: string; meta_account_id: string | null },
  groupJid: string,
  instanceName: string,
  evolutionUrl: string,
  evolutionKey: string,
  supabase: any,
  senderName: string,
  senderJid: string
) {
  const cmd = text.toLowerCase().trim();
  let responseText = "";

  try {
    if (cmd.startsWith("#followup")) {
      responseText = await handleFollowup(text, account, groupJid, senderName, supabase);
    } else if (cmd === "#feedback sim" || cmd === "#feedback\nsim") {
      responseText = await handleFeedbackConfirm(account, groupJid, senderName, senderJid, supabase);
    } else if (cmd === "#feedback não" || cmd === "#feedback nao" || cmd === "#feedback\nnão" || cmd === "#feedback\nnao") {
      responseText = await handleFeedbackReject(account, groupJid, senderJid, senderName, supabase);
    } else if (cmd.startsWith("#feedback")) {
      responseText = await handleFeedback(text, account, groupJid, senderName, senderJid, supabase);
    } else if (cmd.startsWith("#saldo")) {
      responseText = await handleSaldo(account, supabase);
    } else if (cmd.startsWith("#gasto")) {
      responseText = await handleGasto(text, account, supabase);
    } else if (cmd === "#funil") {
      responseText = await handleFunil(account, supabase);
    } else if (cmd.startsWith("#campanhas")) {
      const periodArg = cmd.replace("#campanhas", "").trim();
      responseText = await handleCampanhas(account, supabase, periodArg || null, groupJid, instanceName, senderName, senderJid);
    } else if (cmd === "#relatorio") {
      return await handleRelatorioAll(account, groupJid, instanceName, evolutionUrl, evolutionKey, supabase);
    } else if (cmd === "#todas" || cmd === "#todos") {
      // Send detailed reports for all campaigns from context
      return await handleContextDetailAll(account, groupJid, instanceName, evolutionUrl, evolutionKey, supabase, senderJid, senderName);
    } else if (cmd === "#atualizar") {
      // User confirmed they want to update existing feedback
      responseText = await handleFeedbackUpdate(account, groupJid, senderName, senderJid, supabase);
    } else if (cmd === "#sim") {
      // User said "yes" to seeing detailed reports - ask which one
      responseText = await handleSimResponse(account, supabase, groupJid, senderJid, senderName);
    } else if (cmd.match(/^#\d+(\s+#?\d+)*$/)) {
      // Matches "#1", "#2", "#1 #3", "#1 2 3" etc.
      const numbers = cmd.match(/\d+/g)!.map(Number);
      return await handleContextDetailMultiple(account, numbers, groupJid, instanceName, evolutionUrl, evolutionKey, supabase, senderJid, senderName);
    } else if (cmd.startsWith("#campanha")) {
      const num = parseInt(cmd.replace("#campanha", "").trim());
      responseText = await handleCampanhaDetail(account, num, supabase);
    } else if (cmd === "#leads") {
      responseText = await handleLeads(account, supabase);
    } else if (cmd.startsWith("#leads")) {
      const campaignRef = cmd.replace("#leads", "").trim();
      responseText = await handleLeadsCampaign(account, campaignRef, supabase);
    } else if (cmd === "#resumo") {
      responseText = await handleResumo(account, supabase);
    } else if (cmd === "#ajuda" || cmd === "#help" || cmd === "#comandos") {
      responseText = getHelpText(account.nome_cliente);
    } else {
      responseText = `❓ Comando não reconhecido.\n\nDigite *#comandos* para ver todos os comandos disponíveis.`;
    }
  } catch (err) {
    console.error("[whatsapp-webhook] Command error:", err);
    responseText = `⚠️ Erro ao processar comando. Tente novamente.`;
  }

  await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, responseText);

  return new Response(JSON.stringify({ success: true, command: cmd }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

// ─── Feedback Parser ───

function parseFeedbackText(text: string): {
  data_referencia: string | null;
  leads_gerados: number;
  conversa_iniciada: number;
  lead_qualificado: number;
  em_atendimento: number;
  perdido: number;
  visita: number;
  venda: number;
} {
  const result = {
    data_referencia: null as string | null,
    leads_gerados: 0,
    conversa_iniciada: 0,
    lead_qualificado: 0,
    em_atendimento: 0,
    perdido: 0,
    visita: 0,
    venda: 0,
  };

  // Extract date - formats: dd/mm, dd/mm/yyyy, dd/mm/yy
  const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]);
    const yearStr = dateMatch[3];
    const nowBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    let year = nowBRT.getFullYear();
    if (yearStr) {
      year = yearStr.length === 2 ? 2000 + parseInt(yearStr) : parseInt(yearStr);
    }
    result.data_referencia = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const lower = text.toLowerCase();

  // Pattern: look for numbers near keywords
  // Split into lines for better parsing
  const lines = lower.split(/[\n,;.]+/);

  for (const line of lines) {
    const numbersInLine = line.match(/\d+/g);
    if (!numbersInLine) continue;

    for (const numStr of numbersInLine) {
      const num = parseInt(numStr);
      if (num > 9999) continue; // skip dates/IDs

      // Check context around the number
      if (matchKeyword(line, ["lead", "leads", "recebi", "recebemos", "gerado", "gerados", "geramos"])) {
        if (result.leads_gerados === 0) result.leads_gerados = num;
      }
      if (matchKeyword(line, ["conversa iniciada", "conversas iniciadas", "contato", "contatamos", "entramos em contato", "contato novamente"])) {
        if (result.conversa_iniciada === 0) result.conversa_iniciada = num;
      }
      if (matchKeyword(line, ["qualificou", "qualificaram", "qualificado", "qualificados", "qualifica"])) {
        if (result.lead_qualificado === 0) result.lead_qualificado = num;
      }
      if (matchKeyword(line, ["atendimento", "atendendo", "aguardando", "retorno", "em andamento"])) {
        if (result.em_atendimento === 0) result.em_atendimento = num;
      }
      if (matchKeyword(line, ["perdido", "perdidos", "não deu", "nao deu", "desistiu", "desistiram", "sem andamento", "não andamento", "nao andamento"])) {
        if (result.perdido === 0) result.perdido = num;
      }
      if (matchKeyword(line, ["visita", "visitas", "visitou", "visitaram", "agendada", "agendadas"])) {
        if (result.visita === 0) result.visita = num;
      }
      if (matchKeyword(line, ["venda", "vendas", "vendeu", "venderam", "fechou", "fecharam", "comprar", "comprou"])) {
        if (result.venda === 0) result.venda = num;
      }
    }
  }

  return result;
}

function matchKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

async function handleFeedback(
  text: string,
  account: any,
  groupJid: string,
  senderName: string,
  senderJid: string,
  supabase: any
): Promise<string> {
  const feedbackBody = text.replace(/^#feedback\s*/i, "").trim();

  if (!feedbackBody || feedbackBody.length < 5) {
    return `⚠️ *Feedback vazio!*\n\nEnvie no formato:\n*#feedback*\n4 leads recebidos\n2 em atendimento\n1 descartado\n1 sem resposta\n\nOu com campanhas:\n*#feedback*\nterceiros\nreferente à campanha REF47\nrecebidos 2\natendimento SDR 2\n\nDigite *#ajuda* para mais informações.`;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // 1. Parse feedback in dry_run mode (no saving)
    const feedbackResponse = await fetch(`${supabaseUrl}/functions/v1/process-feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        mensagem_original: text,
        account_id: account.id,
        id_grupo: groupJid,
        numero_grupo: groupJid,
        telefone_origem: null,
        nome_origem: senderName,
        usuario_origem: senderName,
        dry_run: true,
      }),
    });

    const feedbackResult = await feedbackResponse.json();

    if (!feedbackResponse.ok || !feedbackResult.success) {
      console.error("[whatsapp-webhook] process-feedback error:", feedbackResult);
      return `⚠️ Erro ao processar feedback: ${feedbackResult.error || "erro desconhecido"}`;
    }

    if (feedbackResult.duplicado) {
      return `⚠️ Essa mensagem já foi processada anteriormente.`;
    }

    if (feedbackResult.invalid_funnel) {
      const totals = feedbackResult.totals || {};
      let invalidMsg = `⚠️ *O feedback não foi salvo porque o funil não bate com os recebidos.*\n`;
      invalidMsg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      invalidMsg += `👤 Enviado por: *${senderName}*\n`;
      invalidMsg += `🏢 Conta: *${account.nome_cliente}*\n`;

      if (feedbackResult.data_inicio && feedbackResult.data_fim) {
        const invalidPeriodLabel = feedbackResult.data_inicio === feedbackResult.data_fim
          ? feedbackResult.data_inicio.split('-').reverse().join('/')
          : `${feedbackResult.data_inicio.split('-').reverse().join('/')} a ${feedbackResult.data_fim.split('-').reverse().join('/')}`;
        invalidMsg += `📅 Período: *${invalidPeriodLabel}*\n`;
      }

      invalidMsg += `\n📊 *Resumo informado:*\n`;
      invalidMsg += `• Recebidos: *${totals.recebidos || 0}*\n`;
      invalidMsg += `• No funil: *${totals.no_funil || 0}*\n`;
      invalidMsg += `• Atendimento SDR: *${totals.atendimento || 0}*\n`;
      invalidMsg += `• Passou para corretor: *${totals.passou_corretor || 0}*\n`;
      invalidMsg += `• Visita: *${totals.visita || 0}*\n`;
      invalidMsg += `• Proposta: *${totals.proposta || 0}*\n`;
      invalidMsg += `• Venda: *${totals.venda || 0}*\n`;
      invalidMsg += `• Descartado: *${totals.descartado || 0}*\n`;
      invalidMsg += `• Não recebidos (não chegaram via WhatsApp): *${totals.nao_recebido || 0}*\n`;

      if (feedbackResult.campanhas && Array.isArray(feedbackResult.campanhas)) {
        invalidMsg += `\n📌 *Por campanha:*\n`;
        for (const c of feedbackResult.campanhas) {
          const noFunil = (c.descartado || 0) + (c.atendimento || 0) + (c.passou_corretor || 0) + (c.visita || 0) + (c.proposta || 0) + (c.venda || 0) + (c.nao_recebido || 0);
          invalidMsg += `• ${c.nome}: recebidos *${c.recebidos || 0}* / no funil *${noFunil}*\n`;
        }
      }

      invalidMsg += `\n❓ *Se teve ${totals.recebidos || 0} recebidos, o funil abaixo também precisa fechar ${totals.recebidos || 0}.*\n`;
      invalidMsg += `💡 _Dica: se algum lead clicou no anúncio mas não enviou mensagem, informe como "não recebido" ou "não chegou"._\n`;
      invalidMsg += `Revise e envie novamente com a distribuição correta.`;
      return invalidMsg;
    }

    // === Handle existing feedback for same day ===
    if (feedbackResult.existing_feedback) {
      // Store context for update flow
      try {
        await supabase.from('whatsapp_chat_context').upsert({
          group_jid: groupJid,
          account_id: account.id,
          context_type: 'feedback_update',
          context_data: {
            original_message: text,
            sender_name: senderName,
            sender_jid: senderJid,
            existing_data: feedbackResult.existing_data,
            new_parsed: feedbackResult.new_parsed,
            data_inicio: feedbackResult.data_inicio,
            data_fim: feedbackResult.data_fim,
          },
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        }, { onConflict: 'group_jid,account_id,context_type' });
      } catch (ctxErr) {
        console.warn('[whatsapp-webhook] Failed to save feedback update context:', ctxErr);
      }

      const periodLabel = feedbackResult.data_inicio === feedbackResult.data_fim
        ? feedbackResult.data_inicio.split('-').reverse().join('/')
        : `${feedbackResult.data_inicio.split('-').reverse().join('/')} a ${feedbackResult.data_fim.split('-').reverse().join('/')}`;

      let existingMsg = `⚠️ *Já existe feedback para ${periodLabel}!*\n\n`;
      existingMsg += `📊 *Dados atuais no funil:*\n`;

      const etapaLabels: Record<string, string> = {
        quantidade_recebida: "Recebidos",
        quantidade_descartado: "Descartados",
        quantidade_aguardando_retorno: "Atendimento SDR",
        quantidade_atendimento: "Atendimento SDR",
        quantidade_passou_corretor: "Passou p/ Corretor",
        quantidade_visita: "Visita",
        quantidade_proposta: "Proposta",
        quantidade_venda: "Venda",
      };

      for (const row of feedbackResult.existing_data) {
        existingMsg += `\n📌 *${row.campanha_nome}* (${row.data_referencia}):\n`;
        for (const [field, label] of Object.entries(etapaLabels)) {
          const val = row[field];
          if (val != null && val > 0) {
            existingMsg += `   • ${label}: *${val}*\n`;
          }
        }
      }

      existingMsg += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
      existingMsg += `🔄 *Deseja substituir esses dados pelo novo feedback?*\n\n`;
      existingMsg += `⚠️ _Etapas avançadas (Corretor, Visita, Proposta, Venda) não podem ser reduzidas._\n\n`;
      existingMsg += `Envie *#atualizar* para confirmar a substituição.\n`;
      existingMsg += `Ou envie outro comando para cancelar.`;

      return existingMsg;
    }

    // 2. Build preview message
    const periodoDetectado = feedbackResult.periodo_detectado === true;
    const dataInicio = feedbackResult.data_inicio;
    const dataFim = feedbackResult.data_fim;

    const periodLabel = dataInicio === dataFim
      ? dataInicio.split('-').reverse().join('/')
      : `${dataInicio.split('-').reverse().join('/')} a ${dataFim.split('-').reverse().join('/')}`;

    let msg = `📋 *Resumo do Feedback (aguardando confirmação)*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 Enviado por: *${senderName}*\n`;
    msg += `🏢 Conta: *${account.nome_cliente}*\n`;
    msg += `📅 Período: *${periodLabel}*${!periodoDetectado ? ' _(padrão)_' : ''}\n`;

    if (feedbackResult.campanhas_count > 0 && feedbackResult.campanhas && Array.isArray(feedbackResult.campanhas)) {
      // Group campaigns by tipo_funil
      const lancCamps = feedbackResult.campanhas.filter((c: any) => (c.tipo_funil || feedbackResult.tipo_funil) === "lancamento");
      const tercCamps = feedbackResult.campanhas.filter((c: any) => (c.tipo_funil || feedbackResult.tipo_funil) === "terceiros");
      const isMixed = lancCamps.length > 0 && tercCamps.length > 0;

      if (isMixed) {
        msg += `\n📋 *Funil misto detectado (Lançamento + Terceiros)*\n`;
      } else if (feedbackResult.tipo_funil) {
        msg += `📋 Tipo: *${feedbackResult.tipo_funil === "terceiros" ? "Terceiros" : "Lançamento"}*\n`;
      }

      const formatCampaignGroup = (camps: any[], label: string) => {
        if (camps.length === 0) return "";
        let section = `\n📊 *${label} (${camps.length} campanha${camps.length > 1 ? 's' : ''}):*\n`;
        for (const c of camps) {
          const stages: string[] = [];
          if (c.descartado) stages.push(`${c.descartado} descartado(s)`);
          if (c.atendimento) stages.push(`${c.atendimento} em atendimento SDR`);
          if (c.passou_corretor) stages.push(`${c.passou_corretor} passou para corretor`);
          if (c.visita) stages.push(`${c.visita} visita(s)`);
          if (c.proposta) stages.push(`${c.proposta} proposta(s)`);
          if (c.venda) stages.push(`${c.venda} venda(s)`);

          section += `   • ${c.nome} — ${c.recebidos || 0} recebidos`;
          if (stages.length > 0) {
            section += ` sendo:\n`;
            for (const s of stages) {
              section += `${s}\n`;
            }
          } else {
            section += `\n`;
          }
        }
        return section;
      };

      if (isMixed) {
        msg += formatCampaignGroup(lancCamps, "🏗️ Lançamento");
        msg += formatCampaignGroup(tercCamps, "🏘️ Terceiros");
      } else {
        msg += formatCampaignGroup(feedbackResult.campanhas, `${feedbackResult.campanhas_count} campanha(s)`);
      }
    }

    if (!periodoDetectado) {
      msg += `\n⚠️ *Período não informado!* Registraremos como *ontem* por padrão.\n`;
    }

    msg += `\n*Confere para registrar o Feedback?*\n`;
    msg += `Envie *#feedback sim* para confirmar\n`;
    msg += `Envie *#feedback não* para cancelar e corrigir\n`;

    msg += `\n💡 Use *#funil* para ver o funil consolidado.`;

    // 3. Store context for confirmation
    try {
      await supabase.from('whatsapp_chat_context').upsert({
        group_jid: groupJid,
        account_id: account.id,
        context_type: 'feedback_confirm',
        context_data: {
          original_message: text,
          sender_name: senderName,
            sender_jid: senderJid,
          parsed_result: feedbackResult,
        },
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }, { onConflict: 'group_jid,account_id,context_type' });
    } catch (ctxErr) {
      console.warn('[whatsapp-webhook] Failed to save feedback confirm context:', ctxErr);
    }

    return msg;
  } catch (err) {
    console.error("[whatsapp-webhook] Feedback processing error:", err);
    return `⚠️ Erro ao processar feedback. Tente novamente.`;
  }
}

// ─── Feedback Confirm Handler ───

async function handleFeedbackConfirm(
  account: any,
  groupJid: string,
  senderName: string,
  senderJid: string,
  supabase: any
): Promise<string> {
  try {
    // Get stored context
    const { data: ctxRows } = await supabase
      .from('whatsapp_chat_context')
      .select('id, context_data, created_at')
      .eq('group_jid', groupJid)
      .eq('account_id', account.id)
      .eq('context_type', 'feedback_confirm')
      .order('created_at', { ascending: false })
      .limit(5);

    const ctxData = getMatchingContextRow(ctxRows, senderJid, senderName);

    if (!ctxData?.context_data?.original_message) {
      return `⚠️ Nenhum feedback pendente de confirmação. Envie *#feedback* com os dados primeiro.`;
    }

    const ctx = ctxData.context_data;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Call process-feedback for real (without dry_run)
    const feedbackResponse = await fetch(`${supabaseUrl}/functions/v1/process-feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        mensagem_original: ctx.original_message,
        account_id: account.id,
        id_grupo: groupJid,
        numero_grupo: groupJid,
        telefone_origem: null,
        nome_origem: ctx.sender_name || senderName,
        usuario_origem: ctx.sender_name || senderName,
      }),
    });

    const feedbackResult = await feedbackResponse.json();

    // Clean up context
    if (ctxData?.id) {
      await supabase.from('whatsapp_chat_context').delete().eq('id', ctxData.id);
    }

    if (!feedbackResponse.ok || !feedbackResult.success) {
      return `⚠️ Erro ao salvar feedback: ${feedbackResult.error || "erro desconhecido"}`;
    }

    // Also process individual leads via process-followup
    try {
      await fetch(`${supabaseUrl}/functions/v1/process-followup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          mensagem_original: ctx.original_message,
          account_id: account.id,
          cliente_id: account.cliente_id || null,
          id_grupo: groupJid,
          numero_grupo: groupJid,
          telefone_origem: null,
          nome_origem: ctx.sender_name || senderName,
          usuario_origem: ctx.sender_name || senderName,
        }),
      });
    } catch (e) {
      console.error("[whatsapp-webhook] followup from confirmed feedback error:", e);
    }

    // Build success message
    const dataInicio = feedbackResult.data_inicio;
    const dataFim = feedbackResult.data_fim;
    const periodLabel = dataInicio === dataFim
      ? dataInicio.split('-').reverse().join('/')
      : `${dataInicio.split('-').reverse().join('/')} a ${dataFim.split('-').reverse().join('/')}`;

    let msg = `✅ *Feedback registrado com sucesso!*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 Enviado por: *${ctx.sender_name || senderName}*\n`;
    msg += `🏢 Conta: *${account.nome_cliente}*\n`;
    msg += `📅 Período: *${periodLabel}*\n`;

    if (feedbackResult.campanhas && Array.isArray(feedbackResult.campanhas)) {
      // Group by tipo_funil for display
      const lancCamps = feedbackResult.campanhas.filter((c: any) => (c.tipo_funil || feedbackResult.tipo_funil) === "lancamento");
      const tercCamps = feedbackResult.campanhas.filter((c: any) => (c.tipo_funil || feedbackResult.tipo_funil) === "terceiros");
      const isMixed = lancCamps.length > 0 && tercCamps.length > 0;

      if (isMixed) {
        msg += `\n📋 *Registrado como funil misto (Lançamento + Terceiros)*\n`;
      } else if (feedbackResult.tipo_funil) {
        msg += `📋 Tipo: *${feedbackResult.tipo_funil === "terceiros" ? "Terceiros" : "Lançamento"}*\n`;
      }

      const formatGroup = (camps: any[], label: string) => {
        if (camps.length === 0) return "";
        let section = `\n📊 *${label}:*\n`;
        for (const c of camps) {
          const stages: string[] = [];
          if (c.descartado) stages.push(`${c.descartado} descartado(s)`);
          if (c.atendimento) stages.push(`${c.atendimento} em atendimento SDR`);
          if (c.passou_corretor) stages.push(`${c.passou_corretor} passou para corretor`);
          if (c.visita) stages.push(`${c.visita} visita(s)`);
          if (c.proposta) stages.push(`${c.proposta} proposta(s)`);
          if (c.venda) stages.push(`${c.venda} venda(s)`);

          section += `   • ${c.nome} — ${c.recebidos || 0} recebidos`;
          if (stages.length > 0) {
            section += ` sendo:\n`;
            for (const s of stages) {
              section += `${s}\n`;
            }
          } else {
            section += `\n`;
          }
        }
        return section;
      };

      if (isMixed) {
        msg += formatGroup(lancCamps, "🏗️ Lançamento");
        msg += formatGroup(tercCamps, "🏘️ Terceiros");
      } else {
        msg += `\n📊 *${feedbackResult.campanhas_count} campanha(s) registrada(s):*\n`;
        for (const c of feedbackResult.campanhas) {
          const stages: string[] = [];
          if (c.descartado) stages.push(`${c.descartado} descartado(s)`);
          if (c.atendimento) stages.push(`${c.atendimento} em atendimento SDR`);
          if (c.passou_corretor) stages.push(`${c.passou_corretor} passou para corretor`);
          if (c.visita) stages.push(`${c.visita} visita(s)`);
          if (c.proposta) stages.push(`${c.proposta} proposta(s)`);
          if (c.venda) stages.push(`${c.venda} venda(s)`);

          msg += `   • ${c.nome} — ${c.recebidos || 0} recebidos`;
          if (stages.length > 0) {
            msg += ` sendo:\n`;
            for (const s of stages) {
              msg += `${s}\n`;
            }
          } else {
            msg += `\n`;
          }
        }
      }
    }

    msg += `\n💡 Use *#funil* para ver o funil consolidado.`;
    return msg;
  } catch (err) {
    console.error("[whatsapp-webhook] Feedback confirm error:", err);
    return `⚠️ Erro ao confirmar feedback. Tente novamente.`;
  }
}

// ─── Feedback Reject Handler ───

async function handleFeedbackReject(
  account: any,
  groupJid: string,
  senderJid: string,
  senderName: string,
  supabase: any
): Promise<string> {
  const { data: ctxRows } = await supabase
    .from('whatsapp_chat_context')
    .select('id, context_data, created_at')
    .eq('group_jid', groupJid)
    .eq('account_id', account.id)
    .eq('context_type', 'feedback_confirm')
    .order('created_at', { ascending: false })
    .limit(5);

  const ctxData = getMatchingContextRow(ctxRows, senderJid, senderName);

  if (!ctxData?.id) {
    return `⚠️ Nenhum feedback pendente de confirmação para cancelar.`;
  }

  await supabase.from('whatsapp_chat_context').delete().eq('id', ctxData.id);

  return `❌ *Feedback cancelado.*\n\nEnvie novamente *#feedback* com os dados corretos.`;
}

// ─── Feedback Update Handler ───

async function handleFeedbackUpdate(
  account: any,
  groupJid: string,
  senderName: string,
  senderJid: string,
  supabase: any
): Promise<string> {
  try {
    // Get the stored context
    const { data: ctxRows } = await supabase
      .from('whatsapp_chat_context')
      .select('id, context_data, created_at')
      .eq('group_jid', groupJid)
      .eq('account_id', account.id)
      .eq('context_type', 'feedback_update')
      .order('created_at', { ascending: false })
      .limit(5);

    const ctxData = getMatchingContextRow(ctxRows, senderJid, senderName);

    if (!ctxData?.context_data) {
      return `ℹ️ Nenhum feedback pendente de atualização.\n\nEnvie *#feedback* seguido do relatório para registrar.`;
    }

    const ctx = ctxData.context_data;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Re-send the original message with force_update = true
    const feedbackResponse = await fetch(`${supabaseUrl}/functions/v1/process-feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        mensagem_original: ctx.original_message,
        account_id: account.id,
        id_grupo: groupJid,
        numero_grupo: groupJid,
        telefone_origem: null,
        nome_origem: ctx.sender_name || senderName,
        usuario_origem: ctx.sender_name || senderName,
        force_update: true,
      }),
    });

    const feedbackResult = await feedbackResponse.json();

    // Clean up context
    if (ctxData?.id) {
      await supabase.from('whatsapp_chat_context').delete().eq('id', ctxData.id);
    }

    if (!feedbackResponse.ok || !feedbackResult.success) {
      return `⚠️ Erro ao atualizar feedback: ${feedbackResult.error || "erro desconhecido"}`;
    }

    let msg = `✅ *Feedback atualizado com sucesso!*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🏢 Conta: *${account.nome_cliente}*\n`;

    const periodLabel = feedbackResult.data_inicio === feedbackResult.data_fim
      ? feedbackResult.data_inicio?.split('-').reverse().join('/')
      : `${feedbackResult.data_inicio?.split('-').reverse().join('/')} a ${feedbackResult.data_fim?.split('-').reverse().join('/')}`;

    msg += `📅 Período: *${periodLabel}*\n`;

    if (feedbackResult.campanhas_count > 0) {
      msg += `\n📊 *${feedbackResult.campanhas_count} campanha(s) atualizada(s):*\n`;
      if (feedbackResult.campanhas && Array.isArray(feedbackResult.campanhas)) {
        for (const c of feedbackResult.campanhas) {
          msg += `   • ${c.nome}${c.recebidos ? ` — ${c.recebidos} recebidos` : ""}\n`;
        }
      }
    }

    if (feedbackResult.meta_total_leads != null) {
      msg += `\n📈 Total de Leads (Meta): *${feedbackResult.meta_total_leads}*\n`;
    }

    msg += `\n💡 Use *#funil* para ver o funil consolidado.`;
    return msg;
  } catch (err) {
    console.error("[whatsapp-webhook] Feedback update error:", err);
    return `⚠️ Erro ao atualizar feedback. Tente novamente.`;
  }
}

async function handleFunil(account: any, supabase: any): Promise<string> {
  const thirtyDaysAgo = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Query feedback_funnel (individual leads) using created_at
  const { data: funnelLeads } = await supabase
    .from("feedback_funnel")
    .select("etapa_funil, temperatura_lead, lead_nome, resumo, created_at, nome_origem, duplicado")
    .eq("account_id", account.id)
    .eq("duplicado", false)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  // Also get aggregate feedback from feedback_campanha
  const { data: campFeedbacks } = await supabase
    .from("feedback_campanha")
    .select("campanha_nome, quantidade_recebida, quantidade_descartado, quantidade_aguardando_retorno, quantidade_atendimento, quantidade_visita, quantidade_proposta, quantidade_venda, data_referencia, processamento_status")
    .eq("account_id", account.id)
    .eq("processamento_status", "processado")
    .gte("data_referencia", thirtyDaysAgo.toISOString().split("T")[0])
    .order("data_referencia", { ascending: false });

  const hasLeads = funnelLeads && funnelLeads.length > 0;
  const hasCampFeedback = campFeedbacks && campFeedbacks.length > 0;

  if (!hasLeads && !hasCampFeedback) {
    return `📊 *Funil - ${account.nome_cliente}*\n\nNenhum feedback registrado nos últimos 30 dias.\n\nEnvie *#feedback* seguido do relatório para registrar.`;
  }

  let msg = `📊 *Funil de Vendas - ${account.nome_cliente}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;

  // Section 1: Individual leads from feedback_funnel
  if (hasLeads) {
    const etapaCounts: Record<string, number> = {};
    const tempCounts: Record<string, number> = {};
    for (const lead of funnelLeads) {
      const etapa = lead.etapa_funil || "lead_novo";
      etapaCounts[etapa] = (etapaCounts[etapa] || 0) + 1;
      if (lead.temperatura_lead) {
        tempCounts[lead.temperatura_lead] = (tempCounts[lead.temperatura_lead] || 0) + 1;
      }
    }

    msg += `\n👥 *Leads Individuais* (${funnelLeads.length} registros)\n`;
    msg += `┌─────────────────────────\n`;
    const etapaLabels: Record<string, string> = {
      lead_novo: "🆕 Novos",
      contato_iniciado: "💬 Contato Iniciado",
      sem_resposta: "📵 Sem Resposta",
      atendimento: "🔄 Em Atendimento",
      visita_agendada: "📅 Visita Agendada",
      visita_realizada: "🏠 Visita Realizada",
      proposta: "📝 Proposta",
      venda: "🎉 Venda",
      perdido: "❌ Perdido",
    };
    for (const [etapa, label] of Object.entries(etapaLabels)) {
      if (etapaCounts[etapa]) {
        msg += `│ ${label}: *${etapaCounts[etapa]}*\n`;
      }
    }
    msg += `└─────────────────────────\n`;

    if (Object.keys(tempCounts).length > 0) {
      msg += `\n🌡️ *Temperatura:* `;
      const parts: string[] = [];
      if (tempCounts.quente) parts.push(`🔴 Quentes: ${tempCounts.quente}`);
      if (tempCounts.morno) parts.push(`🟡 Mornos: ${tempCounts.morno}`);
      if (tempCounts.frio) parts.push(`🔵 Frios: ${tempCounts.frio}`);
      msg += parts.join("  |  ") + "\n";
    }

    // Last 5 leads
    msg += `\n📋 *Últimos leads:*\n`;
    funnelLeads.slice(0, 5).forEach((f: any) => {
      const date = formatDateBR(f.created_at?.split("T")[0]);
      const tempIcon = f.temperatura_lead === "quente" ? "🔴" : f.temperatura_lead === "morno" ? "🟡" : "🔵";
      msg += `   ${date} ${tempIcon} ${f.lead_nome || "—"}: ${f.resumo?.slice(0, 50) || "—"}\n`;
    });
  }

  // Section 2: Aggregate campaign feedback
  if (hasCampFeedback) {
    const totals = campFeedbacks.reduce((acc: any, f: any) => ({
      recebidos: acc.recebidos + (f.quantidade_recebida || 0),
      descartados: acc.descartados + (f.quantidade_descartado || 0),
      atendimento: acc.atendimento + (f.quantidade_atendimento || 0),
      visitas: acc.visitas + (f.quantidade_visita || 0),
      propostas: acc.propostas + (f.quantidade_proposta || 0),
      vendas: acc.vendas + (f.quantidade_venda || 0),
    }), { recebidos: 0, descartados: 0, atendimento: 0, visitas: 0, propostas: 0, vendas: 0 });

    msg += `\n📊 *Feedback de Campanhas* (${campFeedbacks.length} registros)\n`;
    msg += `┌─────────────────────────\n`;
    if (totals.recebidos) msg += `│ 👥 Recebidos: *${totals.recebidos}*\n`;
    if (totals.atendimento) msg += `│ 🔄 Em Atendimento: *${totals.atendimento}*\n`;
    if (totals.descartados) msg += `│ ❌ Descartados: *${totals.descartados}*\n`;
    if (totals.visitas) msg += `│ 🏠 Visitas: *${totals.visitas}*\n`;
    if (totals.propostas) msg += `│ 📝 Propostas: *${totals.propostas}*\n`;
    if (totals.vendas) msg += `│ 🎉 Vendas: *${totals.vendas}*\n`;
    msg += `└─────────────────────────\n`;

    if (totals.recebidos > 0) {
      const convRate = ((totals.vendas / totals.recebidos) * 100).toFixed(1);
      msg += `📈 Taxa de conversão: *${convRate}%*\n`;
    }
  }

  // Meta Ads comparison
  let metaLeads = 0;
  if (account.meta_account_id) {
    const { data: campaigns } = await supabase
      .from("meta_campaigns")
      .select("leads")
      .eq("account_id", account.meta_account_id);
    if (campaigns) {
      metaLeads = campaigns.reduce((s: number, c: any) => s + (c.leads || 0), 0);
    }
  }
  if (metaLeads > 0) {
    msg += `\n📢 Leads Meta Ads (total): *${metaLeads}*\n`;
  }

  return msg;
}

// ─── Existing Command Handlers ───

async function fetchMetaCampaignInsights(
  metaAccountId: string,
  accessToken: string,
  since?: string,
  until?: string,
  statusFilter: string[] = ["ACTIVE", "PAUSED"]
): Promise<any[]> {
  const formattedId = metaAccountId.startsWith('act_') ? metaAccountId : `act_${metaAccountId}`;
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const sinceDate = since || todayStr;
  const untilDate = until || todayStr;
  const filterJson = JSON.stringify(statusFilter.map(s => s));

  const url = `https://graph.facebook.com/v21.0/${formattedId}/campaigns?fields=name,status,insights.time_range({"since":"${sinceDate}","until":"${untilDate}"}){spend,impressions,reach,clicks,cpm,ctr,actions}&filtering=[{"field":"effective_status","operator":"IN","value":${filterJson}}]&limit=100&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    console.error('[whatsapp-webhook] Meta campaigns API error:', errText.slice(0, 300));
    throw new Error('Erro ao consultar campanhas no Meta');
  }

  const result = await res.json();
  return result.data || [];
}

function buildCampaignReport(
  accountName: string,
  campaign: any,
  dateStr: string
): string {
  const insights = campaign.insights?.data?.[0];
  const spend = insights ? parseFloat(insights.spend || '0') : 0;
  const impressions = insights ? parseInt(insights.impressions || '0') : 0;
  const reach = insights ? parseInt(insights.reach || '0') : 0;
  const clicks = insights ? parseInt(insights.clicks || '0') : 0;
  const ctr = insights ? parseFloat(insights.ctr || '0') : 0;
  const cpm = insights ? parseFloat(insights.cpm || '0') : 0;

  // Extract leads from actions
  let leads = 0;
  let leadType = '';
  let followers = 0;
  if (insights?.actions) {
    for (const action of insights.actions) {
      if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
        leads += parseInt(action.value || '0');
        leadType = 'Mensagens (WhatsApp)';
      } else if (action.action_type === 'lead') {
        leads += parseInt(action.value || '0');
        leadType = leadType || 'Formulário';
      } else if (action.action_type === 'like' || action.action_type === 'page_like') {
        followers += parseInt(action.value || '0');
      }
    }
  }

  const fmtCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
  const costPerLead = leads > 0 ? spend / leads : 0;

  let msg = `📊 *RELATÓRIO DE CAMPANHA*\n`;
  msg += `   Conta de Anúncio: ${accountName}\n`;
  msg += `📅 Data: ${dateStr}\n\n`;
  msg += `⚙️ *CAMPANHA:*\n`;
  msg += `   ${campaign.name}\n\n`;
  msg += `💲 *INVESTIMENTO & RESULTADOS:*\n`;
  msg += `  · Gasto: ${fmtCurrency(spend)}\n`;
  msg += `  · Mensagens: ${leads}\n`;
  msg += `  · Custo por Mensagens: ${fmtCurrency(costPerLead)}\n`;
  msg += `  · Alcance: ${reach.toLocaleString('pt-BR')}\n`;
  msg += `  · Cliques no link: ${clicks.toLocaleString('pt-BR')}\n`;
  msg += `  · CTR: ${ctr.toFixed(2)}%\n`;
  msg += `  · CPM: ${fmtCurrency(cpm)}\n`;
  msg += `  · Seguidores: ${followers > 0 ? followers.toLocaleString('pt-BR') : '0'}`;

  if (leads > 0) {
    msg += `\n\n📊 *DETALHES DE CONVERSÃO:*\n`;
    msg += `  · ${leadType}: ${leads}\n\n`;
    msg += `❓ *Como está a qualificação desses leads?*`;
  }

  return msg;
}

async function handleCampanhas(account: any, supabase: any, periodArg: string | null = null, groupJid: string = '', instanceName: string = '', senderName: string = '', senderJid: string = ''): Promise<string> {
  if (!account.meta_account_id) {
    return `⚠️ *${account.nome_cliente}*\nConta sem Meta Ads configurado.`;
  }

  const accessToken = Deno.env.get('META_ACCESS_TOKEN');
  if (!accessToken) {
    return `⚠️ Token do Meta não configurado.`;
  }

  try {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    let since: string | undefined;
    let until: string | undefined;
    let periodLabel = 'Hoje';
    let statusFilter = ["ACTIVE"];

    if (periodArg) {
      const parsed = parsePeriodArg(periodArg);
      if (parsed) {
        since = parsed.since;
        until = parsed.until;
        periodLabel = parsed.label;
        statusFilter = ["ACTIVE", "PAUSED", "ARCHIVED"];
      }
    }

    const campaigns = await fetchMetaCampaignInsights(account.meta_account_id, accessToken, since, until, statusFilter);

    // Filter: only campaigns with spend > 0 or impressions > 0
    const activeCampaigns = campaigns.filter((c: any) => {
      const insights = c.insights?.data?.[0];
      if (!insights) return false;
      const spend = parseFloat(insights.spend || '0');
      const impressions = parseInt(insights.impressions || '0');
      return spend > 0 || impressions > 0;
    });

    if (activeCampaigns.length === 0) {
      return `📊 *${account.nome_cliente}*\n📅 ${periodLabel}\n\nNenhuma campanha ativa com veiculação neste período.\n\n💡 Use *#campanhas 7* para ver últimos 7 dias\n💡 Use *#campanhas março* para ver um mês específico`;
    }

    // Sort by spend descending
    activeCampaigns.sort((a: any, b: any) => {
      const spendA = a.insights?.data?.[0] ? parseFloat(a.insights.data[0].spend || '0') : 0;
      const spendB = b.insights?.data?.[0] ? parseFloat(b.insights.data[0].spend || '0') : 0;
      return spendB - spendA;
    });

    const fmtCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

    let totalSpend = 0;
    let totalLeads = 0;

    // Save campaign names and period to context for conversational follow-up
    const campaignList = activeCampaigns.map((c: any, i: number) => ({
      index: i + 1,
      id: c.id,
      name: c.name,
    }));

    // Store context in DB
    if (groupJid) {
      try {
        await supabase.from('whatsapp_chat_context').upsert({
          group_jid: groupJid,
          account_id: account.id,
          context_type: 'campanhas',
          context_data: {
            sender_name: senderName,
            sender_jid: senderJid,
            campaigns: campaignList,
            since: since || null,
            until: until || null,
            period_label: periodLabel,
            status_filter: statusFilter,
          },
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        }, { onConflict: 'group_jid,account_id,context_type' });
      } catch (ctxErr) {
        console.warn('[whatsapp-webhook] Failed to save context:', ctxErr);
      }
    }

    let msg = `📊 *Campanhas - ${account.nome_cliente}*\n`;
    msg += `📅 ${periodLabel}\n`;
    msg += `✅ ${activeCampaigns.length} campanha(s) com veiculação\n\n`;

    activeCampaigns.forEach((c: any, i: number) => {
      const insights = c.insights?.data?.[0];
      const spend = insights ? parseFloat(insights.spend || '0') : 0;

      let leads = 0;
      if (insights?.actions) {
        for (const action of insights.actions) {
          if (action.action_type === 'lead' || action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
            leads += parseInt(action.value || '0');
          }
        }
      }

      totalSpend += spend;
      totalLeads += leads;

      const cpl = leads > 0 ? fmtCurrency(spend / leads) : 'N/A';
      msg += `*${i + 1}.* ${c.name}\n`;
      msg += `   💰 ${fmtCurrency(spend)} | 👥 ${leads} leads | CPL: ${cpl}\n\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *Total:* ${fmtCurrency(totalSpend)} | 👥 *${totalLeads} leads*\n\n`;
    msg += `📋 *Quer ver o relatório detalhado de alguma campanha?*\n`;
    msg += `Envie *#1*, *#2*... ou *#todas* para ver todas.`;

    return msg;
  } catch (err) {
    console.error('[whatsapp-webhook] #campanhas error:', err);
    return `⚠️ Erro ao consultar campanhas. Tente novamente.`;
  }
}

// ─── Context-based Conversational Handlers ───

async function getActiveContext(supabase: any, groupJid: string, accountId: string, senderJid: string, senderName?: string): Promise<any | null> {
  const { data: rows } = await supabase
    .from('whatsapp_chat_context')
    .select('context_data, created_at, expires_at')
    .eq('group_jid', groupJid)
    .eq('account_id', accountId)
    .eq('context_type', 'campanhas')
    .order('created_at', { ascending: false })
    .limit(5);

  const data = getMatchingContextRow(rows, senderJid, senderName);

  if (!data) return null;

  // Check if expired - return special marker
  if (new Date(data.expires_at) < new Date()) {
    return { _expired: true };
  }

  return data.context_data;
}

async function handleSimResponse(account: any, supabase: any, groupJid: string, senderJid: string, senderName?: string): Promise<string> {
  const ctx = await getActiveContext(supabase, groupJid, account.id, senderJid, senderName);
  if (ctx?._expired) {
    return `⏰ *Sessão expirada*\n\nA consulta anterior expirou após 30 min de inatividade.\n\nEnvie *#campanhas* novamente para iniciar uma nova consulta.`;
  }
  if (!ctx || !ctx.campaigns?.length) {
    return `ℹ️ Nenhuma consulta de campanhas recente.\n\nUse *#campanhas* primeiro para listar as campanhas.`;
  }

  let msg = `📋 *Qual campanha deseja ver em detalhe?*\n\n`;
  ctx.campaigns.forEach((c: any) => {
    msg += `*#${c.index}* — ${c.name}\n`;
  });
  msg += `\nOu envie *#todas* para ver todas.`;
  return msg;
}

async function handleContextDetailMultiple(
  account: any,
  numbers: number[],
  groupJid: string,
  instanceName: string,
  evolutionUrl: string,
  evolutionKey: string,
  supabase: any,
  senderJid: string,
  senderName?: string
): Promise<Response> {
  const ctx = await getActiveContext(supabase, groupJid, account.id, senderJid, senderName);

  if (ctx?._expired) {
    const msg = `⏰ *Sessão expirada*\n\nA consulta anterior expirou após 30 min de inatividade.\n\nEnvie *#campanhas* novamente para iniciar uma nova consulta.`;
    await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, msg);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  if (!ctx || !ctx.campaigns?.length) {
    // No context - fallback to default behavior (today's campaigns)
    if (numbers.length === 1) {
      const msg = await handleCampanhaDetail(account, numbers[0], supabase);
      await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, msg);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    const msg = `ℹ️ Nenhuma consulta de campanhas recente.\n\nUse *#campanhas* primeiro.`;
    await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, msg);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const accessToken = Deno.env.get('META_ACCESS_TOKEN');
  if (!accessToken || !account.meta_account_id) {
    await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, `⚠️ Configuração Meta Ads incompleta.`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // Re-fetch campaigns with the SAME period from context
  const campaigns = await fetchMetaCampaignInsights(
    account.meta_account_id,
    accessToken,
    ctx.since || undefined,
    ctx.until || undefined,
    ctx.status_filter || ["ACTIVE"]
  );

  // Filter same as before
  const activeCampaigns = campaigns.filter((c: any) => {
    const insights = c.insights?.data?.[0];
    if (!insights) return false;
    return parseFloat(insights.spend || '0') > 0 || parseInt(insights.impressions || '0') > 0;
  });

  activeCampaigns.sort((a: any, b: any) => {
    const spendA = a.insights?.data?.[0] ? parseFloat(a.insights.data[0].spend || '0') : 0;
    const spendB = b.insights?.data?.[0] ? parseFloat(b.insights.data[0].spend || '0') : 0;
    return spendB - spendA;
  });

  // Validate requested numbers
  const validNumbers = numbers.filter(n => n >= 1 && n <= activeCampaigns.length);
  const invalidNumbers = numbers.filter(n => n < 1 || n > activeCampaigns.length);

  if (validNumbers.length === 0) {
    const msg = `⚠️ Nenhuma campanha encontrada com ${numbers.length === 1 ? 'o número' : 'os números'} informado(s).\n\nCampanhas disponíveis: 1 a ${activeCampaigns.length}`;
    await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, msg);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const periodLabel = ctx.period_label || 'Hoje';

  // Header
  if (validNumbers.length > 1) {
    await sendEvolutionMessage(
      evolutionUrl, evolutionKey, instanceName, groupJid,
      `📊 *Relatório detalhado — ${account.nome_cliente}*\n📅 ${periodLabel}\n\n_Enviando ${validNumbers.length} relatório(s)..._`
    );
    await new Promise(r => setTimeout(r, 2000));
  }

  for (let i = 0; i < validNumbers.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 2000));
    const campaign = activeCampaigns[validNumbers[i] - 1];
    const dateStr = periodLabel;
    const report = buildCampaignReport(account.nome_cliente, campaign, dateStr);
    await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, report);
  }

  if (invalidNumbers.length > 0) {
    await new Promise(r => setTimeout(r, 2000));
    await sendEvolutionMessage(
      evolutionUrl, evolutionKey, instanceName, groupJid,
      `⚠️ Campanha(s) ${invalidNumbers.map(n => `#${n}`).join(', ')} não encontrada(s). Disponíveis: 1 a ${activeCampaigns.length}`
    );
  }

  // Ask if they want more
  await new Promise(r => setTimeout(r, 2000));
  await sendEvolutionMessage(
    evolutionUrl, evolutionKey, instanceName, groupJid,
    `💡 Deseja ver outra campanha? Envie o número ou *#todas*.`
  );

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

async function handleContextDetailAll(
  account: any,
  groupJid: string,
  instanceName: string,
  evolutionUrl: string,
  evolutionKey: string,
  supabase: any,
  senderJid: string,
  senderName?: string
): Promise<Response> {
  const ctx = await getActiveContext(supabase, groupJid, account.id, senderJid, senderName);

  if (ctx?._expired) {
    const msg = `⏰ *Sessão expirada*\n\nA consulta anterior expirou após 30 min de inatividade.\n\nEnvie *#campanhas* novamente para iniciar uma nova consulta.`;
    await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, msg);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  if (!ctx || !ctx.campaigns?.length) {
    // Fallback to #relatorio behavior
    return await handleRelatorioAll(account, groupJid, instanceName, evolutionUrl, evolutionKey, supabase);
  }

  const allNumbers = ctx.campaigns.map((c: any) => c.index);
  return await handleContextDetailMultiple(account, allNumbers, groupJid, instanceName, evolutionUrl, evolutionKey, supabase, senderJid, senderName);
}

/**
 * Parses period arguments like "7", "30", "março", "janeiro 2025", "01/03 a 15/03"
 */
function parsePeriodArg(arg: string): { since: string; until: string; label: string } | null {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Number of days: "7", "15", "30"
  const daysMatch = arg.match(/^(\d+)$/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const since = new Date(now);
    since.setDate(since.getDate() - days);
    return {
      since: `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`,
      until: todayStr,
      label: `Últimos ${days} dias`,
    };
  }

  // Date range: "01/03 a 15/03" or "01/03/2025 a 15/03/2025"
  const rangeMatch = arg.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*a\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i);
  if (rangeMatch) {
    const y1 = rangeMatch[3] ? (rangeMatch[3].length === 2 ? 2000 + parseInt(rangeMatch[3]) : parseInt(rangeMatch[3])) : now.getFullYear();
    const y2 = rangeMatch[6] ? (rangeMatch[6].length === 2 ? 2000 + parseInt(rangeMatch[6]) : parseInt(rangeMatch[6])) : now.getFullYear();
    return {
      since: `${y1}-${String(parseInt(rangeMatch[2])).padStart(2, '0')}-${String(parseInt(rangeMatch[1])).padStart(2, '0')}`,
      until: `${y2}-${String(parseInt(rangeMatch[5])).padStart(2, '0')}-${String(parseInt(rangeMatch[4])).padStart(2, '0')}`,
      label: `${rangeMatch[1]}/${rangeMatch[2]} a ${rangeMatch[4]}/${rangeMatch[5]}`,
    };
  }

  // Month name: "março", "janeiro 2025"
  const months: Record<string, number> = {
    janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
    julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12
  };

  const monthMatch = arg.match(/^([a-záéíóúâêîôûãõç]+)\s*(\d{4})?$/i);
  if (monthMatch) {
    const monthName = monthMatch[1].toLowerCase();
    const monthNum = months[monthName];
    if (monthNum) {
      const year = monthMatch[2] ? parseInt(monthMatch[2]) : now.getFullYear();
      const lastDay = new Date(year, monthNum, 0).getDate();
      return {
        since: `${year}-${String(monthNum).padStart(2, '0')}-01`,
        until: `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
        label: `${monthMatch[1].charAt(0).toUpperCase() + monthMatch[1].slice(1)} ${year}`,
      };
    }
  }

  return null;
}

async function handleCampanhaDetail(account: any, num: number, supabase: any): Promise<string> {
  if (!account.meta_account_id) {
    return `⚠️ *${account.nome_cliente}*\nConta sem Meta Ads configurado.`;
  }

  const accessToken = Deno.env.get('META_ACCESS_TOKEN');
  if (!accessToken) {
    return `⚠️ Token do Meta não configurado.`;
  }

  try {
    const campaigns = await fetchMetaCampaignInsights(account.meta_account_id, accessToken);

    if (campaigns.length === 0) {
      return `📊 *${account.nome_cliente}*\n\nNenhuma campanha encontrada.`;
    }

    // Sort by spend descending (same order as #campanhas)
    campaigns.sort((a: any, b: any) => {
      const spendA = a.insights?.data?.[0] ? parseFloat(a.insights.data[0].spend || '0') : 0;
      const spendB = b.insights?.data?.[0] ? parseFloat(b.insights.data[0].spend || '0') : 0;
      return spendB - spendA;
    });

    if (isNaN(num) || num < 1 || num > campaigns.length) {
      return `⚠️ Campanha #${num} não encontrada.\n\nUse *#campanhas* para ver a lista (1 a ${campaigns.length}).`;
    }

    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    return buildCampaignReport(account.nome_cliente, campaigns[num - 1], dateStr);
  } catch (err) {
    console.error('[whatsapp-webhook] #campanha detail error:', err);
    return `⚠️ Erro ao consultar campanha. Tente novamente.`;
  }
}

async function handleRelatorioAll(
  account: any,
  groupJid: string,
  instanceName: string,
  evolutionUrl: string,
  evolutionKey: string,
  supabase: any
): Promise<Response> {
  if (!account.meta_account_id) {
    const msg = `⚠️ *${account.nome_cliente}*\nConta sem Meta Ads configurado.`;
    await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, msg);
    return new Response(JSON.stringify({ success: true, command: '#relatorio' }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const accessToken = Deno.env.get('META_ACCESS_TOKEN');
  if (!accessToken) {
    const msg = `⚠️ Token do Meta não configurado.`;
    await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, msg);
    return new Response(JSON.stringify({ success: true, command: '#relatorio' }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const campaigns = await fetchMetaCampaignInsights(account.meta_account_id, accessToken);

    // Only active campaigns with spend
    const activeCampaigns = campaigns.filter((c: any) => {
      if (c.status !== 'ACTIVE') return false;
      const spend = c.insights?.data?.[0] ? parseFloat(c.insights.data[0].spend || '0') : 0;
      return spend > 0;
    });

    if (activeCampaigns.length === 0) {
      const msg = `📊 *${account.nome_cliente}*\n\nNenhuma campanha ativa com gasto hoje.`;
      await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, msg);
      return new Response(JSON.stringify({ success: true, command: '#relatorio' }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    // Send header message
    await sendEvolutionMessage(
      evolutionUrl, evolutionKey, instanceName, groupJid,
      `📊 *Relatório de Campanhas - ${account.nome_cliente}*\n\n📅 ${dateStr}\n✅ ${activeCampaigns.length} campanha(s) ativa(s) com gasto\n\n_Enviando relatórios individuais..._`
    );

    // Send each campaign report with delay
    for (let i = 0; i < activeCampaigns.length; i++) {
      await new Promise(r => setTimeout(r, 2000)); // 2s delay between messages
      const report = buildCampaignReport(account.nome_cliente, activeCampaigns[i], dateStr);
      await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, report);
    }
  } catch (err) {
    console.error('[whatsapp-webhook] #relatorio error:', err);
    await sendEvolutionMessage(
      evolutionUrl, evolutionKey, instanceName, groupJid,
      `⚠️ Erro ao gerar relatório. Tente novamente.`
    );
  }

  return new Response(JSON.stringify({ success: true, command: '#relatorio' }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

async function handleLeads(account: any, supabase: any): Promise<string> {
  const { data: campaigns } = await supabase
    .from("meta_campaigns")
    .select("campaign_name, status, leads, spend, cpl")
    .eq("account_id", account.meta_account_id)
    .order("leads", { ascending: false });

  if (!campaigns || campaigns.length === 0) {
    return `👥 *Leads - ${account.nome_cliente}*\n\nNenhum dado disponível.`;
  }

  const totalLeads = campaigns.reduce((sum: number, c: any) => sum + (c.leads || 0), 0);
  const totalSpend = campaigns.reduce((sum: number, c: any) => sum + (c.spend || 0), 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  let msg = `👥 *Leads - ${account.nome_cliente}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 Total de leads: *${totalLeads}*\n`;
  msg += `💰 Investimento total: *${formatCurrency(totalSpend)}*\n`;
  msg += `📉 CPL médio: *${formatCurrency(avgCpl)}*\n\n`;

  msg += `📋 *Por campanha:*\n`;
  campaigns.filter((c: any) => (c.leads || 0) > 0).forEach((c: any) => {
    const statusIcon = c.status === "ACTIVE" ? "🟢" : "🔴";
    msg += `${statusIcon} ${c.campaign_name}\n`;
    msg += `   👥 ${c.leads} leads | CPL: ${c.cpl ? formatCurrency(c.cpl) : "N/A"}\n`;
  });

  return msg;
}

async function handleLeadsCampaign(account: any, ref: string, supabase: any): Promise<string> {
  const num = parseInt(ref);

  const { data: campaigns } = await supabase
    .from("meta_campaigns")
    .select("id, campaign_name, leads, spend, cpl, status")
    .eq("account_id", account.meta_account_id)
    .order("spend", { ascending: false });

  if (!campaigns || campaigns.length === 0) {
    return `👥 Nenhuma campanha encontrada para *${account.nome_cliente}*.`;
  }

  let campaign: any = null;
  if (!isNaN(num) && num >= 1 && num <= campaigns.length) {
    campaign = campaigns[num - 1];
  } else {
    campaign = campaigns.find((c: any) =>
      c.campaign_name.toLowerCase().includes(ref.toLowerCase())
    );
  }

  if (!campaign) {
    return `⚠️ Campanha "${ref}" não encontrada. Use *#campanhas* para ver a lista.`;
  }

  const { data: insights } = await supabase
    .from("campaign_insights")
    .select("date, leads, spend")
    .eq("campaign_id", campaign.id)
    .order("date", { ascending: false })
    .limit(14);

  let msg = `👥 *Leads - ${campaign.campaign_name}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 Total: *${campaign.leads || 0}* leads\n`;
  msg += `💰 Gasto: *${formatCurrency(campaign.spend || 0)}*\n`;
  msg += `📉 CPL: *${campaign.cpl ? formatCurrency(campaign.cpl) : "N/A"}*\n`;

  if (insights && insights.length > 0) {
    msg += `\n📅 *Histórico diário:*\n`;
    insights.reverse().forEach((d: any) => {
      const date = new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      msg += `   ${date}: 👥 ${d.leads || 0} leads | 💰 ${formatCurrency(d.spend || 0)}\n`;
    });
  }

  return msg;
}

async function handleResumo(account: any, supabase: any): Promise<string> {
  const { data: campaigns } = await supabase
    .from("meta_campaigns")
    .select("status, spend, leads, impressions, clicks, cpl")
    .eq("account_id", account.meta_account_id);

  if (!campaigns || campaigns.length === 0) {
    return `📊 *Resumo - ${account.nome_cliente}*\n\nNenhum dado disponível.`;
  }

  const active = campaigns.filter((c: any) => c.status === "ACTIVE");
  const totalSpend = campaigns.reduce((s: number, c: any) => s + (c.spend || 0), 0);
  const totalLeads = campaigns.reduce((s: number, c: any) => s + (c.leads || 0), 0);
  const totalImpressions = campaigns.reduce((s: number, c: any) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s: number, c: any) => s + (c.clicks || 0), 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;

  let msg = `📊 *Resumo Geral - ${account.nome_cliente}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `✅ Campanhas ativas: *${active.length}*\n`;
  msg += `📋 Total de campanhas: *${campaigns.length}*\n\n`;
  msg += `💰 Investimento: *${formatCurrency(totalSpend)}*\n`;
  msg += `👥 Leads: *${totalLeads}*\n`;
  msg += `📉 CPL médio: *${formatCurrency(avgCpl)}*\n`;
  msg += `👁️ Impressões: *${formatNumber(totalImpressions)}*\n`;
  msg += `👆 Cliques: *${formatNumber(totalClicks)}*\n`;
  msg += `📊 CTR médio: *${avgCtr.toFixed(2)}%*\n`;

  return msg;
}

function getHelpText(clientName: string): string {
  return `🤖 *Central de Comandos*\n` +
    `📌 *${clientName}*\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `💰 *FINANCEIRO*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `▸ *#saldo* → Saldo em tempo real\n` +
    `▸ *#gasto* → Investimento de hoje\n` +
    `▸ *#gasto 7* → Últimos 7 dias\n` +
    `▸ *#gasto 30* → Últimos 30 dias\n` +
    `▸ *#gasto março* → Mês específico\n` +
    `▸ *#gasto 01/03 a 15/03* → Período\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📊 *CAMPANHAS*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `▸ *#campanhas* → Ativas com gasto hoje\n` +
    `▸ *#campanhas 7* → Últimos 7 dias\n` +
    `▸ *#campanhas março* → Mês específico\n` +
    `▸ *#campanhas 01/03 a 15/03* → Período\n` +
    `▸ *#relatorio* → Relatório completo\n\n` +
    `📋 _Após listar campanhas:_\n` +
    `▸ *#1*, *#2* → Detalhe da campanha\n` +
    `▸ *#1 #3* → Várias de uma vez\n` +
    `▸ *#todas* → Detalhe de todas\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👥 *LEADS*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `▸ *#leads* → Resumo de leads\n` +
    `▸ *#leads 5* → Leads da campanha 5\n` +
    `▸ *#resumo* → Visão geral completa\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📝 *OPERACIONAL*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `▸ *#feedback* → Registrar feedback\n` +
    `▸ *#followup* → Registrar follow-up\n` +
    `▸ *#funil* → Funil consolidado\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `❓ *#comandos* → Esta mensagem\n` +
    `❓ *#ajuda* → Esta mensagem`;
}

// ─── Saldo Handler ───

async function handleSaldo(
  account: { id: string; nome_cliente: string; meta_account_id: string | null },
  supabase: any
): Promise<string> {
  if (!account.meta_account_id) {
    return `⚠️ *${account.nome_cliente}*\nConta sem Meta Ads configurado.`;
  }

  const accessToken = Deno.env.get('META_ACCESS_TOKEN');
  if (!accessToken) {
    return `⚠️ Token do Meta não configurado. Contate o administrador.`;
  }

  const formattedId = account.meta_account_id.startsWith('act_')
    ? account.meta_account_id
    : `act_${account.meta_account_id}`;

  try {
    const url = `https://graph.facebook.com/v21.0/${formattedId}?fields=balance,spend_cap,funding_source_details,is_prepay_account,currency&access_token=${accessToken}`;
    const res = await fetch(url);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[whatsapp-webhook] #saldo Meta API error for ${account.nome_cliente}:`, errText.slice(0, 300));
      return `⚠️ Erro ao consultar saldo. Tente novamente.`;
    }

    const data = await res.json();

    const isPrepay = data.is_prepay_account === true;
    const fundingType = data.funding_source_details?.type;
    const displayString = data.funding_source_details?.display_string || '';
    const isCardAccount = fundingType === 1 || fundingType === 2;

    let fundsAmount: number | null = null;
    const balanceMatch = displayString.match(/R\$\s?([\d.,]+)/);
    if (balanceMatch) {
      fundsAmount = parseFloat(balanceMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    const balanceRaw = parseFloat(data.balance || '0') / 100;
    const spendCap = data.spend_cap ? parseFloat(data.spend_cap) / 100 : null;

    const fmtCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

    let msg = `💰 *Saldo - ${account.nome_cliente}*\n\n`;

    if (fundsAmount !== null && fundsAmount > 0) {
      msg += `💰 Fundos: *${fmtCurrency(fundsAmount)}*\n`;
      if (isCardAccount && balanceRaw > 0) {
        msg += `💳 Devedor: *${fmtCurrency(balanceRaw)}*\n`;
      }
    } else if (isPrepay) {
      msg += `💰 Pré-pago: *${fmtCurrency(balanceRaw)}*\n`;
    } else if (isCardAccount) {
      msg += `💳 Devedor: *${fmtCurrency(balanceRaw)}*\n`;
      msg += `📋 ${displayString}\n`;
      msg += `_Cartão - cobrado automaticamente_\n`;
    } else {
      msg += `💰 Saldo: *${fmtCurrency(balanceRaw)}*\n`;
    }


    // Estimation
    const { data: accData } = await supabase
      .from('accounts')
      .select('media_gasto_diario')
      .eq('id', account.id)
      .single();

    if (accData?.media_gasto_diario && accData.media_gasto_diario > 0) {
      const saldoAtual = fundsAmount ?? (isPrepay ? balanceRaw : null);
      if (saldoAtual !== null && saldoAtual > 0) {
        const diasEstimados = Math.floor(saldoAtual / accData.media_gasto_diario);
        msg += `⏳ ~${diasEstimados} dia(s) restante(s)\n`;
      }
    }

    msg += `\n🕐 _Tempo real_`;

    return msg;
  } catch (err) {
    console.error(`[whatsapp-webhook] #saldo error:`, err);
    return `⚠️ Erro ao consultar saldo. Tente novamente.`;
  }
}

// ─── Gasto Handler ───

async function handleGasto(
  text: string,
  account: { id: string; nome_cliente: string; meta_account_id: string | null },
  supabase: any
): Promise<string> {
  if (!account.meta_account_id) {
    return `⚠️ *${account.nome_cliente}*\nConta sem Meta Ads configurado.`;
  }

  const accessToken = Deno.env.get('META_ACCESS_TOKEN');
  if (!accessToken) {
    return `⚠️ Token do Meta não configurado.`;
  }

  const formattedId = account.meta_account_id.startsWith('act_')
    ? account.meta_account_id
    : `act_${account.meta_account_id}`;

  const arg = text.toLowerCase().replace('#gasto', '').trim();

  let since: string;
  let until: string;
  let periodLabel: string;

  // Usar horário de Brasília
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const monthNames: Record<string, number> = {
    janeiro: 0, fevereiro: 1, 'março': 2, marco: 2, abril: 3, maio: 4, junho: 5,
    julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
  };

  const monthLabels = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const monthMatch = arg.match(/^(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*(?:de\s*)?(\d{4})?$/i);
  const rangeMatch = arg.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:a|ate|até)\s*(\d{1,2}\/\d{1,2}\/\d{4})$/i);
  const daysMatch = arg.match(/^(\d+)$/);

  if (monthMatch) {
    const mName = monthMatch[1].toLowerCase().replace('ç', 'c');
    const monthIdx = monthNames[mName] ?? monthNames[monthMatch[1].toLowerCase()];
    if (monthIdx === undefined) {
      return `⚠️ Mês não reconhecido.`;
    }
    const year = monthMatch[2] ? parseInt(monthMatch[2]) : (monthIdx <= today.getMonth() ? today.getFullYear() : today.getFullYear() - 1);
    const start = new Date(year, monthIdx, 1);
    const end = new Date(year, monthIdx + 1, 0);
    if (end > today) end.setTime(today.getTime());
    since = fmt(start);
    until = fmt(end);
    periodLabel = `${monthLabels[monthIdx]}/${year}`;
  } else if (rangeMatch) {
    const parseDate = (s: string) => {
      const [d, m, y] = s.split('/').map(Number);
      return new Date(y, m - 1, d);
    };
    const start = parseDate(rangeMatch[1]);
    const end = parseDate(rangeMatch[2]);
    since = fmt(start);
    until = fmt(end);
    periodLabel = `${rangeMatch[1]} a ${rangeMatch[2]}`;
  } else if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const start = new Date(today);
    start.setDate(start.getDate() - days + 1);
    since = fmt(start);
    until = fmt(today);
    periodLabel = `Últimos ${days} dias`;
  } else if (!arg) {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    since = fmt(start);
    until = fmt(today);
    periodLabel = `Últimos 30 dias`;
  } else {
    return `💸 *Como usar #gasto:*\n\n` +
      `▸ *#gasto* — Últimos 30 dias\n` +
      `▸ *#gasto 7* — Últimos 7 dias\n` +
      `▸ *#gasto 15* — Últimos 15 dias\n` +
      `▸ *#gasto março* — Mês de março\n` +
      `▸ *#gasto janeiro 2025* — Jan/2025\n` +
      `▸ *#gasto 01/03/2025 a 15/03/2025*`;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${formattedId}/insights?fields=spend,impressions,clicks,actions&time_range={"since":"${since}","until":"${until}"}&access_token=${accessToken}`;
    const res = await fetch(url);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[whatsapp-webhook] #gasto Meta API error:`, errText.slice(0, 300));
      return `⚠️ Erro ao consultar gastos. Tente novamente.`;
    }

    const result = await res.json();
    const insights = result.data?.[0];

    if (!insights) {
      return `💸 *Investimento - ${account.nome_cliente}*\n\n📅 ${periodLabel}\n\nSem dados neste período.`;
    }

    const spend = parseFloat(insights.spend || '0');
    const impressions = parseInt(insights.impressions || '0');
    const clicks = parseInt(insights.clicks || '0');
    const ctr = impressions > 0 ? (clicks / impressions * 100) : 0;

    let leads = 0;
    if (insights.actions) {
      for (const action of insights.actions) {
        if (action.action_type === 'lead' || action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
          leads += parseInt(action.value || '0');
        }
      }
    }

    const fmtCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
    const cpl = leads > 0 ? spend / leads : 0;

    let msg = `💸 *Investimento - ${account.nome_cliente}*\n\n`;
    msg += `📅 ${periodLabel}\n\n`;
    msg += `💰 Investido: *${fmtCurrency(spend)}*\n`;
    msg += `👀 Impressões: *${impressions.toLocaleString('pt-BR')}*\n`;
    msg += `🖱️ Cliques: *${clicks.toLocaleString('pt-BR')}*\n`;
    msg += `📊 CTR: *${ctr.toFixed(2)}%*\n`;

    if (leads > 0) {
      msg += `👥 Leads: *${leads}*\n`;
      msg += `💵 CPL: *${fmtCurrency(cpl)}*\n`;
    }

    msg += `\n🕐 _Tempo real_`;

    return msg;
  } catch (err) {
    console.error(`[whatsapp-webhook] #gasto error:`, err);
    return `⚠️ Erro ao consultar gastos. Tente novamente.`;
  }
}


// ─── Helpers ───

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Follow-up Handler (isolated module) ───

async function handleFollowup(
  text: string,
  account: any,
  groupJid: string,
  senderName: string,
  supabase: any
): Promise<string> {
  const followupBody = text.replace(/^#followup\s*/i, "").trim();

  if (!followupBody || followupBody.length < 5) {
    return `⚠️ *Follow-up vazio!*\n\nEnvie no formato:\n*#followup* João ligou, quer visitar apt 3Q no sábado\n\nDigite *#ajuda* para mais informações.`;
  }

  const groupNumber = groupJid.replace("@g.us", "");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const response = await fetch(`${supabaseUrl}/functions/v1/process-followup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        mensagem_original: followupBody,
        account_id: account.id,
        cliente_id: account.cliente_id || null,
        id_grupo: account.id_grupo || groupNumber,
        numero_grupo: groupNumber,
        telefone_origem: null,
        nome_origem: senderName,
        usuario_origem: senderName,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[whatsapp-webhook] Follow-up process error:", result);
      return `⚠️ Erro ao processar follow-up. Tente novamente.`;
    }

    if (result.duplicado) {
      return `⚠️ *Follow-up duplicado!*\n\nEssa mensagem já foi registrada anteriormente.`;
    }

    const dados = result.dados || {};

    let msg = `✅ *Follow-up registrado!*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 Enviado por: *${senderName}*\n`;
    msg += `🏢 Conta: *${account.nome_cliente}*\n\n`;

    if (dados.lead_nome) msg += `👤 Lead: *${dados.lead_nome}*\n`;
    if (dados.etapa_funil) msg += `📊 Etapa: *${dados.etapa_funil.replace(/_/g, " ")}*\n`;
    if (dados.status_lead) msg += `📋 Status: *${dados.status_lead.replace(/_/g, " ")}*\n`;
    if (dados.temperatura_lead) msg += `🌡️ Temperatura: *${dados.temperatura_lead}*\n`;
    if (dados.resumo) msg += `\n📝 *Resumo:* ${dados.resumo}\n`;
    if (dados.proxima_acao) msg += `➡️ *Próxima ação:* ${dados.proxima_acao}\n`;
    if (dados.data_proxima_acao) msg += `📅 *Data:* ${dados.data_proxima_acao}\n`;

    if (dados.confianca) {
      const conf = Math.round(dados.confianca * 100);
      msg += `\n🎯 Confiança da IA: ${conf}%\n`;
    }

    return msg;
  } catch (err) {
    console.error("[whatsapp-webhook] Follow-up error:", err);
    return `⚠️ Erro ao processar follow-up. Tente novamente.`;
  }
}

async function sendEvolutionMessage(baseUrl: string, apiKey: string, instanceName: string, groupJid: string, text: string) {
  const url = `${baseUrl}/message/sendText/${instanceName}`;
  console.log("[whatsapp-webhook] Sending to:", groupJid, "via", instanceName);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({ number: groupJid, text }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[whatsapp-webhook] Send error:", errText);
    throw new Error(`Failed to send: ${res.status}`);
  }

  return await res.json();
}
