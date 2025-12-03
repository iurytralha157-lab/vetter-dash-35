import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, Facebook, Chrome, AlertCircle } from "lucide-react";
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
  saldo_meta: number | null;
  last_balance_check_meta: string | null;
  last_balance_check_google: string | null;
  alerta_saldo_baixo: number | null;
}

export function ChecklistTab() {
  const [accounts, setAccounts] = useState<AccountCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [balanceInputs, setBalanceInputs] = useState<Record<string, { meta: string; google: string }>>({});
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

      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select(`
          id, 
          nome_cliente, 
          usa_meta_ads, 
          usa_google_ads, 
          meta_account_id, 
          google_ads_id,
          saldo_meta,
          last_balance_check_meta,
          last_balance_check_google,
          alerta_saldo_baixo
        `)
        .eq("status", "Ativo")
        .order("nome_cliente");

      if (accountsError) throw accountsError;

      const { data: checksData, error: checksError } = await supabase
        .from("daily_account_checks")
        .select("*")
        .eq("check_date", today);

      if (checksError) throw checksError;

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
          saldo_meta: acc.saldo_meta,
          last_balance_check_meta: acc.last_balance_check_meta,
          last_balance_check_google: acc.last_balance_check_google,
          alerta_saldo_baixo: acc.alerta_saldo_baixo,
        };
      });

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

  const handleBalanceUpdate = async (accountId: string, type: 'meta' | 'google') => {
    const amount = balanceInputs[accountId]?.[type];
    if (!amount || !currentUserId) return;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      toast({
        title: "Erro",
        description: "Por favor, insira um valor numérico válido",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error: historyError } = await supabase
        .from("balance_history")
        .insert({
          account_id: accountId,
          balance_type: type,
          balance_amount: numericAmount,
          recorded_by: currentUserId,
        });

      if (historyError) throw historyError;

      const updateField = type === 'meta' ? 'last_balance_check_meta' : 'last_balance_check_google';
      const { error: accountError } = await supabase
        .from("accounts")
        .update({ 
          [updateField]: new Date().toISOString(),
          ...(type === 'meta' && { saldo_meta: numericAmount })
        })
        .eq("id", accountId);

      if (accountError) throw accountError;

      toast({
        title: "Saldo atualizado",
        description: `Saldo ${type === 'meta' ? 'Meta' : 'Google Ads'} atualizado com sucesso`,
      });

      setBalanceInputs(prev => ({
        ...prev,
        [accountId]: { ...prev[accountId], [type]: '' }
      }));

      loadAccounts();
    } catch (error: any) {
      console.error("Erro ao atualizar saldo:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar o saldo",
        variant: "destructive",
      });
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

  const needsBalanceUpdate = (account: AccountCheck, type: 'meta' | 'google') => {
    const lastCheck = type === 'meta' ? account.last_balance_check_meta : account.last_balance_check_google;
    if (!lastCheck) return true;
    
    const daysSinceCheck = Math.floor((Date.now() - new Date(lastCheck).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceCheck > 3;
  };

  const isBalanceLow = (account: AccountCheck) => {
    if (!account.saldo_meta || !account.alerta_saldo_baixo) return false;
    return account.saldo_meta <= account.alerta_saldo_baixo;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando contas...</p>
        </CardContent>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Todas as contas verificadas!</h3>
          <p className="text-muted-foreground">
            Não há contas pendentes de verificação hoje.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {accounts.map((account) => {
        const metaNeedsUpdate = account.usa_meta_ads && needsBalanceUpdate(account, 'meta');
        const googleNeedsUpdate = account.usa_google_ads && needsBalanceUpdate(account, 'google');
        const lowBalance = isBalanceLow(account);
        
        return (
          <Card 
            key={account.id} 
            className={`surface-elevated ${(metaNeedsUpdate || googleNeedsUpdate || lowBalance) ? 'border-amber-500 border-2' : ''}`}
          >
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
              {(metaNeedsUpdate || googleNeedsUpdate || lowBalance) && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="space-y-1">
                    {lowBalance && (
                      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4" />
                        <span>Saldo Meta abaixo do alerta (R$ {account.saldo_meta?.toFixed(2)})</span>
                      </div>
                    )}
                    {metaNeedsUpdate && (
                      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4" />
                        <span>Saldo Meta não atualizado há mais de 3 dias</span>
                      </div>
                    )}
                    {googleNeedsUpdate && (
                      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4" />
                        <span>Saldo Google não atualizado há mais de 3 dias</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                {account.usa_meta_ads && account.meta_account_id && (
                  <div className="flex-1 space-y-3 p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
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

                    <div className="pt-2 border-t space-y-2">
                      {account.last_balance_check_meta && (
                        <div className="text-xs text-muted-foreground">
                          <div>Último saldo: R$ {account.saldo_meta?.toFixed(2) || '0,00'}</div>
                          <div>Atualizado: {format(new Date(account.last_balance_check_meta), "dd/MM/yyyy")}</div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Novo saldo"
                          value={balanceInputs[account.id]?.meta || ''}
                          onChange={(e) => setBalanceInputs(prev => ({
                            ...prev,
                            [account.id]: { ...prev[account.id], meta: e.target.value }
                          }))}
                          className="h-8 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleBalanceUpdate(account.id, 'meta')}
                          disabled={!balanceInputs[account.id]?.meta}
                          className="h-8 px-3"
                        >
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {account.usa_google_ads && account.google_ads_id && (
                  <div className="flex-1 space-y-3 p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
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
                          <Chrome className="h-4 w-4 text-green-600" />
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

                    <div className="pt-2 border-t space-y-2">
                      {account.last_balance_check_google && (
                        <div className="text-xs text-muted-foreground">
                          <div>Atualizado: {format(new Date(account.last_balance_check_google), "dd/MM/yyyy")}</div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Novo saldo"
                          value={balanceInputs[account.id]?.google || ''}
                          onChange={(e) => setBalanceInputs(prev => ({
                            ...prev,
                            [account.id]: { ...prev[account.id], google: e.target.value }
                          }))}
                          className="h-8 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleBalanceUpdate(account.id, 'google')}
                          disabled={!balanceInputs[account.id]?.google}
                          className="h-8 px-3"
                        >
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
