import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/hooks/useProjects";
import { useClients, useMaintenanceContracts, useMaintenanceOrders, useContractClients, Client, MaintenanceOrder } from "@/hooks/useClients";
import { useClientGroups } from "@/hooks/useClientGroups";
import { useAuthContext } from "@/contexts/AuthContext";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import { useCompanySettings } from "@/hooks/useCompanySettings";

import { AddClientDialog } from "@/components/Clients/AddClientDialog";
import { EditClientDialog } from "@/components/Clients/EditClientDialog";
import { AddContractDialog } from "@/components/Clients/AddContractDialog";
import { EditContractDialog } from "@/components/Clients/EditContractDialog";
import { AddScheduleDialog } from "@/components/Clients/AddScheduleDialog";
import { MaintenanceOrderDialog } from "@/components/Clients/MaintenanceOrderDialog";
import { MaintenanceOrderPDFPreview } from "@/components/Clients/MaintenanceOrderPDFPreview";
import { exportMaintenanceOrderToPDF } from "@/utils/exportMaintenanceOrderPDF";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Plus, Search, Building2, Phone, Mail, MapPin, FileText,
  ClipboardList, ChevronRight, Calendar, Wrench, CheckCircle2, Clock,
  AlertCircle, XCircle, Pencil, Trash2, CalendarClock, RotateCcw, Power, PowerOff, Download, Briefcase, ChevronDown, Receipt, Eye, FolderOpen, Filter, X
} from "lucide-react";
import ProposalEditor from "@/components/Projects/ProposalEditor";

import ProjectDocumentsSection from "@/components/Projects/ProjectDocumentsSection";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const contractTypeBadge: Record<string, { label: string; className: string }> = {
  preventive: { label: "Preventiva", className: "bg-blue-100 text-blue-700" },
  corrective: { label: "Corretiva", className: "bg-orange-100 text-orange-700" },
  both: { label: "Prev. + Corret.", className: "bg-purple-100 text-purple-700" },
};

const contractStatusBadge: Record<string, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-green-100 text-green-700" },
  inactive: { label: "Inativo", className: "bg-gray-100 text-gray-600" },
  expired: { label: "Vencido", className: "bg-red-100 text-red-700" },
};

const orderStatusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  scheduled: { label: "Agendada", icon: Clock, className: "bg-blue-100 text-blue-700" },
  in_progress: { label: "Em Andamento", icon: Wrench, className: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Concluída", icon: CheckCircle2, className: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", icon: XCircle, className: "bg-red-100 text-red-700" },
};

const periodicityLabel: Record<string, string> = {
  monthly: "Mensal", quarterly: "Trimestral", semiannual: "Semestral", annual: "Anual",
};

interface ClientDetailProps {
  client: Client;
  onBack: () => void;
}

