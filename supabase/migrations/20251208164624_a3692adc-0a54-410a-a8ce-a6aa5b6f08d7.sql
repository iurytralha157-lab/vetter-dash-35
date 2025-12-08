-- Drop existing demandas policies that are too permissive
DROP POLICY IF EXISTS "Authenticated users can view demandas" ON public.demandas;
DROP POLICY IF EXISTS "Authenticated users can create demandas" ON public.demandas;
DROP POLICY IF EXISTS "Users can update demandas" ON public.demandas;
DROP POLICY IF EXISTS "Admins can delete demandas" ON public.demandas;

-- Create proper RLS policies for demandas

-- Admins can do everything
CREATE POLICY "Admin full access on demandas"
ON public.demandas
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Gestores can view demandas for their assigned accounts
CREATE POLICY "Gestor view demandas for assigned accounts"
ON public.demandas
FOR SELECT
USING (
  is_gestor(auth.uid()) AND 
  account_id IN (
    SELECT id FROM accounts WHERE gestor_id = auth.uid()
  )
);

-- Gestores can create demandas for their assigned accounts
CREATE POLICY "Gestor create demandas for assigned accounts"
ON public.demandas
FOR INSERT
WITH CHECK (
  is_gestor(auth.uid()) AND 
  account_id IN (
    SELECT id FROM accounts WHERE gestor_id = auth.uid()
  )
);

-- Gestores can update demandas for their assigned accounts
CREATE POLICY "Gestor update demandas for assigned accounts"
ON public.demandas
FOR UPDATE
USING (
  is_gestor(auth.uid()) AND 
  account_id IN (
    SELECT id FROM accounts WHERE gestor_id = auth.uid()
  )
);

-- Gestores can delete demandas for their assigned accounts
CREATE POLICY "Gestor delete demandas for assigned accounts"
ON public.demandas
FOR DELETE
USING (
  is_gestor(auth.uid()) AND 
  account_id IN (
    SELECT id FROM accounts WHERE gestor_id = auth.uid()
  )
);

-- Also fix demanda_historico to allow gestores
DROP POLICY IF EXISTS "Authenticated users can view demanda history" ON public.demanda_historico;
DROP POLICY IF EXISTS "Authenticated users can insert demanda history" ON public.demanda_historico;

-- Admin full access on demanda_historico
CREATE POLICY "Admin full access on demanda_historico"
ON public.demanda_historico
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Gestores can view history for demandas in their accounts
CREATE POLICY "Gestor view demanda history"
ON public.demanda_historico
FOR SELECT
USING (
  is_gestor(auth.uid()) AND 
  demanda_id IN (
    SELECT d.id FROM demandas d 
    JOIN accounts a ON d.account_id = a.id 
    WHERE a.gestor_id = auth.uid()
  )
);

-- Gestores can insert history for demandas in their accounts
CREATE POLICY "Gestor insert demanda history"
ON public.demanda_historico
FOR INSERT
WITH CHECK (
  is_gestor(auth.uid()) AND 
  demanda_id IN (
    SELECT d.id FROM demandas d 
    JOIN accounts a ON d.account_id = a.id 
    WHERE a.gestor_id = auth.uid()
  )
);