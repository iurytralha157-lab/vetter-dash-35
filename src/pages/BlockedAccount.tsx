import { useNavigate } from 'react-router-dom';
import { ShieldX, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function BlockedAccount() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-destructive/5" />
      
      <div className="relative w-full max-w-md">
        <Card className="surface-elevated rounded-3xl shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldX className="h-8 w-8 text-destructive" />
              </div>
            </div>
            
            <CardTitle className="text-2xl font-bold">Conta Bloqueada</CardTitle>
            <CardDescription className="text-base mt-2">
              Seu acesso foi suspenso temporariamente
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Info Box */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Email da conta</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              
              <div className="border-t border-destructive/20 pt-3">
                <p className="text-sm text-muted-foreground">
                  Se você acredita que isso foi um erro, entre em contato 
                  com nosso suporte para resolver a situação.
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="w-full h-12 gap-2"
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
