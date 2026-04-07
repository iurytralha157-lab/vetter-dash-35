## Plano de Simplificação - Contas & Onboarding

### 1. Remover Onboarding Público
- Remover rota `/onboarding` do App.tsx
- Desativar/remover página `ClientOnboarding.tsx` e componentes relacionados (StepContato, StepIdentificacao, StepNichoRegiao, StepEquipe, StepGestores, StepOrcamento, StepRevisao)

### 2. Simplificar Formulário de Nova Conta (ClientForm / ModernAccountForm)
**Campos a MANTER:**
- Nome da conta (obrigatório)
- Telefone (opcional, não obrigatório)
- ID do Grupo (obrigatório) — corrigir bug de não exibir valor salvo ao editar
- Link do Drive (opcional)
- Canais de anúncio (Meta/Google)
- Horário do relatório
- Notificação de saldo baixo (toggle)
- Erro de sincronização (toggle)
- Saldo Meta atual
- Alerta saldo baixo (default: R$ 200)
- Budget mensal Meta
- Google Ads ID / Budget Google

**Campos a REMOVER:**
- Gestor Responsável → auto-assign para o usuário logado
- Cliente → remover do formulário
- Observações
- Canal do Relatório → hardcode "WhatsApp"
- Templates Padrão (inteiro)
- Notificação Leads Diários
- UTM Padrão
- Link Meta Ads
- Webhook (receber dados de conversão)
- Permitir ativação automática de campanhas
- Monitorar saldo (já é automático)
- Seção Analytics/Rastreamento inteira (Pixel, GA4, GTM, Typebot)
- Seção Financeiro (forma pagamento, centro custo, contrato)
- Seção Permissões (papel padrão, usuários vinculados, ranking, métricas)

### 3. Defaults automáticos
- Status: sempre "Ativo"
- Gestor: usuário logado
- Canal relatório: "WhatsApp"
- Alerta saldo baixo: 200

### 4. Corrigir bugs
- ID do Grupo não aparece ao editar conta existente
