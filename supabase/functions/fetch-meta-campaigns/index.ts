import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaCampaignResponse {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

interface MetaInsightsResponse {
  impressions?: string;
  reach?: string;
  clicks?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
}

type BalanceMode = 'funds' | 'card_ok' | 'card_failing' | 'card_and_funds' | 'prepay' | 'unknown';

function parseCurrencyValue(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = value.match(/R\$\s?([\d.,]+)/i);
  if (!match) return null;
  return parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
}

function inferFundingSourceType(fundingType: number | null | undefined, displayString: string): string | null {
  if (fundingType === 1) return 'credit_card';
  if (fundingType === 2) return 'debit_card';
  if (fundingType === 4 || fundingType === 20) return 'funds';
  if (fundingType === 7) return 'boleto';
  if (fundingType === 12) return 'pix';
  if (/mastercard|visa|elo|amex|cart[aã]o|card|\*{3,}/i.test(displayString)) return 'credit_card';
  if (/pix/i.test(displayString)) return 'pix';
  if (/boleto/i.test(displayString)) return 'boleto';
  if (/saldo|fundos?|dispon[ií]vel/i.test(displayString)) return 'funds';
  return null;
}

function classifyBalance(accountInfo: any) {
  const displayString = accountInfo.funding_source_details?.display_string || '';
  const fundingType = accountInfo.funding_source_details?.type;
  const fundingSourceType = inferFundingSourceType(fundingType, displayString);
  const hasCard = fundingSourceType === 'credit_card' || fundingSourceType === 'debit_card';
  const balanceRaw = parseFloat(accountInfo.balance || '0') / 100;
  const debtAmount = balanceRaw;
  const fundsMatch = displayString.match(/(?:saldo\s+dispon[ií]vel|fundos?|dispon[ií]vel|balance)[^R$]*R\$\s?([\d.,]+)/i);
  const fundsAmount = fundsMatch
    ? parseFloat(fundsMatch[1].replace(/\./g, '').replace(',', '.'))
    : !hasCard
      ? parseCurrencyValue(displayString)
      : null;

  const accountStatus = accountInfo.account_status;
  const disableReason = accountInfo.disable_reason;
  const hasPaymentIssue = accountStatus === 3 || accountStatus === 9 || accountStatus === 100 || (accountStatus === 2 && disableReason === 3);

  let balanceMode: BalanceMode = 'unknown';
  let displayBalance = balanceRaw;

  if (hasCard && fundsAmount !== null && fundsAmount > 0) {
    balanceMode = hasPaymentIssue ? 'card_failing' : 'card_and_funds';
    displayBalance = fundsAmount;
  } else if (hasCard) {
    balanceMode = hasPaymentIssue ? 'card_failing' : 'card_ok';
    displayBalance = 0;
  } else if (fundsAmount !== null) {
    balanceMode = 'funds';
    displayBalance = fundsAmount;
  } else if (accountInfo.is_prepay_account) {
    balanceMode = 'prepay';
  }

  return {
    balance: displayBalance,
    balance_raw: balanceRaw,
    debt_amount: debtAmount,
    funds_amount: fundsAmount,
    funding_source_type: fundingSourceType,
    balance_mode: balanceMode,
    has_card: hasCard,
    has_payment_issue: hasPaymentIssue,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meta_account_id, period = 'last_7d', since: customSince, until: customUntil } = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Fetching Meta campaigns for account:', meta_account_id, 'Period:', period);

    if (!meta_account_id) {
      throw new Error('meta_account_id is required');
    }

    const accessToken = Deno.env.get('META_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('META_ACCESS_TOKEN not configured');
    }

    // Format account ID (add 'act_' prefix if not present)
    const formattedAccountId = meta_account_id.startsWith('act_') 
      ? meta_account_id 
      : `act_${meta_account_id}`;

    console.log('Formatted account ID:', formattedAccountId);

    // Calculate date range based on period parameter
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const now = new Date();
    let since: string;
    let until: string;
    let datePreset: string | null = null;

    switch (period) {
      case 'today':
        // Use date_preset for "today" to leverage Meta's automatic timezone handling
        datePreset = 'today';
        since = formatDate(now); // Fallback only
        until = formatDate(now);
        break;
      case 'yesterday':
        datePreset = 'yesterday';
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        since = formatDate(yesterday);
        until = formatDate(yesterday);
        break;
      case 'last_7d':
        datePreset = 'last_7d';
        const last7 = new Date(now);
        last7.setDate(last7.getDate() - 7);
        since = formatDate(last7);
        until = formatDate(now);
        break;
      case 'last_15d':
        const last15 = new Date(now);
        last15.setDate(last15.getDate() - 15);
        since = formatDate(last15);
        until = formatDate(now);
        break;
      case 'this_month':
        datePreset = 'this_month';
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        since = formatDate(thisMonthStart);
        until = formatDate(now);
        break;
      case 'last_month':
        datePreset = 'last_month';
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        since = formatDate(lastMonthStart);
        until = formatDate(lastMonthEnd);
        break;
      case 'last_30d':
        datePreset = 'last_30d';
        const last30 = new Date(now);
        last30.setDate(last30.getDate() - 30);
        since = formatDate(last30);
        until = formatDate(now);
        break;
      case 'this_quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        since = formatDate(quarterStart);
        until = formatDate(now);
        break;
      case 'this_year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        since = formatDate(yearStart);
        until = formatDate(now);
        break;
      case 'custom':
        if (customSince && customUntil) {
          since = customSince;
          until = customUntil;
        } else {
          const defaultStart = new Date(now);
          defaultStart.setDate(defaultStart.getDate() - 7);
          since = formatDate(defaultStart);
          until = formatDate(now);
        }
        break;
      default:
        const defaultStart2 = new Date(now);
        defaultStart2.setDate(defaultStart2.getDate() - 7);
        since = formatDate(defaultStart2);
        until = formatDate(now);
    }
    
    console.log('Date config:', { since, until, period, datePreset });

    // Fetch account info (balance, billing status, payment details)
    const accountInfoUrl = `${META_BASE_URL}/${formattedAccountId}?fields=balance,amount_spent,spend_cap,currency,name,account_status,disable_reason,is_prepay_account,funding_source_details&access_token=${accessToken}`;
    console.log('Fetching account info from Meta API...');
    const accountInfoPromise = fetch(accountInfoUrl);

    // Fetch campaigns
    const campaignsUrl = `${META_BASE_URL}/${formattedAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&access_token=${accessToken}`;
    
    console.log('Fetching campaigns from Meta API...');
    const campaignsResponse = await fetch(campaignsUrl);
    
    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text();
      console.error('Meta API campaigns error:', errorText);
      throw new Error(`Meta API error: ${campaignsResponse.status} - ${errorText}`);
    }

    const campaignsData = await campaignsResponse.json();
    console.log('Campaigns fetched:', campaignsData.data?.length || 0);

    // Process account info (balance)
    let accountInfo: any = null;
    try {
      const accountInfoResponse = await accountInfoPromise;
      if (accountInfoResponse.ok) {
        accountInfo = await accountInfoResponse.json();
        console.log('Account info:', JSON.stringify({ balance: accountInfo.balance, amount_spent: accountInfo.amount_spent, spend_cap: accountInfo.spend_cap, currency: accountInfo.currency, account_status: accountInfo.account_status, disable_reason: accountInfo.disable_reason, is_prepay_account: accountInfo.is_prepay_account, funding_source_details: accountInfo.funding_source_details }));
      } else {
        console.warn('Failed to fetch account info:', await accountInfoResponse.text());
      }
    } catch (e) {
      console.warn('Error fetching account info:', e);
    }

    // Fetch account-level insights
    // Use date_preset for supported periods, otherwise use time_range
    const insightsTimeParam = datePreset 
      ? `date_preset=${datePreset}` 
      : `time_range={"since":"${since}","until":"${until}"}`;
    
    const insightsUrl = `${META_BASE_URL}/${formattedAccountId}/insights?fields=impressions,reach,clicks,spend,ctr,cpc,cpm,actions,cost_per_action_type&${insightsTimeParam}&access_token=${accessToken}`;
    
    console.log('Fetching account insights from Meta API...');
    const insightsResponse = await fetch(insightsUrl);
    
    if (!insightsResponse.ok) {
      const errorText = await insightsResponse.text();
      console.error('Meta API insights error:', errorText);
      // Don't throw, insights are optional
      console.warn('Failed to fetch insights, continuing without them');
    }

    let accountInsights = null;
    if (insightsResponse.ok) {
      const insightsData = await insightsResponse.json();
      const insightsArray = insightsData.data || [];
      
      console.log(`Account insights: received ${insightsArray.length} records`);
      if (insightsArray.length > 0) {
        // Log ALL action types to debug lead counting
        const allActions = insightsArray[0]?.actions || [];
        console.log('All account action_types:', JSON.stringify(allActions.map((a: any) => ({ type: a.action_type, value: a.value }))));
      }
      
      accountInsights = insightsArray[0] || null;
      console.log('Account insights processed:', accountInsights ? 'YES' : 'NO DATA');
    }

    // Fetch insights for each campaign
    const campaignsWithInsights = await Promise.all(
      (campaignsData.data || []).map(async (campaign: MetaCampaignResponse) => {
        try {
          // Use date_preset for supported periods, otherwise use time_range
          const campaignTimeParam = datePreset 
            ? `date_preset=${datePreset}` 
            : `time_range={"since":"${since}","until":"${until}"}`;
          
          const campaignInsightsUrl = `${META_BASE_URL}/${campaign.id}/insights?fields=impressions,reach,clicks,spend,ctr,cpc,cpm,actions,cost_per_action_type&${campaignTimeParam}&access_token=${accessToken}`;
          
          const response = await fetch(campaignInsightsUrl);
          if (!response.ok) {
            console.warn(`Failed to fetch insights for campaign ${campaign.id}`);
            return {
              ...campaign,
              insights: null
            };
          }

          const data = await response.json();
          const insights = data.data?.[0] || null;
          
          // Extract conversions based on campaign objective
          // Meta "Results" metric maps to specific action_type per objective
          let conversions = 0;
          let costPerConversion = null;
          
          if (insights?.actions) {
            const objective = campaign.objective;
            let resultActionType: string;
            
            // Pick the correct action type based on campaign objective
            if (objective === 'OUTCOME_ENGAGEMENT' || objective === 'MESSAGES') {
              // WhatsApp/Messaging campaigns → conversations started
              resultActionType = 'onsite_conversion.messaging_conversation_started_7d';
            } else if (objective === 'OUTCOME_LEADS' || objective === 'LEAD_GENERATION') {
              // Lead gen campaigns → lead actions
              resultActionType = 'lead';
            } else {
              // Fallback: try lead first, then messaging
              resultActionType = 'lead';
            }
            
            // Find the primary result action
            const primaryAction = insights.actions.find((a: any) => a.action_type === resultActionType);
            if (primaryAction) {
              conversions = parseInt(primaryAction.value || '0');
            } else {
              // Fallback: try other lead-like actions in priority order
              const fallbackTypes = [
                'onsite_conversion.messaging_conversation_started_7d',
                'lead',
                'onsite_conversion.lead',
                'offsite_conversion.fb_pixel_lead'
              ];
              for (const fallbackType of fallbackTypes) {
                const fallbackAction = insights.actions.find((a: any) => a.action_type === fallbackType);
                if (fallbackAction) {
                  conversions = parseInt(fallbackAction.value || '0');
                  break;
                }
              }
            }
          }

          // Extract followers (page_likes from actions)
          let followers = 0;
          if (insights?.actions) {
            const followerAction = insights.actions.find((a: any) => a.action_type === 'like' || a.action_type === 'page_like');
            if (followerAction) {
              followers = parseInt(followerAction.value || '0');
            }
          }

          if (insights?.cost_per_action_type && conversions > 0) {
            const spend = parseFloat(insights.spend || '0');
            costPerConversion = conversions > 0 ? spend / conversions : null;
          }

          return {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            objective: campaign.objective,
            daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
            lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
            insights: insights ? {
              impressions: parseInt(insights.impressions || '0'),
              reach: parseInt(insights.reach || '0'),
              clicks: parseInt(insights.clicks || '0'),
              spend: parseFloat(insights.spend || '0'),
              ctr: parseFloat(insights.ctr || '0'),
              cpc: parseFloat(insights.cpc || '0'),
              cpm: parseFloat(insights.cpm || '0'),
              conversions,
              cost_per_conversion: costPerConversion,
              followers
            } : null
          };
        } catch (error) {
          console.error(`Error fetching insights for campaign ${campaign.id}:`, error);
          return {
            ...campaign,
            insights: null
          };
        }
      })
    );

    // Calculate account-level metrics by summing per-campaign conversions
    // This avoids double-counting from overlapping action_types at account level
    let accountMetrics = null;
    if (accountInsights) {
      const totalConversions = campaignsWithInsights.reduce((sum: number, c: any) => {
        return sum + (c.insights?.conversions || 0);
      }, 0);

      const totalFollowers = campaignsWithInsights.reduce((sum: number, c: any) => {
        return sum + (c.insights?.followers || 0);
      }, 0);
      
      console.log('Account-level total conversions (sum of campaigns):', totalConversions);
      console.log('Account-level total followers (sum of campaigns):', totalFollowers);

      accountMetrics = {
        total_spend: parseFloat(accountInsights.spend || '0'),
        total_impressions: parseInt(accountInsights.impressions || '0'),
        total_clicks: parseInt(accountInsights.clicks || '0'),
        avg_ctr: parseFloat(accountInsights.ctr || '0'),
        avg_cpc: parseFloat(accountInsights.cpc || '0'),
        avg_cpm: parseFloat(accountInsights.cpm || '0'),
        total_conversions: totalConversions,
        total_followers: totalFollowers
      };
    }

    const classifiedBalance = accountInfo ? classifyBalance(accountInfo) : null;

    if (classifiedBalance && supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const rawAccountId = formattedAccountId.replace(/^act_/, '');

      await supabase
        .from('accounts')
        .update({
          saldo_meta: classifiedBalance.balance,
          modo_saldo_meta: classifiedBalance.balance_mode,
          last_balance_check_meta: new Date().toISOString(),
        })
        .in('meta_account_id', [formattedAccountId, rawAccountId]);
    }

    const response = {
      success: true,
      account_id: formattedAccountId,
      campaigns: campaignsWithInsights,
      account_metrics: accountMetrics,
      account_balance: accountInfo ? {
          ...classifiedBalance,
          amount_spent: parseFloat(accountInfo.amount_spent || '0') / 100,
          spend_cap: accountInfo.spend_cap ? parseFloat(accountInfo.spend_cap) / 100 : null,
          currency: accountInfo.currency || 'BRL',
          account_name: accountInfo.name || null,
          account_status: accountInfo.account_status || null,
          disable_reason: accountInfo.disable_reason || null,
          is_prepay_account: accountInfo.is_prepay_account || false,
          funding_source_details: accountInfo.funding_source_details || null,
      } : null,
      fetched_at: new Date().toISOString()
    };

    console.log('Successfully fetched Meta data');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in fetch-meta-campaigns function:', error);
    
    let errorMessage = error.message;
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.message.includes('META_ACCESS_TOKEN')) {
      errorCode = 'INVALID_TOKEN';
      errorMessage = 'Token de acesso do Meta não configurado ou inválido';
    } else if (error.message.includes('meta_account_id')) {
      errorCode = 'MISSING_ACCOUNT_ID';
      errorMessage = 'ID da conta Meta não fornecido';
    } else if (error.message.includes('Meta API error')) {
      errorCode = 'META_API_ERROR';
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        error_code: errorCode,
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
