import postgres from "https://esm.sh/postgres@3.4.5?target=deno";

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

  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    return jsonResponse({ error: "SUPABASE_DB_URL not configured" }, 500);
  }

  const sql = postgres(dbUrl, { prepare: false, max: 1 });

  try {
    await sql.unsafe(`
      create table if not exists public.whatsapp_groups (
        id uuid primary key default gen_random_uuid(),
        instance_name text not null,
        group_jid text not null,
        group_name text not null,
        size integer default 0,
        synced_at timestamptz default now(),
        created_at timestamptz default now(),
        unique (instance_name, group_jid)
      );

      alter table public.whatsapp_groups enable row level security;

      do $$
      begin
        if not exists (
          select 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'whatsapp_groups'
            and policyname = 'Authenticated users can view groups'
        ) then
          create policy "Authenticated users can view groups"
            on public.whatsapp_groups
            for select
            to authenticated
            using (true);
        end if;
      end $$;

      do $$
      begin
        if not exists (
          select 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'whatsapp_groups'
            and policyname = 'Admin can manage groups'
        ) then
          create policy "Admin can manage groups"
            on public.whatsapp_groups
            for all
            to authenticated
            using (public.is_admin(auth.uid()))
            with check (public.is_admin(auth.uid()));
        end if;
      end $$;

      -- Chat context table for conversational WhatsApp bot
      create table if not exists public.whatsapp_chat_context (
        id uuid primary key default gen_random_uuid(),
        group_jid text not null,
        account_id uuid not null references public.accounts(id) on delete cascade,
        context_type text not null default 'campanhas',
        context_data jsonb not null default '{}',
        created_at timestamptz not null default now(),
        expires_at timestamptz not null default (now() + interval '30 minutes'),
        unique(group_jid, account_id, context_type)
      );

      alter table public.whatsapp_chat_context enable row level security;

      do $$
      begin
        if not exists (
          select 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'whatsapp_chat_context'
            and policyname = 'Service role full access chat context'
        ) then
          create policy "Service role full access chat context"
            on public.whatsapp_chat_context
            for all
            using (true)
            with check (true);
        end if;
      end $$;
    `);

    return jsonResponse({ success: true, tables: ["whatsapp_groups", "whatsapp_chat_context"] });
  } catch (err) {
    console.error("[apply-whatsapp-groups-schema]", err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  } finally {
    await sql.end({ timeout: 1 });
  }
});