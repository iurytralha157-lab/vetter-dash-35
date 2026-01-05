-- Permitir que usuários autenticados vejam perfis básicos de outros usuários
CREATE POLICY "Authenticated users can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Remover política antiga restritiva se existir
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;