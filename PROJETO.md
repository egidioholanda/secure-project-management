# Secure Project Management

Aplicação web de gestão de projetos, oportunidades comerciais, equipes e cronogramas, com controle de acesso por perfil de usuário e um assistente de IA integrado.

## Stack técnica

- **Frontend**: Vite + React 18 + TypeScript
- **UI**: shadcn-ui (Radix UI) + Tailwind CSS
- **Roteamento**: React Router DOM
- **Dados/estado servidor**: TanStack Query (React Query)
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions em Deno)
- **IA**: Anthropic Claude SDK (via Edge Function `ai-agent`)
- **Outras libs relevantes**: Leaflet/react-leaflet (mapa), Recharts (gráficos), jsPDF/html2canvas/mammoth/react-pdf (documentos), react-hook-form + zod (formulários), date-fns
- **Testes**: Playwright
- **Deploy**: Vercel (`vercel.json`)

## Origem

Projeto originado na plataforma [Lovable](https://lovable.dev) (ver README.md), atualmente mantido também via IDE local/Claude Code.

## Estrutura principal (`src/`)

- `pages/` — telas da aplicação (uma por rota): Dashboards (Operacional, Comercial, Admin), Projetos, Oportunidades, Catálogo, Cronogramas, Relatórios, Clientes, Equipes, Usuários, Configurações, Auditoria, Mapa, Login/Reset de senha, Aprovação pendente.
- `components/` — componentes organizados por domínio (Dashboard, Projects, Opportunities, Catalog, Schedules, Reports, Clients, Teams, Users, Settings, AIAssistant, Layout) + `ui/` (biblioteca shadcn).
- `contexts/` — `AuthContext` (autenticação, perfil, permissões) e `SidebarContext`.
- `hooks/` — hooks de dados por domínio (useProjects, useOpportunities, useTeams, useClients, useSchedules, useReports, useAuditLogs, useAIAgent, useAISettings, useAIContext, etc.).
- `types/` — tipos de domínio (project, report, schedule, teams).
- `integrations/supabase/` — cliente Supabase.

## Módulos funcionais

- **Dashboards**: visões Operacional, Comercial e Admin (KPIs, desempenho de equipes, disponibilidade, tarefas aguardando material).
- **Oportunidades / Pipeline comercial**: gestão de oportunidades, produtos/serviços associados, conversão em projeto/cliente.
- **Projetos**: cadastro e acompanhamento de projetos, documentos, apresentações (presentation pages, com suporte a PDF/DOCX).
- **Cronogramas**: tarefas com dependências, bloqueios por cliente, Gantt (drag), notificações de tarefas.
- **Equipes**: membros, papéis (responsável/técnico), disponibilidade e desempenho.
- **Catálogo**: produtos e serviços.
- **Clientes**: cadastro de clientes e grupos de clientes (com sincronização).
- **Relatórios**: relatórios por projeto (incluindo clientes de manutenção).
- **Mapa**: visualização geográfica (Leaflet) de projetos/dispositivos.
- **Usuários**: gestão de usuários, aprovação de cadastro (self-register + `create-user` Edge Function), perfis e páginas permitidas por perfil.
- **Auditoria**: log de ações do sistema (audit_logs), visível a administradores.
- **Configurações**: configurações da empresa, IA e calendário.
- **Assistente de IA**: chat integrado (Edge Function `ai-agent`, Anthropic Claude) com ferramentas para listar/criar/atualizar tarefas, projetos e equipes diretamente via linguagem natural.

## Controle de acesso

- Autenticação via Supabase Auth; perfil (`profile`) com `approval_status` (usuários pendentes veem tela `PendingApproval`).
- Acesso por página controlado por `allowedPages` do perfil; administradores (`isAdmin`) têm acesso irrestrito, incluindo `/auditoria`.
- Row Level Security (RLS) no Postgres — ver migrations de "security hardening", políticas de storage e perfis por papel.

## Backend Supabase

- **Migrations** (`supabase/migrations/`): evolução do schema desde jan/2026 até jul/2026, incluindo: tabela de serviços, dependências de tarefas, hardening de RLS/storage, equipes e recursos, grupos de clientes, configurações/contexto de IA, logs de auditoria, apresentações com suporte a PDF/DOCX, bloqueio de tarefas por cliente.
- **Edge Functions** (`supabase/functions/`):
  - `ai-agent` — assistente de IA com ferramentas (tools) para consultar e manipular projetos, tarefas e equipes.
  - `create-user` — criação administrativa de usuários.
  - `self-register` — autocadastro de usuários (com fluxo de aprovação).

## Scripts

```bash
npm run dev        # ambiente de desenvolvimento
npm run build       # build de produção
npm run build:dev   # build em modo development
npm run lint         # eslint
npm run preview      # preview do build
```
