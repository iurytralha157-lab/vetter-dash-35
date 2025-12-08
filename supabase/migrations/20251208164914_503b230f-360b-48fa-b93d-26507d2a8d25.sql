-- Add Bruno as gestor in user_roles table
INSERT INTO public.user_roles (user_id, role)
VALUES ('e82311a4-b086-4b96-8299-bfe06de5f5d9', 'gestor')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update his profile role as well
UPDATE public.profiles 
SET role = 'gestor'
WHERE id = 'e82311a4-b086-4b96-8299-bfe06de5f5d9';