import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Determines balance mode based on Meta API data.
 * 
 * Modes:
 * - "funds"           → Has prepaid funds (PIX/boleto). Monitor balance normally.
 * - "card_ok"         → Uses credit/debit card, no payment issues. DON'T alert.
 * - "card_failing"    → Uses card but has payment failures. ALERT about card issue.
 * - "card_and_funds"  → Has both card AND funds. Monitor funds, mention card in alerts.
 * - "prepay"          → Prepay account without parsed funds. Monitor balance.
 * - "unknown"         → Could not determine. Monitor as fallback.
 */
function classifyAccount(data: any): {
  finalBalance: number;
  balanceType: string;
  hasCard: boolean;
  cardFailing: boolean;
  fundsAmount: number | null;
  debtAmount: number;
} {
  const isPrepay = data.is_prepay_account === true;
  const fundingDetails = data.funding_source_details;
  const displayString = fundingDetails?.display_string || '';
  
  // Detect card: funding_source_details.type 1=credit_card, 2=debit_card
  // Also check display_string for card indicators
  const fundingType = fundingDetails?.type;
  const hasCard = fundingType === 1 || fundingType === 2 || 
    /mastercard|visa|elo|amex|cartão|card|\*{3,}/i.test(displayString);

  // Raw balance from Meta (in cents) - for card accounts this is "saldo devedor"
  const balanceRaw = parseFloat(data.balance || '0') / 100;
  const debtAmount = balanceRaw;

  // Try to parse funds amount from display_string (e.g. "Saldo disponível (R$752,95 BRL)")
  let fundsAmount: number | null = null;
  const fundsMatch = displayString.match(/(?:saldo|disponível|balance)[^R$]*R\$\s?([\d.,]+)/i);
  if (fundsMatch) {
    fundsAmount = parseFloat(fundsMatch[1].replace(/\./g, '').replace(',', '.'));
  }
  // Also try simpler pattern for funding sources that just show "R$XXX,XX"
  if (fundsAmount === null && !hasCard) {
    const simpleMatch = displayString.match(/R\$\s?([\d.,]+)/);
    if (simpleMatch) {
      fundsAmount = parseFloat(simpleMatch[1].replace(/\./g, '').replace(',', '.'));
    }
  }

  // Detect payment failures via account_status
  // 1=ACTIVE, 2=DISABLED, 3=UNSETTLED, 7=PENDING_RISK_REVIEW, 9=PENDING_SETTLEMENT
  // 100=IN_GRACE_PERIOD, 101=TEMPORARILY_UNAVAILABLE
  const accountStatus = data.account_status;
  const disableReason = data.disable_reason;
  const hasPaymentIssue = accountStatus === 3 || accountStatus === 100 || 
    (accountStatus === 2 && disableReason === 3);

  let finalBalance: number;
  let balanceType: string;

  if (hasCard && fundsAmount !== null && fundsAmount > 0) {
    // Has both card AND funds
    finalBalance = fundsAmount;
    balanceType = hasPaymentIssue ? 'card_failing' : 'card_and_funds';
  } else if (hasCard && (fundsAmount === null || fundsAmount === 0)) {
    // Card only, no meaningful funds
    finalBalance = 0;
    balanceType = hasPaymentIssue ? 'card_failing' : 'card_ok';
  } else if (fundsAmount !== null) {
    // Funds only (PIX/boleto), no card
    finalBalance = fundsAmount;
    balanceType = 'funds';
  } else if (isPrepay) {
    finalBalance = balanceRaw;
    balanceType = 'prepay';
  } else {
    finalBalance = balanceRaw;
    balanceType = 'unknown';
  }

  return { finalBalance, balanceType, hasCard, cardFailing: hasPaymentIssue, fundsAmount, debtAmount };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const accessToken = Deno.env.get('META_ACCESS_TOKEN');

    if (!accessToken) {
      throw new Error('META_ACCESS_TOKEN not configured');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all active accounts with Meta Ads
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, nome_cliente, meta_account_id, saldo_meta, alerta_saldo_baixo')
      .eq('status', 'Ativo')
      .eq('usa_meta_ads', true)
      .not('meta_account_id', 'is', null);

    if (error) throw error;

    console.log(`[sync-balances] Sincronizando saldo de ${accounts?.length || 0} contas...`);

    const results: { account: string; old_balance: number; new_balance: number | null; status: string; balance_type: string; has_card: boolean }[] = [];

    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < (accounts?.length || 0); i += batchSize) {
      const batch = accounts!.slice(i, i + batchSize);

      const promises = batch.map(async (acc) => {
        const formattedId = acc.meta_account_id!.startsWith('act_')
          ? acc.meta_account_id!
          : `act_${acc.meta_account_id}`;

        try {
          const url = `${META_BASE_URL}/${formattedId}?fields=balance,amount_spent,spend_cap,funding_source_details,account_status,disable_reason,is_prepay_account,currency,name&access_token=${accessToken}`;
          const res = await fetch(url);

          if (!res.ok) {
            const errText = await res.text();
            console.warn(`[sync-balances] ❌ ${acc.nome_cliente}: ${errText.slice(0, 200)}`);
            results.push({ account: acc.nome_cliente, old_balance: acc.saldo_meta ?? 0, new_balance: null, status: 'error', balance_type: 'unknown', has_card: false });
            return;
          }

          const data = await res.json();
          const classification = classifyAccount(data);

          console.log(`[sync-balances] 🔍 ${acc.nome_cliente}: type=${classification.balanceType}, card=${classification.hasCard}, cardFail=${classification.cardFailing}, funds=${classification.fundsAmount}, debt=${classification.debtAmount.toFixed(2)}, status=${data.account_status}, display="${data.funding_source_details?.display_string || 'N/A'}"`);

          // Update the account
          const { error: updateError } = await supabase
            .from('accounts')
            .update({
              saldo_meta: classification.finalBalance,
              last_balance_check_meta: new Date().toISOString(),
              modo_saldo_meta: classification.balanceType,
            })
            .eq('id', acc.id);

          if (updateError) {
            console.warn(`[sync-balances] ❌ Update failed for ${acc.nome_cliente}:`, updateError.message);
            results.push({ account: acc.nome_cliente, old_balance: acc.saldo_meta ?? 0, new_balance: classification.finalBalance, status: 'update_error', balance_type: classification.balanceType, has_card: classification.hasCard });
          } else {
            console.log(`[sync-balances] ✅ ${acc.nome_cliente}: R$ ${(acc.saldo_meta ?? 0).toFixed(2)} → R$ ${classification.finalBalance.toFixed(2)} (${classification.balanceType})`);
            results.push({ account: acc.nome_cliente, old_balance: acc.saldo_meta ?? 0, new_balance: classification.finalBalance, status: 'synced', balance_type: classification.balanceType, has_card: classification.hasCard });
          }
        } catch (err) {
          console.warn(`[sync-balances] ❌ ${acc.nome_cliente}:`, err);
          results.push({ account: acc.nome_cliente, old_balance: acc.saldo_meta ?? 0, new_balance: null, status: 'error', balance_type: 'unknown', has_card: false });
        }
      });

      await Promise.all(promises);

      // Small delay between batches
      if (i + batchSize < (accounts?.length || 0)) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    const synced = results.filter(r => r.status === 'synced').length;
    const errors = results.filter(r => r.status !== 'synced').length;
    const cardOk = results.filter(r => r.balance_type === 'card_ok').length;
    const cardFailing = results.filter(r => r.balance_type === 'card_failing').length;

    console.log(`[sync-balances] Concluído. ${synced} sincronizados, ${cardOk} contas com cartão OK, ${cardFailing} com problemas de cartão, ${errors} erros.`);

    return new Response(JSON.stringify({
      success: true,
      total: accounts?.length || 0,
      synced,
      card_ok: cardOk,
      card_failing: cardFailing,
      errors,
      details: results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[sync-balances] Erro:', err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
