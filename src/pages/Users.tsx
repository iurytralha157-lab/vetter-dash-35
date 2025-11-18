import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Search,
  RefreshCw,
  UserPlus,
  Edit,
  Trash2,
  Building2,
  Mail,
  Phone,
  Calendar,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Usuario {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "gestor" | "usuario";
  ativo: boolean;
  ultimo_acesso: string | null;
  last_sign_in_at?: string | null;
  created_at: string;
  telefone: string | null;
  departamento: string | null;
  updated_at: string;
  total_clientes?: number;
  clientes_acesso?: any[];
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
    telefone: "",
    departamento: "",
  });

  useEffect(() => {
    loadCurrentUser();
    loadUsuarios();
    loadClientes();
  }, []);

  const loadCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = (await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()) as any;

      // Buscar role do usuário
      const { data: userRole } = (await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .single()) as any;

      setCurrentUser(profile);
      setIsAdmin(userRole?.role === "admin");
    }
  };

  const loadUsuarios = async () => {
    try {
      setLoading(true);

      // Buscar perfis
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("name");

      if (profilesError) throw profilesError;

      // Buscar roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Buscar contas para contar clientes por gestor
      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("gestor_id, cliente_id");

      if (accountsError) throw accountsError;

      // Buscar total de clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("id");

      if (clientesError) throw clientesError;

      const totalClientes = clientesData?.length || 0;

      // Contar clientes únicos por gestor
      const clientCountByGestor: Record<string, Set<string>> = {};
      (accounts || []).forEach((acc) => {
        if (acc.gestor_id && acc.cliente_id) {
          if (!clientCountByGestor[acc.gestor_id]) {
            clientCountByGestor[acc.gestor_id] = new Set();
          }
          clientCountByGestor[acc.gestor_id].add(acc.cliente_id);
        }
      });

      // Combinar dados
      const usuarios: Usuario[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        const role = userRole?.role || "usuario";

        let total_clientes = 0;
        if (role === "admin") {
          total_clientes = totalClientes;
        } else if (role === "gestor") {
          total_clientes = clientCountByGestor[profile.id]?.size || 0;
        }

        return {
          id: profile.id,
          email: profile.email || "",
          name: profile.name || null,
          role: role,
          ativo: profile.ativo ?? true,
          ultimo_acesso: profile.ultimo_acesso || null,
          created_at: profile.created_at,
          telefone: profile.telefone || null,
          departamento: profile.departamento || null,
          updated_at: profile.updated_at,
          total_clientes: total_clientes,
        };
      });

      setUsuarios(usuarios);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({
        title: "Erro ao carregar usuários",
        description:
          error?.message || "Não foi possível carregar a lista de usuários",
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

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Email e senha são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setCreatingUser(true);
    try {
      // Criar usuário via Supabase Auth Admin
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: createForm.email,
          password: createForm.password,
          email_confirm: true,
          user_metadata: {
            name: createForm.name || createForm.email.split("@")[0],
          },
        });

      if (authError) throw authError;

      // Aguardar o trigger criar o perfil automaticamente
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Atualizar perfil com dados adicionais
      if (createForm.telefone || createForm.departamento) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            telefone: createForm.telefone || null,
            departamento: createForm.departamento || null,
          })
          .eq("id", authData.user.id);

        if (profileError) throw profileError;
      }

      // Inserir role
      if (createForm.role !== "usuario") {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: createForm.role as "admin" | "gestor" | "usuario",
          });

        if (roleError) throw roleError;
      }

      toast({
        title: "Usuário criado com sucesso!",
        description: `${createForm.name || createForm.email} foi criado`,
      });

      setShowCreateModal(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        role: "usuario",
        telefone: "",
        departamento: "",
      });
      loadUsuarios();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Não foi possível criar o usuário",
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editFormData.name,
          telefone: editFormData.telefone,
          departamento: editFormData.departamento,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "Usuário atualizado",
        description: "Informações do usuário foram atualizadas com sucesso",
      });

      setShowEditModal(false);
      loadUsuarios();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      // Deletar usuário do auth (cascade vai deletar profile e roles)
      const { error } = await supabase.auth.admin.deleteUser(selectedUser.id);

      if (error) throw error;

      toast({
        title: "Usuário removido",
        description: "O usuário foi removido do sistema",
      });

      setShowDeleteModal(false);
      loadUsuarios();
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
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

  const openDeleteModal = (user: Usuario) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: "bg-red-500/10 text-red-500 border-red-500/20",
      gestor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      usuario: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    };
    const labels = {
      admin: "Administrador",
      gestor: "Gestor",
      usuario: "Usuário",
    };
    return (
      <Badge variant="outline" className={styles[role as keyof typeof styles]}>
        {labels[role as keyof typeof labels]}
      </Badge>
    );
  };

  const filteredUsuarios = usuarios.filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.telefone?.includes(searchTerm);

    const matchesRole = filterRole === "todos" || user.role === filterRole;
    const matchesStatus =
      filterStatus === "todos" ||
      (filterStatus === "ativo" && user.ativo) ||
      (filterStatus === "inativo" && !user.ativo);

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários e suas permissões
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadUsuarios}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os cargos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os cargos</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="usuario">Usuário</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsuarios.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum usuário encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name || "Sem nome"}</span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </span>
                        {user.telefone && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.telefone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          user.ativo
                            ? "bg-green-500/10 text-green-500"
                            : "bg-gray-500/10 text-gray-500"
                        }
                      >
                        {user.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.ultimo_acesso ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(user.ultimo_acesso), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Nunca acessou
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role === "admin" || user.role === "gestor" ? (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {user.total_clientes || 0}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteModal(user)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Criar Usuário */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
                placeholder="Senha forte"
              />
            </div>
            <div>
              <Label htmlFor="role">Cargo</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario">Usuário</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={createForm.telefone}
                onChange={(e) =>
                  setCreateForm({ ...createForm, telefone: e.target.value })
                }
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label htmlFor="departamento">Departamento</Label>
              <Input
                id="departamento"
                value={createForm.departamento}
                onChange={(e) =>
                  setCreateForm({ ...createForm, departamento: e.target.value })
                }
                placeholder="Marketing, Vendas, etc"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={creatingUser}>
              {creatingUser ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={editFormData.telefone}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, telefone: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Departamento</Label>
              <Input
                value={editFormData.departamento}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    departamento: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditUser}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Deletar */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{" "}
              <strong>{selectedUser?.name || selectedUser?.email}</strong>? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
