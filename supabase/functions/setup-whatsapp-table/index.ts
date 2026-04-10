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
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Use service role to execute raw SQL via pg_net or rpc
    // Since we can't run raw SQL, we'll use the REST API approach:
    // Create the table by attempting an insert and handling the error
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_name text NOT NULL UNIQUE,
        display_name text,
        linked_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
      ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
      CREATE POLICY IF NOT EXISTS "service_role_full_access" ON public.whatsapp_instances FOR ALL TO service_role USING (true) WITH CHECK (true);
    `;

    // Use the Supabase Management API via direct PostgreSQL connection
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) {
      return new Response(JSON.stringify({ error: "SUPABASE_DB_URL not available" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Import postgres
    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.4/mod.js");
    const sql = postgres(dbUrl);
    
    await sql`
      CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_name text NOT NULL UNIQUE,
        display_name text,
        linked_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `;

    // Enable RLS
    await sql`ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY`;

    // Create policy (ignore if exists)
    try {
      await sql`CREATE POLICY "service_role_full_access" ON public.whatsapp_instances FOR ALL TO service_role USING (true) WITH CHECK (true)`;
    } catch (e) {
      // Policy may already exist
      console.log("Policy may already exist:", e.message);
    }

    await sql.end();

    return new Response(JSON.stringify({ success: true, message: "Table whatsapp_instances created successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
