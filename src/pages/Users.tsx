// src/pages/Users.tsx
import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Plus,
  Users as UsersIcon,
  Shield,
  UserCheck,
  User,
  MoreVertical,
  Edit,
  Eye,
  Trash2,
  ChevronRight,
  Filter,
  Mail,
  Phone,
  Building2,
  Calendar,
  Lock,
  Unlock,
  RefreshCw
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Usuario {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "gestor" | "usuario";
  ativo: boolean;
  ultimo_acesso: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  telefone: string | null;
  departamento: string | null;
  updated_at: string;
  clientes_atribuidos?: any[];
  clientes_acesso?: any[];
  total_clientes?: number;
}

interface Cliente {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
}

interface ClienteAcesso {
  cliente_id: string;
  cliente_nome: string;
  nivel_acesso: "visualizar" | "editar" | "total";
}

export default function Users() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");

  const [showClientesModal, setShowClientesModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);

  const [gestorClientes, setGestorClientes] = useState<string[]>([]);
  const [usuarioAcessos, setUsuarioAcessos] = useState<ClienteAcesso[]>([]);

  const [editFormData, setEditFormData] = useState({
    name: "",
    telefone: "",
    departamento: "",
  });

  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Create user modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "usuario",
  });

  useEffect(() => {
    loadCurrentUser();
    loadUsuarios();
    loadClientes();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single() as any;

      // Buscar role do usuário
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .single() as any;

      setCurrentUser(profile);
      setIsAdmin(userRole?.role === "admin");
    }
  };

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('list-users');
      if (error) throw error;
      const list = ((data as any)?.users) || [];
      setUsuarios(list);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({
        title: "Erro ao carregar usuários",
        description: error?.message || String(error) || "Não foi possível carregar a lista de usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, email, telefone")
        .order("nome");
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Error loading clientes:", error);
    }
  };

  const updateRole = async (userId: string, newRole: string) => {
    if (!isAdmin) {
      toast({
        title: "Sem permissão",
        description: "Apenas administradores podem alterar cargos",
        variant: "destructive",
      });
      return;
    }
    try {
      // Deletar role antiga
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId) as any;

      // Inserir nova role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole } as any) as any;
      
      if (error) throw error;
      
      toast({
        title: "Cargo atualizado",
        description: "O cargo do usuário foi atualizado com sucesso",
      });
      loadUsuarios();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Erro ao atualizar cargo",
        description: "Não foi possível atualizar o cargo do usuário",
        variant: "destructive",
      });
    }
  };

  const toggleStatus = async (userId: string, ativo: boolean) => {
    if (!isAdmin) {
      toast({
        title: "Sem permissão",
        description: "Apenas administradores podem alterar status",
        variant: "destructive",
      });
      return;
    }
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ativo } as any)
        .eq("id", userId) as any;
      if (error) throw error;
      toast({
        title: "Status atualizado",
        description: `Usuário ${ativo ? "ativado" : "desativado"} com sucesso`,
      });
      loadUsuarios();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do usuário",
        variant: "destructive",
      });
    }
  };

  const openEditModal = (user: Usuario) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || "",
      telefone: user.telefone || "",
      departamento: user.departamento || "",
    });
    setShowEditModal(true);
  };

  const saveUserEdits = async () => {
    if (!selectedUser) return;
    try {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", selectedUser.id)
        .single();

      if (existingProfile) {
        const { error } = await supabase
          .from("profiles")
          .update({
            name: editFormData.name,
            telefone: editFormData.telefone,
            departamento: editFormData.departamento,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", selectedUser.id) as any;
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({
          id: selectedUser.id,
          name: editFormData.name,
          telefone: editFormData.telefone,
          departamento: editFormData.departamento,
          ativo: true,
          updated_at: new Date().toISOString(),
        } as any) as any;
        if (error) throw error;
      }

      toast({
        title: "Usuário atualizado",
        description: "As informações foram salvas com sucesso",
      });

      setShowEditModal(false);
      loadUsuarios();
    } catch (error) {
      console.error("Error saving user edits:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (user: Usuario) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ativo: false } as any)
        .eq("id", selectedUser.id) as any;
      if (error) throw error;
      toast({
        title: "Usuário desativado",
        description: "O usuário foi desativado com sucesso",
      });
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsuarios();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Erro ao desativar",
        description: "Não foi possível desativar o usuário",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async () => {
    if (!isAdmin) {
      toast({
        title: "Sem permissão",
        description: "Apenas administradores podem criar usuários",
        variant: "destructive",
      });
      return;
    }

    if (!createForm.name.trim() || !createForm.email.trim()) {
      toast({
        title: "Dados inválidos",
        description: "Nome e email são obrigatórios",
      });
      return;
    }

    try {
      setCreatingUser(true);
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: createForm.email.trim(),
          name: createForm.name.trim(),
          role: createForm.role,
          password: createForm.password ? createForm.password : undefined,
        },
      });

      if (error) {
        const serverMsg = (data as any)?.error || error.message || 'Falha ao criar usuário';
        throw new Error(serverMsg);
      }

      toast({ title: 'Usuário criado', description: 'Usuário criado com sucesso' });
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', role: 'usuario' });
      loadUsuarios();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({ title: 'Erro ao criar usuário', description: error?.message || String(error), variant: 'destructive' });
    } finally {
      setCreatingUser(false);
    }
  };

  const filteredUsuarios = usuarios.filter((user) => {
    const matchSearch =
      !searchTerm ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === "todos" || user.role === filterRole;
    const matchStatus =
      filterStatus === "todos" ||
      (filterStatus === "ativo" && user.ativo) ||
      (filterStatus === "inativo" && !user.ativo);
    return matchSearch && matchRole && matchStatus;
  });

  const stats = {
    total: usuarios.length,
    admins: usuarios.filter((u) => u.role === "admin").length,
    gestores: usuarios.filter((u) => u.role === "gestor").length,
    usuarios: usuarios.filter((u) => u.role === "usuario").length,
    ativos: usuarios.filter((u) => u.ativo).length,
    inativos: usuarios.filter((u) => !u.ativo).length,
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-500 text-white">Admin</Badge>;
      case "gestor":
        return <Badge className="bg-blue-500 text-white">Gestor</Badge>;
      default:
        return <Badge>Usuário</Badge>;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Nunca acessou";
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Usuários</h1>
          <div className="text-center py-8">Carregando usuários...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Usuários</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os usuários e suas permissões
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadUsuarios}>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo Usuário
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os cargos</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="usuario">Usuário</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsuarios.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name || 'Sem nome'}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <Select value={user.role} onValueChange={(v) => updateRole(user.id, v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="gestor">Gestor</SelectItem>
                            <SelectItem value="usuario">Usuário</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={user.ativo} onCheckedChange={(v) => toggleStatus(user.id, v)} />
                          <span className="text-xs text-muted-foreground">{user.ativo ? 'Ativo' : 'Inativo'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(user.last_sign_in_at || user.ultimo_acesso)}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-right">{user.total_clientes ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(user)}>
                              <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => deleteUser(user)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Desativar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsuarios.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar usuário</DialogTitle>
              <DialogDescription>Atualize as informações do usuário</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input
                  value={editFormData.name}
                  onChange={(e) => setEditFormData((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input
                  value={editFormData.telefone}
                  onChange={(e) => setEditFormData((p) => ({ ...p, telefone: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Departamento</Label>
                <Input
                  value={editFormData.departamento}
                  onChange={(e) => setEditFormData((p) => ({ ...p, departamento: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button>
              <Button onClick={saveUserEdits}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Desativar usuário</DialogTitle>
              <DialogDescription>Tem certeza que deseja desativar este usuário?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmDelete}>Desativar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo usuário. Se a senha ficar em branco, será gerada automaticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="create-name">Nome *</Label>
                <Input
                  id="create-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-password">Senha (opcional)</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Deixe em branco para gerar automaticamente"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-role">Cargo *</Label>
                <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v })}>
                  <SelectTrigger id="create-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="usuario">Usuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm({ name: '', email: '', password: '', role: 'usuario' });
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateUser}
                disabled={creatingUser || !createForm.email || !createForm.name}
              >
                {creatingUser ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
