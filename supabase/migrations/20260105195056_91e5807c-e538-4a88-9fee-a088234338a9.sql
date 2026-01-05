-- Desbloquear usuário de teste
UPDATE public.profiles 
SET status = 'active'
WHERE id = '82c685f1-2a81-4a13-9b3b-d69e8a05a407';

-- Garantir que usuário tem role de admin para testar todas as funcionalidades
INSERT INTO public.user_roles (user_id, role)
VALUES ('82c685f1-2a81-4a13-9b3b-d69e8a05a407', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;