function ClientDetail({ client, onBack }: ClientDetailProps) {
  const { deleteClient } = useClients();
  const { allowedClientIds, allowedClientGroupIds, isAdmin } = useAuthContext();
  const { projects } = useProjects(isAdmin ? null : allowedClientIds, isAdmin ? null : allowedClientGroupIds);
  const { contracts, deleteContract } = useMaintenanceContracts(client.id);
  const { orders, deleteOrder } = useMaintenanceOrders(client.id);
  const { schedules, deleteSchedule, updateSchedule } = useMaintenanceSchedules(client.id);
  const { settings: companySettings } = useCompanySettings();
  const clientProjects = projects.filter(
    (p) => p.clientId === client.id || (client.project_id && p.id === client.project_id)
  );
  const projectIds = clientProjects.map((p) => p.id);
  const { data: proposals = [] } = useQuery({
    queryKey: ["client-proposals", client.id, projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: projectIds.length > 0,
  });

  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [addContract, setAddContract] = useState(false);
  const [addOrder, setAddOrder] = useState(false);
  const [addSchedule, setAddSchedule] = useState(false);
  const [editOrder, setEditOrder] = useState<any>(null);
  const [editClient, setEditClient] = useState(false);
  const [editContract, setEditContract] = useState<any>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [deleteContractId, setDeleteContractId] = useState<string | null>(null);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const [exportingOrderId, setExportingOrderId] = useState<string | null>(null);
  const [viewingProposal, setViewingProposal] = useState<{ proposalId: string; projectId: string; autoExport?: boolean } | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async (order: MaintenanceOrder) => {
    setExportingOrderId(order.id);
    // Wait for render
    await new Promise((r) => setTimeout(r, 500));
    if (pdfRef.current) {
      await exportMaintenanceOrderToPDF(pdfRef.current, order.title);
    }
    setExportingOrderId(null);
  };

  if (viewingProposal) {
    const proj = clientProjects.find((p) => p.id === viewingProposal.projectId);
    if (proj) {
      return (
        <ProposalEditor
          project={proj}
          placedDevices={[]}
          existingProposalId={viewingProposal.proposalId}
          autoExport={viewingProposal.autoExport}
          onBack={() => setViewingProposal(null)}
        />
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ChevronRight className="w-4 h-4 rotate-180" /> Clientes
          </Button>
          <span className="text-muted-foreground">/</span>
          <h2 className="text-xl font-bold text-foreground">{client.name}</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditClient(true)} className="gap-2">
          <Pencil className="w-4 h-4" /> Editar Cliente
        </Button>
      </div>

      {/* Dados do cliente */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {client.contact_name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4 shrink-0" /> {client.contact_name}
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0" /> {client.phone}
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0" /> {client.email}
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground col-span-2">
                <MapPin className="w-4 h-4 shrink-0" /> {client.address}
              </div>
            )}
            {client.project?.name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4 shrink-0" /> Projeto: {client.project.name}
              </div>
            )}
          </div>
          {client.notes && <p className="mt-3 text-sm text-muted-foreground border-t pt-3">{client.notes}</p>}
        </CardContent>
      </Card>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects" className="gap-2">
            <Briefcase className="w-4 h-4" /> Projetos ({clientProjects.length})
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2">
            <FileText className="w-4 h-4" /> Contratos ({contracts.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ClipboardList className="w-4 h-4" /> Ordens de Serviço ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="schedules" className="gap-2">
            <CalendarClock className="w-4 h-4" /> Agendamentos ({schedules.length})
          </TabsTrigger>
          <TabsTrigger value="proposals" className="gap-2">
            <Receipt className="w-4 h-4" /> Propostas ({proposals.length})
          </TabsTrigger>
        </TabsList>




        <TabsContent value="projects" className="space-y-3 mt-4">
          {clientProjects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhum projeto vinculado a este cliente</p>
              <p className="text-sm mt-1">Vincule projetos na página de Projetos</p>
            </div>
          ) : (
            clientProjects.map((p) => (
              <Card key={p.id}>
                <Collapsible
                  open={expandedProject === p.id}
                  onOpenChange={(o) => setExpandedProject(o ? p.id : null)}
                >
                  <CollapsibleTrigger className="w-full text-left">
                    <CardContent className="pt-4 pb-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Briefcase className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{p.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="text-xs">{p.type}</Badge>
                              <span>{p.status}</span>
                              {p.value && <span className="text-success font-medium">{p.value}</span>}
                            </div>
                          </div>
                        </div>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            expandedProject === p.id && "rotate-180"
                          )}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <ProjectDocumentsSection projectId={p.id} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </TabsContent>


        <TabsContent value="contracts" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAddContract(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Contrato
            </Button>
          </div>
          {contracts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhum contrato cadastrado</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {contracts.map((c) => (
                <Card key={c.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{c.title}</span>
                          <Badge className={cn("text-xs", contractTypeBadge[c.type]?.className)}>
                            {contractTypeBadge[c.type]?.label}
                          </Badge>
                          <Badge className={cn("text-xs", contractStatusBadge[c.status]?.className)}>
                            {contractStatusBadge[c.status]?.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {c.periodicity && <span>{periodicityLabel[c.periodicity]}</span>}
                          {c.value > 0 && <span>R$ {c.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês</span>}
                          {c.start_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(c.start_date + "T00:00"), "dd/MM/yyyy")}</span>}
                          {c.end_date && <span>até {format(new Date(c.end_date + "T00:00"), "dd/MM/yyyy")}</span>}
                        </div>
                        {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => setEditContract(c)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteContractId(c.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAddOrder(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Nova OS
            </Button>
          </div>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhuma ordem de serviço cadastrada</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {orders.map((o) => {
                const statusCfg = orderStatusConfig[o.status];
                const StatusIcon = statusCfg?.icon || Clock;
                return (
                  <Card key={o.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{o.title}</span>
                            <Badge className={cn("text-xs gap-1", statusCfg?.className)}>
                              <StatusIcon className="w-3 h-3" /> {statusCfg?.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {o.type === "preventive" ? "Preventiva" : "Corretiva"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            {o.technician && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{o.technician}</span>}
                            {o.scheduled_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Agendada: {format(new Date(o.scheduled_date + "T00:00"), "dd/MM/yyyy")}</span>}
                            {o.completed_date && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Concluída: {format(new Date(o.completed_date + "T00:00"), "dd/MM/yyyy")}</span>}
                          </div>
                          {o.equipment_attended && o.equipment_attended.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {o.equipment_attended.map((eq, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{eq}</Badge>
                              ))}
                            </div>
                          )}
                          {o.photos && o.photos.length > 0 && (
                            <div className="flex gap-1">
                              {o.photos.slice(0, 5).map((p) => (
                                <img key={p.id} src={p.url} className="w-10 h-10 rounded object-cover border" />
                              ))}
                              {o.photos.length > 5 && <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">+{o.photos.length - 5}</div>}
                            </div>
                          )}
                          {o.signature_url && (
                            <div className="flex items-center gap-1 text-xs text-chart-3">
                              <CheckCircle2 className="w-3 h-3" /> Assinatura coletada
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" title="Exportar PDF" disabled={exportingOrderId === o.id} onClick={() => handleExportPDF(o)}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditOrder(o)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteOrderId(o.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAddSchedule(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Agendamento
            </Button>
          </div>
          {schedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhum agendamento recorrente cadastrado</p>
              <p className="text-sm mt-1">Crie agendamentos para manutenções preventivas automáticas</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {schedules.map((s) => (
                <Card key={s.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{s.title}</span>
                          <Badge className={cn("text-xs", contractTypeBadge[s.type]?.className)}>
                            {contractTypeBadge[s.type]?.label || s.type}
                          </Badge>
                          <Badge className={cn("text-xs", s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                            {s.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><RotateCcw className="w-3 h-3" />{periodicityLabel[s.periodicity] || s.periodicity}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Próxima: {format(new Date(s.next_date + "T00:00"), "dd/MM/yyyy")}</span>
                          {s.technician && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{s.technician}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {s.notify_7_days && <span>🔔 7 dias antes</span>}
                          {s.notify_3_days && <span>🔔 3 dias antes</span>}
                          {s.notify_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.notify_email}</span>}
                        </div>
                        {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={s.is_active ? "Desativar" : "Ativar"}
                          onClick={() => updateSchedule.mutate({ id: s.id, is_active: !s.is_active })}
                        >
                          {s.is_active ? <PowerOff className="w-4 h-4 text-muted-foreground" /> : <Power className="w-4 h-4 text-green-600" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteScheduleId(s.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="proposals" className="space-y-3 mt-4">
          {proposals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhuma proposta gerada para os projetos deste cliente</p>
              <p className="text-sm mt-1">As propostas salvas nos projetos aparecerão aqui</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {proposals.map((p: any) => {
                const proj = clientProjects.find((pr) => pr.id === p.project_id);
                const statusMap: Record<string, { label: string; className: string }> = {
                  draft: { label: "Rascunho", className: "bg-gray-100 text-gray-700" },
                  sent: { label: "Enviada", className: "bg-blue-100 text-blue-700" },
                  accepted: { label: "Aceita", className: "bg-green-100 text-green-700" },
                  rejected: { label: "Recusada", className: "bg-red-100 text-red-700" },
                };
                const st = statusMap[p.status] || statusMap.draft;
                return (
                  <Card key={p.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{p.title}</span>
                            <Badge className={cn("text-xs", st.className)}>{st.label}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            {proj && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" /> {proj.name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            {p.validity_days && <span>Validade: {p.validity_days} dias</span>}
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Total: </span>
                            <span className="font-semibold text-success">
                              R$ {Number(p.grand_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Visualizar proposta"
                            onClick={() => setViewingProposal({ proposalId: p.id, projectId: p.project_id })}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Exportar PDF"
                            onClick={() => setViewingProposal({ proposalId: p.id, projectId: p.project_id, autoExport: true })}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>


      <AddContractDialog open={addContract} onOpenChange={setAddContract} clientId={client.id} />
      <EditClientDialog open={editClient} onOpenChange={setEditClient} client={client} />
      {editContract && <EditContractDialog open={!!editContract} onOpenChange={(v) => { if (!v) setEditContract(null); }} clientId={client.id} contract={editContract} />}
      <AddScheduleDialog open={addSchedule} onOpenChange={setAddSchedule} clientId={client.id} />
      <MaintenanceOrderDialog open={addOrder || !!editOrder} onOpenChange={(v) => { setAddOrder(false); if (!v) setEditOrder(null); }} clientId={client.id} order={editOrder} />

      {/* Hidden PDF preview for export */}
      {exportingOrderId && (() => {
        const orderForPdf = orders.find((o) => o.id === exportingOrderId);
        return orderForPdf ? (
          <MaintenanceOrderPDFPreview ref={pdfRef} order={orderForPdf} client={client} companySettings={companySettings} />
        ) : null;
      })()}

      <AlertDialog open={!!deleteOrderId} onOpenChange={() => setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Ordem de Serviço?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => { deleteOrder.mutate(deleteOrderId!); setDeleteOrderId(null); }}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteContractId} onOpenChange={() => setDeleteContractId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Contrato?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => { deleteContract.mutate(deleteContractId!); setDeleteContractId(null); }}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteScheduleId} onOpenChange={() => setDeleteScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Agendamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => { deleteSchedule.mutate(deleteScheduleId!); setDeleteScheduleId(null); }}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Clients() {
  const { allowedClientGroupIds, isAdmin } = useAuthContext();
  const { clients, isLoading, deleteClient } = useClients(isAdmin ? null : allowedClientGroupIds);
  const { data: contractClients = [] } = useContractClients(isAdmin ? null : allowedClientGroupIds);
  const { groups } = useClientGroups();
  const contractClientIds = useMemo(() => new Set(contractClients.map((c) => c.id)), [contractClients]);

  const { data: globalStats } = useQuery({
    queryKey: ['clients-global-stats'],
    queryFn: async () => {
      const [contractsRes, osAgRes, osConclRes] = await Promise.all([
        supabase.from('maintenance_contracts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('maintenance_orders').select('id', { count: 'exact', head: true }).in('status', ['agendada', 'em_andamento']),
        supabase.from('maintenance_orders').select('id', { count: 'exact', head: true }).eq('status', 'concluida'),
      ]);
      return {
        activeContracts: contractsRes.count ?? 0,
        osAgendadas: osAgRes.count ?? 0,
        osConcluidas: osConclRes.count ?? 0,
      };
    },
  });

  const [addClient, setAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editClientInList, setEditClientInList] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterContract, setFilterContract] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");

  const filtered = useMemo(() => {
    let list = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );
    if (filterGroup !== "all") {
      list = list.filter((c) => (c.client_group_id ?? "none") === filterGroup);
    }
    if (filterContract === "yes") {
      list = list.filter((c) => contractClientIds.has(c.id));
    } else if (filterContract === "no") {
      list = list.filter((c) => !contractClientIds.has(c.id));
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "group") return (a.client_group?.name ?? "").localeCompare(b.client_group?.name ?? "");
      if (sortBy === "contact") return (a.contact_name ?? "").localeCompare(b.contact_name ?? "");
      return 0;
    });
    return list;
  }, [clients, search, filterGroup, filterContract, sortBy, contractClientIds]);

  const activeFilterCount = [filterGroup !== "all", filterContract !== "all"].filter(Boolean).length;

  if (selectedClient) {
    const updated = clients.find((c) => c.id === selectedClient.id) || selectedClient;
    return <ClientDetail client={updated} onBack={() => setSelectedClient(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-end">
        <Button onClick={() => setAddClient(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Cliente
        </Button>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total de Clientes", value: clients.length, icon: Building2, color: "text-primary" },
          { label: "Contratos Ativos", value: globalStats?.activeContracts ?? "…", icon: FileText, color: "text-chart-2" },
          { label: "OS Agendadas", value: globalStats?.osAgendadas ?? "…", icon: Clock, color: "text-chart-1" },
          { label: "OS Concluídas", value: globalStats?.osConcluidas ?? "…", icon: CheckCircle2, color: "text-chart-3" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={cn("w-8 h-8 opacity-20", stat.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Busca e Filtros */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
              <SelectItem value="none">Sem grupo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterContract} onValueChange={setFilterContract}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Contrato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="yes">Com contrato ativo</SelectItem>
              <SelectItem value="no">Sem contrato</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome A–Z</SelectItem>
              <SelectItem value="group">Grupo</SelectItem>
              <SelectItem value="contact">Contato</SelectItem>
            </SelectContent>
          </Select>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={() => { setFilterGroup("all"); setFilterContract("all"); }}
            >
              <X className="w-3.5 h-3.5" /> Limpar filtros
              <Badge className="ml-0.5 px-1.5 py-0 text-xs">{activeFilterCount}</Badge>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground pl-0.5">
          {filtered.length} cliente{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Lista */}
      {!isLoading && clients.length === 0 && !isAdmin && allowedClientGroupIds?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Seu perfil não tem acesso a nenhum grupo de clientes.
          Entre em contato com o administrador.
        </div>
      )}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 && !(allowedClientGroupIds?.length === 0 && !isAdmin) ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum cliente encontrado</p>
          <p className="text-sm mt-1">Crie o primeiro cliente clicando em "Novo Cliente"</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => (
            <Card
              key={client.id}
              className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 group"
              onClick={() => setSelectedClient(client)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold truncate">{client.name}</p>
                          {contractClientIds.has(client.id) && (
                            <Badge className="text-xs px-1.5 py-0 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-0 shrink-0">
                              Contrato
                            </Badge>
                          )}
                        </div>
                        {client.cnpj && <p className="text-xs text-muted-foreground">{client.cnpj}</p>}
                      </div>
                    </div>
                    <div className="space-y-1 pl-11">
                      {client.contact_name && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="w-3 h-3" /> {client.contact_name}
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" /> {client.phone}
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground truncate">
                          <Mail className="w-3 h-3 shrink-0" /> {client.email}
                        </div>
                      )}
                      {client.project?.name && (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <FileText className="w-3 h-3" /> {client.project.name}
                        </div>
                      )}
                      {client.client_group?.name && client.client_group.name !== 'Geral' && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FolderOpen className="w-3 h-3" />
                          {client.client_group.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setEditClientInList(client); }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setDeleteClientId(client.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddClientDialog open={addClient} onOpenChange={setAddClient} />
      {editClientInList && <EditClientDialog open={!!editClientInList} onOpenChange={(v) => { if (!v) setEditClientInList(null); }} client={editClientInList} />}

      <AlertDialog open={!!deleteClientId} onOpenChange={() => setDeleteClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Cliente?</AlertDialogTitle>
            <AlertDialogDescription>Todos os contratos e ordens de serviço do cliente serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => { deleteClient.mutate(deleteClientId!); setDeleteClientId(null); }}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
