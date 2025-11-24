import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, Facebook, Chrome, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AccountCheck {
  id: string;
  nome_cliente: string;
  usa_meta_ads: boolean;
  usa_google_ads: boolean;
  meta_account_id: string | null;
  google_ads_id: string | null;
  checked_meta: boolean;
  checked_google: boolean;
  meta_checked_by: string | null;
  meta_checked_at: string | null;
  google_checked_by: string | null;
  google_checked_at: string | null;
  check_id: string | null;
}

export default function ChecklistDiario() {
  const [accounts, setAccounts] = useState<AccountCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    loadAccounts();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);

      // Buscar todas as contas ativas
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("id, nome_cliente, usa_meta_ads, usa_google_ads, meta_account_id, google_ads_id")
        .eq("status", "Ativo")
        .order("nome_cliente");

      if (accountsError) throw accountsError;

      // Buscar checks de hoje
      const { data: checksData, error: checksError } = await supabase
        .from("daily_account_checks")
        .select("*")
        .eq("check_date", today);

      if (checksError) throw checksError;

      // Combinar dados
      const checksMap = new Map(checksData?.map(c => [c.account_id, c]) || []);
      
      const combined: AccountCheck[] = (accountsData || []).map(acc => {
        const check = checksMap.get(acc.id);
        return {
          id: acc.id,
          nome_cliente: acc.nome_cliente,
          usa_meta_ads: acc.usa_meta_ads || false,
          usa_google_ads: acc.usa_google_ads || false,
          meta_account_id: acc.meta_account_id,
          google_ads_id: acc.google_ads_id,
          checked_meta: check?.checked_meta || false,
          checked_google: check?.checked_google || false,
          meta_checked_by: check?.meta_checked_by || null,
          meta_checked_at: check?.meta_checked_at || null,
          google_checked_by: check?.google_checked_by || null,
          google_checked_at: check?.google_checked_at || null,
          check_id: check?.id || null,
        };
      });

      // Filtrar: só mostrar contas que ainda precisam ser checadas
      const filtered = combined.filter(acc => {
        const needsMetaCheck = acc.usa_meta_ads && acc.meta_account_id && !acc.checked_meta;
        const needsGoogleCheck = acc.usa_google_ads && acc.google_ads_id && !acc.checked_google;
        return needsMetaCheck || needsGoogleCheck;
      });

      setAccounts(filtered);
    } catch (error: any) {
      console.error("Erro ao carregar contas:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar as contas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async (accountId: string, type: 'meta' | 'google', currentValue: boolean) => {
    if (!currentUserId) {
      toast({
        title: "Erro",
        description: "Usuário não identificado",
        variant: "destructive",
      });
      return;
    }

    try {
      const account = accounts.find(a => a.id === accountId);
      if (!account) return;

      const now = new Date().toISOString();

      if (account.check_id) {
        // Atualizar registro existente
        const updateData: any = {
          updated_at: now,
        };

        if (type === 'meta') {
          updateData.checked_meta = !currentValue;
          updateData.meta_checked_by = !currentValue ? currentUserId : null;
          updateData.meta_checked_at = !currentValue ? now : null;
        } else {
          updateData.checked_google = !currentValue;
          updateData.google_checked_by = !currentValue ? currentUserId : null;
          updateData.google_checked_at = !currentValue ? now : null;
        }

        const { error } = await supabase
          .from("daily_account_checks")
          .update(updateData)
          .eq("id", account.check_id);

        if (error) throw error;
      } else {
        // Criar novo registro
        const insertData: any = {
          account_id: accountId,
          check_date: today,
          checked_meta: type === 'meta',
          checked_google: type === 'google',
        };

        if (type === 'meta') {
          insertData.meta_checked_by = currentUserId;
          insertData.meta_checked_at = now;
        } else {
          insertData.google_checked_by = currentUserId;
          insertData.google_checked_at = now;
        }

        const { error } = await supabase
          .from("daily_account_checks")
          .insert(insertData);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: `Check ${type === 'meta' ? 'Meta' : 'Google'} ${!currentValue ? 'marcado' : 'desmarcado'}`,
      });

      loadAccounts();
    } catch (error: any) {
      console.error("Erro ao salvar check:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o check",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Checklist Diário
            </h1>
          </div>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="mt-4 text-muted-foreground">Carregando contas...</p>
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Todas as contas verificadas!</h3>
              <p className="text-muted-foreground">
                Não há contas pendentes de verificação hoje.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {accounts.map((account) => (
              <Card key={account.id} className="surface-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{account.nome_cliente}</span>
                    <div className="flex gap-2">
                      {account.usa_meta_ads && account.meta_account_id && (
                        <Badge variant={account.checked_meta ? "default" : "outline"}>
                          <Facebook className="h-3 w-3 mr-1" />
                          Meta
                        </Badge>
                      )}
                      {account.usa_google_ads && account.google_ads_id && (
                        <Badge variant={account.checked_google ? "default" : "outline"}>
                          <Chrome className="h-3 w-3 mr-1" />
                          Google
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {account.meta_account_id && `Meta: ${account.meta_account_id}`}
                    {account.meta_account_id && account.google_ads_id && " | "}
                    {account.google_ads_id && `Google: ${account.google_ads_id}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {account.usa_meta_ads && account.meta_account_id && (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border flex-1">
                        <Checkbox
                          id={`meta-${account.id}`}
                          checked={account.checked_meta}
                          onCheckedChange={() => handleCheck(account.id, 'meta', account.checked_meta)}
                          className="h-5 w-5"
                        />
                        <label
                          htmlFor={`meta-${account.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Facebook className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Verificar Meta</span>
                          </div>
                          {account.checked_meta && account.meta_checked_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Verificado às {format(new Date(account.meta_checked_at), "HH:mm")}
                            </p>
                          )}
                        </label>
                        {account.checked_meta ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    )}

                    {account.usa_google_ads && account.google_ads_id && (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border flex-1">
                        <Checkbox
                          id={`google-${account.id}`}
                          checked={account.checked_google}
                          onCheckedChange={() => handleCheck(account.id, 'google', account.checked_google)}
                          className="h-5 w-5"
                        />
                        <label
                          htmlFor={`google-${account.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Chrome className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Verificar Google</span>
                          </div>
                          {account.checked_google && account.google_checked_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Verificado às {format(new Date(account.google_checked_at), "HH:mm")}
                            </p>
                          )}
                        </label>
                        {account.checked_google ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
