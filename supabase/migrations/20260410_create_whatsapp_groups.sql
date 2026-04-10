-- Create whatsapp_groups table to store synced groups
CREATE TABLE IF NOT EXISTS public.whatsapp_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name text NOT NULL,
  group_jid text NOT NULL,
  group_name text NOT NULL,
  size integer DEFAULT 0,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(instance_name, group_jid)
);

ALTER TABLE public.whatsapp_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view groups"
  ON public.whatsapp_groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage groups"
  ON public.whatsapp_groups
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
