import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from "@/components/layout/AppLayout";
import AuthPage from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Boards from "./pages/Boards";
import ClientDetail from "./pages/ClientDetail";
import Accounts from "./pages/ContasCliente";
import Clientes from "./pages/Clientes";
import ClienteDetail from "./pages/ClienteDetail";
import ClienteEdit from "./pages/ClienteEdit";
import Training from "./pages/Training";
import TrainingDetail from "./pages/TrainingDetail";
import AddTraining from "./pages/AddTraining";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import RelatorioN8n from "./pages/RelatorioN8n";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/boards" element={
              <ProtectedRoute>
                <AppLayout>
                  <Boards />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/clientes" element={
              <ProtectedRoute>
                <AppLayout>
                  <Clientes />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/clientes/:id" element={
              <ProtectedRoute>
                <AppLayout>
                  <ClienteDetail />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/clientes/:id/editar" element={
              <ProtectedRoute>
                <AppLayout>
                  <ClienteEdit />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/contas" element={
              <ProtectedRoute>
                <AppLayout>
                  <Accounts />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/contas/:id" element={
              <ProtectedRoute>
                <AppLayout>
                  <ClientDetail />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/capacitacao" element={
              <ProtectedRoute>
                <AppLayout>
                  <Training />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/capacitacao/:id" element={
              <ProtectedRoute>
                <AppLayout>
                  <TrainingDetail />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/capacitacao/adicionar" element={
              <ProtectedRoute>
                <AppLayout>
                  <AddTraining />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute>
                <AppLayout>
                  <Users />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/configuracao" element={
              <ProtectedRoute>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/relatorio-n8n" element={
              <ProtectedRoute>
                <AppLayout>
                  <RelatorioN8n />
                </AppLayout>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;