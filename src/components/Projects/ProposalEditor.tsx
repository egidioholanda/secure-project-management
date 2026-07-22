import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Download, Save, Trash2, Plus, Minus, X, Search, FileText, BookmarkPlus, Wrench, ImagePlus } from "lucide-react";
import { SaveAsTemplateDialog, UseTemplateDialog, type ProposalTemplate, type ProposalTemplateItem } from "./ProposalTemplateDialogs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PlacedDevice, Proposal, ProposalItem, Project, Device, FloorPlan, Service } from "@/types/project";
import { useDevices } from "@/hooks/useDevices";
import { useServices } from "@/hooks/useServices";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePresentationPages } from "@/hooks/usePresentationPages";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ProposalPDFPreview } from "./ProposalPDFPreview";
import { FloorPlanPDFPreview } from "./FloorPlanPDFPreview";

interface ProposalEditorProps {
  project: Project;
  placedDevices: PlacedDevice[];
  onBack: () => void;
  existingProposalId?: string;
  autoExport?: boolean;
}

const ProposalEditor = ({ project, placedDevices, onBack, existingProposalId, autoExport }: ProposalEditorProps) => {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const proposalRef = useRef<HTMLDivElement>(null);
  const floorPlanRef = useRef<HTMLDivElement>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const { devices: catalogDevices, categories, loading: loadingDevices } = useDevices();
  const { services: catalogServices, loading: loadingServices } = useServices();
  const { settings: companySettings } = useCompanySettings();
  const { activePages: presentationPages } = usePresentationPages();
  const [includePresentationPages, setIncludePresentationPages] = useState(false);
  const [includeFloorPlan, setIncludeFloorPlan] = useState(false);
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [floorPlanDevices, setFloorPlanDevices] = useState<PlacedDevice[]>([]);
  const [floorPlanReady, setFloorPlanReady] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showUseTemplate, setShowUseTemplate] = useState(false);
  const [catalogTab, setCatalogTab] = useState<"products" | "services">("products");


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

  // Carregar planta baixa do projeto
  useEffect(() => {
    const loadFloorPlan = async () => {
      try {
        const { data: floorPlanData, error: floorPlanError } = await supabase
          .from("project_floor_plans")
          .select("*")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (floorPlanError) throw floorPlanError;

        if (floorPlanData) {
          setFloorPlan(floorPlanData as FloorPlan);

          const { data: devicesData, error: devicesError } = await supabase
            .from("floor_plan_devices")
            .select("*, device:devices(*)")
            .eq("floor_plan_id", floorPlanData.id);

          if (devicesError) throw devicesError;
          setFloorPlanDevices(devicesData as PlacedDevice[]);
        }
      } catch (error) {
        console.error("Error loading floor plan:", error);
      }
    };

    loadFloorPlan();
  }, [project.id]);

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
      featured_in_gallery: false,
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

  const handleSetItemQuantity = (itemId: string, value: string) => {
    const parsed = parseInt(value, 10);
    const newQuantity = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    setItems(items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity: newQuantity,
          subtotal: newQuantity * (item.unit_price + item.installation_price),
        };
      }
      return item;
    }));
  };

  const handleToggleGalleryFeature = (itemId: string) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, featured_in_gallery: !item.featured_in_gallery } : item
    ));
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
        featured_in_gallery: false,
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

  const handleAddCatalogService = (service: Service) => {
    const existingItem = items.find(item => item.service_id === service.id);
    if (existingItem) {
      handleUpdateItemQuantity(existingItem.id, 1);
      toast.success("Quantidade atualizada!");
    } else {
      const newItem: ProposalItem = {
        id: `service-${Date.now()}`,
        proposal_id: proposal?.id || "",
        device_id: null,
        service_id: service.id,
        device_name: service.name,
        quantity: 1,
        unit_price: service.unit_price,
        installation_price: 0,
        subtotal: service.unit_price,
        featured_in_gallery: false,
      };
      setItems([...items, newItem]);
      toast.success("Serviço adicionado à proposta!");
    }
    setShowAddItem(false);
    setCatalogSearch("");
  };

  const filteredCatalogServices = catalogServices.filter(service =>
    service.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    (service.description && service.description.toLowerCase().includes(catalogSearch.toLowerCase()))
  );

  const handleApplyTemplate = (tpl: ProposalTemplate, tplItems: ProposalTemplateItem[]) => {
    setFormData((prev) => ({
      ...prev,
      title: tpl.title || prev.title,
      introduction: tpl.introduction ?? prev.introduction,
      scope: tpl.scope ?? prev.scope,
      validity_days: tpl.validity_days ?? prev.validity_days,
      payment_terms: tpl.payment_terms ?? prev.payment_terms,
      warranty_terms: tpl.warranty_terms ?? prev.warranty_terms,
      notes: tpl.notes ?? prev.notes,
      discount_percentage: tpl.discount_percentage ?? prev.discount_percentage,
    }));
    const newItems: ProposalItem[] = tplItems.map((it, idx) => ({
      id: `tpl-${idx}-${Date.now()}`,
      proposal_id: proposal?.id || "",
      device_id: it.device_id,
      device_name: it.device_name,
      quantity: it.quantity,
      unit_price: it.unit_price,
      installation_price: it.installation_price,
      subtotal: it.subtotal,
      featured_in_gallery: false,
    }));
    setItems(newItems);
    toast.success(`Template "${tpl.name}" aplicado!`);
  };

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
          service_id: item.service_id,
          device_name: item.device_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          installation_price: item.installation_price,
          subtotal: item.subtotal,
          featured_in_gallery: item.featured_in_gallery,
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
          service_id: item.service_id,
          device_name: item.device_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          installation_price: item.installation_price,
          subtotal: item.subtotal,
          featured_in_gallery: item.featured_in_gallery,
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

  const loadImageAsDataUrl = (url: string): Promise<{ dataUrl: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context indisponível"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL("image/png"), width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url}`));
      img.src = url;
    });
  };

  const handleExportPDF = async () => {
    if (!proposalRef.current) return;

    toast.info("Gerando PDF...");

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Controla se a próxima página precisa de addPage() ou se pode usar a primeira página já criada
      let firstPageUsed = false;
      const ensurePage = () => {
        if (firstPageUsed) {
          pdf.addPage();
        }
        firstPageUsed = true;
      };

      // Add presentation pages (institutional pages) if selected
      if (includePresentationPages && presentationPages.length > 0) {
        for (const page of presentationPages) {
          try {
            const { dataUrl, width, height } = await loadImageAsDataUrl(page.image_url);
            ensurePage();
            const ratio = Math.min(pdfWidth / width, pdfHeight / height);
            const scaledWidth = width * ratio;
            const scaledHeight = height * ratio;
            const x = (pdfWidth - scaledWidth) / 2;
            const y = (pdfHeight - scaledHeight) / 2;
            pdf.addImage(dataUrl, "PNG", x, y, scaledWidth, scaledHeight);
          } catch (error) {
            console.error("Error loading presentation page image:", page.id, error);
          }
        }
      }

      // Margens laterais reduzidas para o conteúdo ocupar melhor a página
      const sideMargin = 8;
      const contentWidth = pdfWidth - 2 * sideMargin;

      // Render proposal content
      const proposalCanvas = await html2canvas(proposalRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const proposalImgData = proposalCanvas.toDataURL("image/png");
      const proposalImgWidth = proposalCanvas.width;
      const proposalImgHeight = proposalCanvas.height;

      // Escala baseada na largura para preencher a página com margens estreitas
      const proposalRatio = contentWidth / proposalImgWidth;
      const proposalScaledHeight = proposalImgHeight * proposalRatio;
      const proposalTotalPages = Math.max(1, Math.ceil(proposalScaledHeight / pdfHeight));

      // Generate proposal pages
      for (let i = 0; i < proposalTotalPages; i++) {
        ensurePage();
        pdf.addImage(
          proposalImgData,
          "PNG",
          sideMargin,
          -i * pdfHeight,
          proposalImgWidth * proposalRatio,
          proposalScaledHeight
        );
      }

      // Add floor plan if selected
      if (includeFloorPlan && floorPlan && floorPlanRef.current) {
        // Wait for PDF to render - increased time for better rendering
        if (floorPlan?.file_type === "application/pdf") {
          // Wait until PDF is loaded or timeout after 3 seconds
          let waitTime = 0;
          while (!floorPlanReady && waitTime < 3000) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitTime += 100;
          }
          // Additional wait for rendering
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        ensurePage();

        const floorPlanCanvas = await html2canvas(floorPlanRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          allowTaint: true,
          imageTimeout: 0,
        });

        const floorPlanImgData = floorPlanCanvas.toDataURL("image/png");
        const floorPlanImgWidth = floorPlanCanvas.width;
        const floorPlanImgHeight = floorPlanCanvas.height;
        
        // Calculate ratio to fit the floor plan within margins
        const margin = 10;
        const availableWidth = pdfWidth - 2 * margin;
        const availableHeight = pdfHeight - 2 * margin;
        const floorPlanRatio = Math.min(availableWidth / floorPlanImgWidth, availableHeight / floorPlanImgHeight);
        const floorPlanImgX = (pdfWidth - floorPlanImgWidth * floorPlanRatio) / 2;
        const floorPlanImgY = margin;

        pdf.addImage(
          floorPlanImgData,
          "PNG",
          floorPlanImgX,
          floorPlanImgY,
          floorPlanImgWidth * floorPlanRatio,
          floorPlanImgHeight * floorPlanRatio
        );
      }

      pdf.save(`${formData.title.replace(/\s+/g, "_")}.pdf`);

      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  const [autoExported, setAutoExported] = useState(false);
  useEffect(() => {
    if (!autoExport || autoExported || loading || !proposal) return;
    const t = setTimeout(() => {
      setAutoExported(true);
      handleExportPDF();
    }, 800);
    return () => clearTimeout(t);
  }, [autoExport, autoExported, loading, proposal]);

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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowUseTemplate(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Usar Template
          </Button>
          <Button variant="outline" onClick={() => setShowSaveTemplate(true)}>
            <BookmarkPlus className="w-4 h-4 mr-2" />
            Salvar como Template
          </Button>
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

          {/* Opção de incluir páginas de apresentação */}
          {presentationPages.length > 0 && (
            <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                id="includePresentationPages"
                checked={includePresentationPages}
                onCheckedChange={(checked) => setIncludePresentationPages(checked as boolean)}
              />
              <div className="flex-1">
                <Label htmlFor="includePresentationPages" className="font-medium cursor-pointer">
                  Incluir páginas de apresentação no PDF
                </Label>
                <p className="text-sm text-muted-foreground">
                  {presentationPages.length} página(s) institucional(is) configurada(s) em Configurações serão
                  adicionadas no início do PDF
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* Opção de incluir planta baixa */}
          {floorPlan && (
            <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                id="includeFloorPlan"
                checked={includeFloorPlan}
                onCheckedChange={(checked) => setIncludeFloorPlan(checked as boolean)}
              />
              <div className="flex-1">
                <Label htmlFor="includeFloorPlan" className="font-medium cursor-pointer">
                  Incluir planta baixa no PDF
                </Label>
                <p className="text-sm text-muted-foreground">
                  A planta com os {floorPlanDevices.length} dispositivos posicionados será adicionada ao final do PDF
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* Logo da Empresa (das configurações) */}
          {companySettings?.header_logo_url && (
            <div>
              <Label>Logo da Empresa (das Configurações)</Label>
              <div className="mt-2 flex items-center gap-4">
                <img
                  src={companySettings.header_logo_url}
                  alt="Logo da empresa"
                  className="h-16 w-auto object-contain border rounded p-1"
                />
                <p className="text-sm text-muted-foreground">
                  Logo configurada nas Configurações da Empresa
                </p>
              </div>
            </div>
          )}

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

            {/* Lista do catálogo */}
            {showAddItem && (
              <div className="p-4 mb-4 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Selecionar do Catálogo</h4>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAddItem(false); setCatalogSearch(""); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Tabs produtos / serviços */}
                <div className="flex gap-1 border-b pb-2">
                  <Button
                    size="sm"
                    variant={catalogTab === "products" ? "default" : "ghost"}
                    onClick={() => { setCatalogTab("products"); setCatalogSearch(""); }}
                  >
                    Produtos
                  </Button>
                  <Button
                    size="sm"
                    variant={catalogTab === "services" ? "default" : "ghost"}
                    onClick={() => { setCatalogTab("services"); setCatalogSearch(""); }}
                  >
                    <Wrench className="w-3 h-3 mr-1" />
                    Serviços
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={catalogTab === "products" ? "Buscar produto..." : "Buscar serviço..."}
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {catalogTab === "products" ? (
                    loadingDevices ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
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
                    )
                  ) : (
                    loadingServices ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
                    ) : filteredCatalogServices.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {catalogSearch ? "Nenhum serviço encontrado" : "Nenhum serviço no catálogo"}
                      </p>
                    ) : (
                      filteredCatalogServices.map((service) => {
                        const isAlreadyAdded = items.some(item => item.service_id === service.id);
                        return (
                          <div
                            key={service.id}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              isAlreadyAdded
                                ? "bg-primary/10 border-primary/30 hover:bg-primary/20"
                                : "bg-background hover:bg-muted"
                            }`}
                            onClick={() => handleAddCatalogService(service)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-muted-foreground" />
                                <p className="font-medium">{service.name}</p>
                                {isAlreadyAdded && (
                                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                    Já adicionado
                                  </span>
                                )}
                              </div>
                              {service.description && (
                                <p className="text-sm text-muted-foreground ml-6 truncate">{service.description}</p>
                              )}
                            </div>
                            <p className="font-medium text-primary ml-4 shrink-0">
                              {formatCurrency(service.unit_price)}
                            </p>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {items.map((item) => {
                const itemDevice = item.device_id ? catalogDevices.find(d => d.id === item.device_id) : undefined;
                return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {item.service_id && <Wrench className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <p className="font-medium">{item.device_name}</p>
                      {item.service_id && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                          Serviço
                        </span>
                      )}
                      {!item.device_id && !item.service_id && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Manual
                        </span>
                      )}
                      {item.featured_in_gallery && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Na galeria
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.unit_price + item.installation_price)} / unid.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {itemDevice?.image_url && (
                      <Button
                        variant={item.featured_in_gallery ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        title="Destacar na galeria de equipamentos"
                        onClick={() => handleToggleGalleryFeature(item.id)}
                      >
                        <ImagePlus className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleUpdateItemQuantity(item.id, -1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleSetItemQuantity(item.id, e.target.value)}
                      className="w-16 h-8 text-center px-1"
                    />
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
                );
              })}
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
            companySettings={companySettings}
            catalogDevices={catalogDevices}
          />
        </Card>
      </div>

      {/* Hidden floor plan preview for PDF export */}
      {includeFloorPlan && floorPlan && (
        <div className="fixed left-[-9999px] top-0">
          <FloorPlanPDFPreview
            ref={floorPlanRef}
            floorPlan={floorPlan}
            floorPlanDevices={floorPlanDevices}
            project={project}
            companySettings={companySettings}
            onPdfLoaded={() => setFloorPlanReady(true)}
          />
        </div>
      )}

      <SaveAsTemplateDialog
        open={showSaveTemplate}
        onOpenChange={setShowSaveTemplate}
        formData={formData}
        items={items}
      />
      <UseTemplateDialog
        open={showUseTemplate}
        onOpenChange={setShowUseTemplate}
        onSelect={handleApplyTemplate}
      />
    </div>

  );
};

export default ProposalEditor;
