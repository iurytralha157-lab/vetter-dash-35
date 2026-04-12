import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Facebook, Chrome, Megaphone, Building2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AccountModal } from "./AccountModal";
import { AccountFormData } from "./AccountForm";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { buildLegacyAccountUpdate, updateAccount } from "@/services/accountsService";

interface Account {
  id: string;
  tipo: string;
  account_id: string;
  status: string;
  observacoes: string | null;
  created_at: string;
}

interface AccountsSectionProps {
  clientId: string;
}

const accountTypeIcons = {
  "Meta Ads": { icon: Facebook, color: "text-blue-600" },
  "Google Ads": { icon: Chrome, color: "text-red-600" },
  "TikTok Ads": { icon: Megaphone, color: "text-pink-600" },
  "LinkedIn Ads": { icon: Building2, color: "text-blue-700" },
  "Twitter Ads": { icon: TrendingUp, color: "text-sky-600" },
};

export function AccountsSection({ clientId }: AccountsSectionProps) {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('id, canais, meta_account_id, google_ads_id, status, observacoes, created_at')
        .eq('cliente_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform accounts data to match Account interface
      const transformedAccounts: Account[] = (data || []).map(acc => ({
        id: acc.id,
        tipo: acc.canais?.[0] || 'Meta Ads',
        account_id: acc.meta_account_id || acc.google_ads_id || '',
        status: acc.status || 'Ativo',
        observacoes: acc.observacoes,
        created_at: acc.created_at
      }));
      
      setAccounts(transformedAccounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [clientId]);

  const handleSubmit = async (data: AccountFormData) => {
    try {
      setSubmitting(true);
      
      // Determine which account_id field to use based on tipo
      const accountIdField = data.tipo === 'Meta Ads' ? 'meta_account_id' : 
                            data.tipo === 'Google Ads' ? 'google_ads_id' : 
                            'meta_account_id';
      
      if (editingAccount) {
        await updateAccount(editingAccount.id, buildLegacyAccountUpdate(data));

        toast({
          title: "Sucesso!",
          description: "Conta atualizada com sucesso",
        });
      } else {
        // Create new account
        const insertData: any = {
          cliente_id: clientId,
          canais: [data.tipo],
          status: data.status,
          observacoes: data.observacoes || null,
          nome_cliente: '',
          telefone: '',
        };
        
        // Add the appropriate account_id field
        insertData[accountIdField] = data.account_id;
        
        const { error } = await supabase
          .from('accounts')
          .insert(insertData);

        if (error) throw error;

        toast({
          title: "Sucesso!",
          description: "Conta criada com sucesso",
        });
      }

      setShowModal(false);
      setEditingAccount(null);
      await loadAccounts();
    } catch (error: any) {
      console.error('Error saving account:', error);
      
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar a conta",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Conta excluída com sucesso",
      });

      await loadAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conta",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'bg-green-500/20 text-green-600 border-green-500/50';
      case 'Pausado': return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50';
      case 'Arquivado': return 'bg-gray-500/20 text-gray-600 border-gray-500/50';
      default: return 'bg-gray-500/20 text-gray-600 border-gray-500/50';
    }
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setShowModal(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setShowModal(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            Carregando contas...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contas do Cliente</CardTitle>
          <Button onClick={openCreateModal} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma conta cadastrada</p>
              <p className="text-sm">Adicione contas para este cliente</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>ID da Conta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => {
                  const typeInfo = accountTypeIcons[account.tipo as keyof typeof accountTypeIcons];
                  const Icon = typeInfo?.icon || Building2;
                  
                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${typeInfo?.color || 'text-gray-600'}`} />
                          <span className="font-medium">{account.tipo}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {account.account_id}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(account.status)}>
                          {account.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {account.observacoes ? (
                          <span className="text-sm text-muted-foreground">
                            {account.observacoes.length > 50 
                              ? `${account.observacoes.substring(0, 50)}...` 
                              : account.observacoes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(account)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(account.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AccountModal
        open={showModal}
        onOpenChange={setShowModal}
        account={editingAccount ? {
          id: editingAccount.id,
          tipo: editingAccount.tipo,
          account_id: editingAccount.account_id,
          status: editingAccount.status as "Ativo" | "Pausado" | "Arquivado",
          observacoes: editingAccount.observacoes || "",
        } : undefined}
        onSubmit={handleSubmit}
        isEdit={!!editingAccount}
        isSubmitting={submitting}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A conta será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}