import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useUserContext } from '@/hooks/useUserContext';

export default function PendingApproval() {
  const { signOut, user } = useAuth();
  const { status, loading, refetch } = useUserContext();
  const navigate = useNavigate();

  // Redirect if user becomes active
  useEffect(() => {
    if (!loading && status === 'active') {
      navigate('/dashboard', { replace: true });
    }
  }, [status, loading, navigate]);

  // Poll for status changes every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/20" />
      
      <div className="relative w-full max-w-md">
        <Card className="surface-elevated rounded-3xl shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </div>
            
            <CardTitle className="text-2xl font-bold">Aguardando Aprovação</CardTitle>
            <CardDescription className="text-base mt-2">
              Seu cadastro está em análise pela nossa equipe
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Info Box */}
            <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Email cadastrado</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              
              <div className="border-t border-border pt-3">
                <p className="text-sm text-muted-foreground">
                  Você receberá um email assim que sua conta for aprovada. 
                  Isso geralmente leva até 24 horas úteis.
                </p>
              </div>
            </div>

            {/* Refresh Button */}
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="w-full h-12 gap-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Verificar Status
            </Button>

            {/* Logout Button */}
            <Button 
              onClick={handleLogout}
              variant="ghost"
              className="w-full h-12 gap-2 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Sair e usar outra conta
            </Button>

            {/* Support Info */}
            <div className="text-center pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Precisa de ajuda? Entre em contato com{' '}
                <a href="mailto:suporte@vetter.com.br" className="text-primary hover:underline">
                  suporte@vetter.com.br
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
