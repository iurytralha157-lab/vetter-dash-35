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
  const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;

  try {
    // Use postgres connection to run DDL
    const { Pool } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
    const pool = new Pool(dbUrl, 1);
    const conn = await pool.connect();

    await conn.queryObject(`
      CREATE TABLE IF NOT EXISTS public.feedback_campanha (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        account_id uuid REFERENCES public.accounts(id),
        data_referencia date NOT NULL DEFAULT CURRENT_DATE,
        tipo_funil text NOT NULL CHECK (tipo_funil IN ('lancamento', 'terceiros')),
        campanha_nome text NOT NULL,
        campanha_codigo_curto text,
        quantidade_recebida integer NOT NULL DEFAULT 0,
        quantidade_descartado integer NOT NULL DEFAULT 0,
        quantidade_aguardando_retorno integer NOT NULL DEFAULT 0,
        quantidade_atendimento integer NOT NULL DEFAULT 0,
        quantidade_passou_corretor integer NOT NULL DEFAULT 0,
        quantidade_visita integer NOT NULL DEFAULT 0,
        quantidade_proposta integer NOT NULL DEFAULT 0,
        quantidade_venda integer NOT NULL DEFAULT 0,
        mensagem_original text NOT NULL,
        mensagem_hash text,
        ai_json jsonb,
        ai_modelo text,
        processamento_status text DEFAULT 'pendente',
        processamento_erro text,
        id_grupo text,
        numero_grupo text,
        telefone_origem text,
        nome_origem text,
        usuario_origem text
      );
    `);

    await conn.queryObject(`ALTER TABLE public.feedback_campanha ENABLE ROW LEVEL SECURITY;`);

    // Create policies (ignore if already exist)
    try {
      await conn.queryObject(`
        CREATE POLICY "Admin full access on feedback_campanha"
          ON public.feedback_campanha FOR ALL
          TO authenticated
          USING (is_admin(auth.uid()))
          WITH CHECK (is_admin(auth.uid()));
      `);
    } catch (_) { /* policy may already exist */ }

    try {
      await conn.queryObject(`
        CREATE POLICY "Gestor view feedback_campanha"
          ON public.feedback_campanha FOR SELECT
          TO authenticated
          USING (
            is_gestor(auth.uid()) AND account_id IN (
              SELECT id FROM accounts WHERE gestor_id = auth.uid()
            )
          );
      `);
    } catch (_) { /* policy may already exist */ }

    conn.release();
    await pool.end();

    return new Response(JSON.stringify({ success: true, message: "Table feedback_campanha created" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
