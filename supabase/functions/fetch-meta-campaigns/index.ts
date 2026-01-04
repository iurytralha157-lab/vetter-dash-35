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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meta_account_id, period = 'last_7d' } = await req.json();
    
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
      default:
        const defaultStart = new Date(now);
        defaultStart.setDate(defaultStart.getDate() - 7);
        since = formatDate(defaultStart);
        until = formatDate(now);
    }
    
    console.log('Date config:', { since, until, period, datePreset });

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

    // Fetch account-level insights
    // Use date_preset for supported periods, otherwise use time_range
    const insightsTimeParam = datePreset 
      ? `date_preset=${datePreset}` 
      : `time_range={"since":"${since}","until":"${until}"}`;
    
    const insightsUrl = `${META_BASE_URL}/${formattedAccountId}/insights?fields=impressions,reach,clicks,spend,ctr,cpc,cpm,actions,cost_per_action_type&${insightsTimeParam}&time_increment=1&action_report_time=impression&access_token=${accessToken}`;
    
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
        console.log('First insight record:', JSON.stringify(insightsArray[0]).substring(0, 200));
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
          
          const campaignInsightsUrl = `${META_BASE_URL}/${campaign.id}/insights?fields=impressions,reach,clicks,spend,ctr,cpc,cpm,actions,cost_per_action_type&${campaignTimeParam}&time_increment=1&action_report_time=impression&access_token=${accessToken}`;
          
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
          
          // Extract conversions from actions array
          let conversions = 0;
          let costPerConversion = null;
          
          if (insights?.actions) {
            // Sum all lead-related actions
            const leadActions = insights.actions.filter((action: any) => 
              action.action_type === 'lead' ||
              action.action_type === 'offsite_conversion.fb_pixel_lead' ||
              action.action_type === 'onsite_conversion.lead' ||
              action.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
              action.action_type === 'onsite_conversion.post_save'
            );
            conversions = leadActions.reduce((sum: number, action: { value?: string }) => sum + parseInt(action.value || '0'), 0);
          }

          if (insights?.cost_per_action_type && conversions > 0) {
            // Find the most relevant cost per action
            const costActions = insights.cost_per_action_type.filter((action: any) => 
              action.action_type === 'lead' ||
              action.action_type === 'offsite_conversion.fb_pixel_lead' ||
              action.action_type === 'onsite_conversion.lead'
            );
            if (costActions.length > 0) {
              // Use the first lead cost action found
              costPerConversion = parseFloat(costActions[0].value);
            }
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
              cost_per_conversion: costPerConversion
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

    // Calculate account-level metrics
    let accountMetrics = null;
    if (accountInsights) {
      let conversions = 0;
      if (accountInsights.actions) {
        // Sum all lead-related actions for account level
        const leadActions = accountInsights.actions.filter((action: any) => 
          action.action_type === 'lead' ||
          action.action_type === 'offsite_conversion.fb_pixel_lead' ||
          action.action_type === 'onsite_conversion.lead' ||
          action.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
          action.action_type === 'onsite_conversion.post_save'
        );
        conversions = leadActions.reduce((sum: number, action: { value?: string }) => sum + parseInt(action.value || '0'), 0);
      }

      accountMetrics = {
        total_spend: parseFloat(accountInsights.spend || '0'),
        total_impressions: parseInt(accountInsights.impressions || '0'),
        total_clicks: parseInt(accountInsights.clicks || '0'),
        avg_ctr: parseFloat(accountInsights.ctr || '0'),
        avg_cpc: parseFloat(accountInsights.cpc || '0'),
        avg_cpm: parseFloat(accountInsights.cpm || '0'),
        total_conversions: conversions
      };
    }

    const response = {
      success: true,
      account_id: formattedAccountId,
      campaigns: campaignsWithInsights,
      account_metrics: accountMetrics,
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
