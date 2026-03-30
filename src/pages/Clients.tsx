import { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useClients, useMaintenanceContracts, useMaintenanceOrders, Client } from "@/hooks/useClients";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import { AddClientDialog } from "@/components/Clients/AddClientDialog";
import { AddContractDialog } from "@/components/Clients/AddContractDialog";
import { AddScheduleDialog } from "@/components/Clients/AddScheduleDialog";
import { MaintenanceOrderDialog } from "@/components/Clients/MaintenanceOrderDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Users, Plus, Search, Building2, Phone, Mail, MapPin, FileText,
  ClipboardList, ChevronRight, Calendar, Wrench, CheckCircle2, Clock,
  AlertCircle, XCircle, Pencil, Trash2, CalendarClock, RotateCcw, Power, PowerOff
} from "lucide-react";
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
  const { contracts, deleteContract } = useMaintenanceContracts(client.id);
  const { orders, deleteOrder } = useMaintenanceOrders(client.id);
  const [addContract, setAddContract] = useState(false);
  const [addOrder, setAddOrder] = useState(false);
  const [editOrder, setEditOrder] = useState<any>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [deleteContractId, setDeleteContractId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> Clientes
        </Button>
        <span className="text-muted-foreground">/</span>
        <h2 className="text-xl font-bold text-foreground">{client.name}</h2>
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

      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts" className="gap-2">
            <FileText className="w-4 h-4" /> Contratos ({contracts.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ClipboardList className="w-4 h-4" /> Ordens de Serviço ({orders.length})
          </TabsTrigger>
        </TabsList>

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
                      <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => setDeleteContractId(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
      </Tabs>

      <AddContractDialog open={addContract} onOpenChange={setAddContract} clientId={client.id} />
      <MaintenanceOrderDialog open={addOrder || !!editOrder} onOpenChange={(v) => { setAddOrder(false); if (!v) setEditOrder(null); }} clientId={client.id} order={editOrder} />

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
    </div>
  );
}

export default function Clients() {
  const { clients, isLoading, deleteClient } = useClients();
  const [addClient, setAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedClient) {
    const updated = clients.find((c) => c.id === selectedClient.id) || selectedClient;
    return <ClientDetail client={updated} onBack={() => setSelectedClient(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> Clientes
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie clientes e seus contratos de manutenção</p>
        </div>
        <Button onClick={() => setAddClient(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Cliente
        </Button>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total de Clientes", value: clients.length, icon: Building2, color: "text-primary" },
          { label: "Contratos Ativos", value: "-", icon: FileText, color: "text-chart-2" },
          { label: "OS Agendadas", value: "-", icon: Clock, color: "text-chart-1" },
          { label: "OS Concluídas", value: "-", icon: CheckCircle2, color: "text-chart-3" },
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

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar clientes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
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
                        <p className="font-semibold truncate">{client.name}</p>
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
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
