import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Download, Save, Trash2, Plus, Minus, X, ImageIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PlacedDevice, Proposal, ProposalItem, Project, Device } from "@/types/project";
import { useDevices } from "@/hooks/useDevices";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ProposalPDFPreview } from "./ProposalPDFPreview";

interface ProposalEditorProps {
  project: Project;
  placedDevices: PlacedDevice[];
  onBack: () => void;
  existingProposalId?: string;
}

const ProposalEditor = ({ project, placedDevices, onBack, existingProposalId }: ProposalEditorProps) => {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const proposalRef = useRef<HTMLDivElement>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const { devices: catalogDevices, categories, loading: loadingDevices } = useDevices();

  const [formData, setFormData] = useState({
    title: `Proposta Comercial - ${project.name}`,
    client_name: project.client,
    client_email: "",
    client_phone: "",
    client_address: project.address || "",
    introduction: `Prezado(a) ${project.client},\n\nApresentamos nossa proposta comercial para o projeto ${project.name}.`,
    scope: "Esta proposta contempla o fornecimento e instalação dos equipamentos listados abaixo.",
    validity_days: 30,
    payment_terms: "50% na assinatura do contrato, 50% na entrega.",
    warranty_terms: "12 meses de garantia em todos os equipamentos e serviços.",
    notes: "",
    discount_percentage: 0,
  });

  // Flag para controlar se já inicializou os itens
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Só carrega/gera uma vez na inicialização
    if (initialized) return;
    
    if (existingProposalId) {
      loadExistingProposal();
    } else if (placedDevices.length > 0 || items.length === 0) {
      generateProposalItems();
    }
    setInitialized(true);
  }, [existingProposalId]);

  const loadExistingProposal = async () => {
    if (!existingProposalId) return;
    
    try {
      const { data: proposalData, error: proposalError } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", existingProposalId)
        .single();

      if (proposalError) throw proposalError;

      if (proposalData) {
        setProposal(proposalData as Proposal);
        setFormData({
          title: proposalData.title || "",
          client_name: proposalData.client_name || "",
          client_email: proposalData.client_email || "",
          client_phone: proposalData.client_phone || "",
          client_address: proposalData.client_address || "",
          introduction: proposalData.introduction || "",
          scope: proposalData.scope || "",
          validity_days: proposalData.validity_days || 30,
          payment_terms: proposalData.payment_terms || "",
          warranty_terms: proposalData.warranty_terms || "",
          notes: proposalData.notes || "",
          discount_percentage: proposalData.discount_percentage || 0,
        });

        const { data: itemsData, error: itemsError } = await supabase
          .from("proposal_items")
          .select("*")
          .eq("proposal_id", existingProposalId);

        if (itemsError) throw itemsError;
        setItems(itemsData as ProposalItem[]);
      }
    } catch (error) {
      console.error("Error loading proposal:", error);
      toast.error("Erro ao carregar proposta");
    } finally {
      setLoading(false);
    }
  };

  const generateProposalItems = () => {
    // Agrupar dispositivos por tipo
    const grouped = placedDevices.reduce((acc, pd) => {
      const deviceId = pd.device_id;
      if (!acc[deviceId]) {
        acc[deviceId] = {
          device: pd.device,
          quantity: 0,
        };
      }
      acc[deviceId].quantity += 1;
      return acc;
    }, {} as Record<string, { device: PlacedDevice["device"]; quantity: number }>);

    const newItems: ProposalItem[] = Object.values(grouped).map((item, index) => ({
      id: `temp-${index}`,
      proposal_id: "",
      device_id: item.device?.id || null,
      device_name: item.device?.name || "Dispositivo",
      quantity: item.quantity,
      unit_price: item.device?.unit_price || 0,
      installation_price: item.device?.installation_price || 0,
      subtotal: item.quantity * ((item.device?.unit_price || 0) + (item.device?.installation_price || 0)),
    }));

    setItems(newItems);
    setLoading(false);
  };

  const calculateTotals = () => {
    const totalDevices = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const totalInstallation = items.reduce((sum, item) => sum + item.quantity * item.installation_price, 0);
    const subtotal = totalDevices + totalInstallation;
    const discountAmount = subtotal * (formData.discount_percentage / 100);
    const grandTotal = subtotal - discountAmount;

    return { totalDevices, totalInstallation, discountAmount, grandTotal };
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setCompanyLogo(e.target?.result as string);
      toast.success("Logo adicionada!");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setCompanyLogo(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  const handleUpdateItemQuantity = (itemId: string, delta: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return {
          ...item,
          quantity: newQuantity,
          subtotal: newQuantity * (item.unit_price + item.installation_price),
        };
      }
      return item;
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    if (items.length <= 1) {
      toast.error("A proposta deve ter pelo menos um item");
      return;
    }
    setItems(items.filter(item => item.id !== itemId));
  };

  const handleAddCatalogItem = (device: Device) => {
    // Verifica se o item já existe na proposta
    const existingItem = items.find(item => item.device_id === device.id);
    
    if (existingItem) {
      // Incrementa a quantidade se já existir
      handleUpdateItemQuantity(existingItem.id, 1);
      toast.success("Quantidade atualizada!");
    } else {
      // Adiciona novo item
      const newProposalItem: ProposalItem = {
        id: `catalog-${Date.now()}`,
        proposal_id: proposal?.id || "",
        device_id: device.id,
        device_name: device.name,
        quantity: 1,
        unit_price: device.unit_price,
        installation_price: device.installation_price,
        subtotal: device.unit_price + device.installation_price,
      };
      setItems([...items, newProposalItem]);
      toast.success("Item adicionado à proposta!");
    }
    setShowAddItem(false);
    setCatalogSearch("");
  };

  const filteredCatalogDevices = catalogDevices.filter(device =>
    device.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    (device.brand && device.brand.toLowerCase().includes(catalogSearch.toLowerCase())) ||
    (device.model && device.model.toLowerCase().includes(catalogSearch.toLowerCase()))
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const totals = calculateTotals();

      if (proposal) {
        // Atualizar proposta existente
        const { error: proposalError } = await supabase
          .from("proposals")
          .update({
            title: formData.title,
            client_name: formData.client_name,
            client_email: formData.client_email,
            client_phone: formData.client_phone,
            client_address: formData.client_address,
            introduction: formData.introduction,
            scope: formData.scope,
            validity_days: formData.validity_days,
            payment_terms: formData.payment_terms,
            warranty_terms: formData.warranty_terms,
            notes: formData.notes,
            discount_percentage: formData.discount_percentage,
            total_devices: totals.totalDevices,
            total_installation: totals.totalInstallation,
            total_discount: totals.discountAmount,
            grand_total: totals.grandTotal,
          })
          .eq("id", proposal.id);

        if (proposalError) throw proposalError;

        // Deletar itens antigos e inserir novos
        await supabase
          .from("proposal_items")
          .delete()
          .eq("proposal_id", proposal.id);

        const itemsToInsert = items.map((item) => ({
          proposal_id: proposal.id,
          device_id: item.device_id,
          device_name: item.device_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          installation_price: item.installation_price,
          subtotal: item.subtotal,
        }));

        const { data: savedItems, error: itemsError } = await supabase
          .from("proposal_items")
          .insert(itemsToInsert)
          .select();

        if (itemsError) throw itemsError;
        
        // Atualiza o estado local com os itens salvos (com IDs reais do banco)
        if (savedItems) {
          setItems(savedItems as ProposalItem[]);
        }

        toast.success("Proposta atualizada com sucesso!");
      } else {
        // Criar nova proposta
        const { data: savedProposal, error: proposalError } = await supabase
          .from("proposals")
          .insert({
            project_id: project.id,
            title: formData.title,
            client_name: formData.client_name,
            client_email: formData.client_email,
            client_phone: formData.client_phone,
            client_address: formData.client_address,
            introduction: formData.introduction,
            scope: formData.scope,
            validity_days: formData.validity_days,
            payment_terms: formData.payment_terms,
            warranty_terms: formData.warranty_terms,
            notes: formData.notes,
            discount_percentage: formData.discount_percentage,
            total_devices: totals.totalDevices,
            total_installation: totals.totalInstallation,
            total_discount: totals.discountAmount,
            grand_total: totals.grandTotal,
            status: "draft",
          })
          .select()
          .single();

        if (proposalError) throw proposalError;

        // Salvar itens
        const itemsToInsert = items.map((item) => ({
          proposal_id: savedProposal.id,
          device_id: item.device_id,
          device_name: item.device_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          installation_price: item.installation_price,
          subtotal: item.subtotal,
        }));

        const { data: savedItems, error: itemsError } = await supabase
          .from("proposal_items")
          .insert(itemsToInsert)
          .select();

        if (itemsError) throw itemsError;

        setProposal(savedProposal as Proposal);
        
        // Atualiza o estado local com os itens salvos (com IDs reais do banco)
        if (savedItems) {
          setItems(savedItems as ProposalItem[]);
        }
        
        toast.success("Proposta salva com sucesso!");
      }
    } catch (error) {
      console.error("Error saving proposal:", error);
      toast.error("Erro ao salvar proposta");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!proposalRef.current) return;

    toast.info("Gerando PDF...");

    try {
      const element = proposalRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calculate ratio to fit width perfectly
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;
      
      // Handle multi-page if content is too long
      let position = 0;
      let remainingHeight = scaledHeight;
      
      while (remainingHeight > 0) {
        if (position > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(
          imgData,
          "PNG",
          0,
          position > 0 ? -(position / ratio) * ratio : 0,
          pdfWidth,
          scaledHeight
        );
        
        remainingHeight -= pdfHeight;
        position += pdfHeight;
      }

      pdf.save(`${formData.title.replace(/\s+/g, "_")}.pdf`);

      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-2xl font-bold">Proposta Comercial</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button onClick={handleExportPDF} className="bg-gradient-primary">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Edição */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Informações da Proposta</h3>

          <div>
            <Label>Título</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cliente</Label>
              <Input
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Validade (dias)</Label>
              <Input
                type="number"
                value={formData.validity_days}
                onChange={(e) =>
                  setFormData({ ...formData, validity_days: parseInt(e.target.value) || 30 })
                }
              />
            </div>
          </div>

          <div>
            <Label>Endereço</Label>
            <Input
              value={formData.client_address}
              onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
            />
          </div>

          <div>
            <Label>Introdução</Label>
            <Textarea
              value={formData.introduction}
              onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label>Escopo</Label>
            <Textarea
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <Label>Condições de Pagamento</Label>
            <Textarea
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <Label>Garantia</Label>
            <Textarea
              value={formData.warranty_terms}
              onChange={(e) => setFormData({ ...formData, warranty_terms: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <Label>Desconto (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.discount_percentage}
              onChange={(e) =>
                setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <Separator />

          {/* Logo da Empresa */}
          <div>
            <Label>Logo da Empresa</Label>
            <div className="mt-2">
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              {companyLogo ? (
                <div className="flex items-center gap-4">
                  <img
                    src={companyLogo}
                    alt="Logo da empresa"
                    className="h-16 w-auto object-contain border rounded p-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remover
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Adicionar Logo
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Edição de Itens */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-lg font-semibold">Itens da Proposta</Label>
                <p className="text-sm text-muted-foreground">
                  Edite as quantidades, remova ou adicione itens manualmente
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddItem(!showAddItem)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Item
              </Button>
            </div>

            {/* Lista de produtos do catálogo */}
            {showAddItem && (
              <div className="p-4 mb-4 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Selecionar do Catálogo</h4>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAddItem(false); setCatalogSearch(""); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto por nome, marca ou modelo..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {loadingDevices ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Carregando catálogo...</p>
                  ) : filteredCatalogDevices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {catalogSearch ? "Nenhum produto encontrado" : "Nenhum produto no catálogo"}
                    </p>
                  ) : (
                    filteredCatalogDevices.map((device) => {
                      const category = categories.find(c => c.id === device.category_id);
                      const isAlreadyAdded = items.some(item => item.device_id === device.id);
                      
                      return (
                        <div
                          key={device.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            isAlreadyAdded 
                              ? "bg-primary/10 border-primary/30 hover:bg-primary/20" 
                              : "bg-background hover:bg-muted"
                          }`}
                          onClick={() => handleAddCatalogItem(device)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{device.name}</p>
                              {isAlreadyAdded && (
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                  Já adicionado
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {category && <span>{category.name}</span>}
                              {device.brand && <span>• {device.brand}</span>}
                              {device.model && <span>• {device.model}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-primary">
                              {formatCurrency(device.unit_price + device.installation_price)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Equip: {formatCurrency(device.unit_price)} + Inst: {formatCurrency(device.installation_price)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.device_name}</p>
                      {!item.device_id && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Manual
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.unit_price + item.installation_price)} / unid.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleUpdateItemQuantity(item.id, -1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleUpdateItemQuantity(item.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Preview da Proposta para PDF */}
        <Card className="p-0 overflow-hidden">
          <ProposalPDFPreview
            ref={proposalRef}
            formData={formData}
            items={items}
            totals={totals}
            companyLogo={companyLogo}
          />
        </Card>
      </div>
    </div>
  );
};

export default ProposalEditor;
