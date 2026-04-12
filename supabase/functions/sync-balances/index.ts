import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

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

    const results: { account: string; old_balance: number; new_balance: number | null; status: string; balance_type: string }[] = [];

    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < (accounts?.length || 0); i += batchSize) {
      const batch = accounts!.slice(i, i + batchSize);

      const promises = batch.map(async (acc) => {
        const formattedId = acc.meta_account_id!.startsWith('act_')
          ? acc.meta_account_id!
          : `act_${acc.meta_account_id}`;

        try {
          const url = `${META_BASE_URL}/${formattedId}?fields=balance,amount_spent,spend_cap,funding_source_details,account_status,disable_reason,is_prepay_account&access_token=${accessToken}`;
          const res = await fetch(url);

          if (!res.ok) {
            const errText = await res.text();
            console.warn(`[sync-balances] ❌ ${acc.nome_cliente}: ${errText.slice(0, 200)}`);
            results.push({ account: acc.nome_cliente, old_balance: acc.saldo_meta ?? 0, new_balance: null, status: 'error', balance_type: 'unknown' });
            return;
          }

          const data = await res.json();

          // Determine account type and extract the correct balance
          const isPrepay = data.is_prepay_account === true;
          const fundingType = data.funding_source_details?.type; // 1=credit_card, 2=debit_card, 4=funds
          const displayString = data.funding_source_details?.display_string || '';
          const isCardAccount = fundingType === 1 || fundingType === 2;

          // Try to parse funds amount from display_string (e.g. "Saldo disponível (R$752,95 BRL)")
          let fundsAmount: number | null = null;
          const balanceMatch = displayString.match(/R\$\s?([\d.,]+)/);
          if (balanceMatch) {
            fundsAmount = parseFloat(balanceMatch[1].replace(/\./g, '').replace(',', '.'));
          }

          // Raw balance from Meta (in cents) - this is "saldo devedor" for card accounts
          const balanceRaw = parseFloat(data.balance || '0') / 100;

          let finalBalance: number;
          let balanceType: string;

          if (fundsAmount !== null) {
            // Has funds (pre-paid deposit) - use funds amount regardless of card
            finalBalance = fundsAmount;
            balanceType = 'funds';
          } else if (isPrepay) {
            // Pre-pay account without parsed funds - use raw balance
            finalBalance = balanceRaw;
            balanceType = 'prepay';
          } else if (isCardAccount) {
            // Card-only account - balance is "saldo devedor" (amount to be charged)
            // We store it but mark it so alerts know not to trigger
            // Store as negative to indicate it's debt, or store 0 to skip alerts
            // Better: store null/0 for saldo_meta since it's not a spendable balance
            finalBalance = 0; // Card accounts don't have a "spendable" balance to monitor
            balanceType = 'card_only';
            console.log(`[sync-balances] ℹ️ ${acc.nome_cliente}: Conta com cartão (saldo devedor: R$ ${balanceRaw.toFixed(2)}) - não monitorar saldo`);
          } else {
            // Unknown type, use raw balance as fallback
            finalBalance = balanceRaw;
            balanceType = 'unknown';
          }

          // Update the account
          const { error: updateError } = await supabase
            .from('accounts')
            .update({
              saldo_meta: finalBalance,
              last_balance_check_meta: new Date().toISOString(),
              // Store the balance mode so alerts know how to handle
              modo_saldo_meta: balanceType,
            })
            .eq('id', acc.id);

          if (updateError) {
            console.warn(`[sync-balances] ❌ Update failed for ${acc.nome_cliente}:`, updateError.message);
            results.push({ account: acc.nome_cliente, old_balance: acc.saldo_meta ?? 0, new_balance: finalBalance, status: 'update_error', balance_type: balanceType });
          } else {
            console.log(`[sync-balances] ✅ ${acc.nome_cliente}: R$ ${(acc.saldo_meta ?? 0).toFixed(2)} → R$ ${finalBalance.toFixed(2)} (${balanceType})`);
            results.push({ account: acc.nome_cliente, old_balance: acc.saldo_meta ?? 0, new_balance: finalBalance, status: 'synced', balance_type: balanceType });
          }
        } catch (err) {
          console.warn(`[sync-balances] ❌ ${acc.nome_cliente}:`, err);
          results.push({ account: acc.nome_cliente, old_balance: acc.saldo_meta ?? 0, new_balance: null, status: 'error', balance_type: 'unknown' });
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
    const cardOnly = results.filter(r => r.balance_type === 'card_only').length;

    console.log(`[sync-balances] Concluído. ${synced} sincronizados (${cardOnly} contas com cartão ignoradas), ${errors} erros.`);

    return new Response(JSON.stringify({
      success: true,
      total: accounts?.length || 0,
      synced,
      card_only_skipped: cardOnly,
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
