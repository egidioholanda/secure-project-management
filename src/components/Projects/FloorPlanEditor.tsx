import { useState, useRef, useEffect } from "react";
import { Upload, ZoomIn, ZoomOut, FileText, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Device, FloorPlan, PlacedDevice } from "@/types/project";
import DeviceCatalog from "./DeviceCatalog";
import PlacedDeviceMarker from "./PlacedDeviceMarker";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Use locally bundled worker so script-src 'self' CSP is satisfied
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface FloorPlanEditorProps {
  projectId: string;
  projectName: string;
  onGenerateProposal: (placedDevices: PlacedDevice[]) => void;
}

const FloorPlanEditor = ({ projectId, projectName, onGenerateProposal }: FloorPlanEditorProps) => {
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [placedDevices, setPlacedDevices] = useState<PlacedDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const extractFilePath = (url: string): string | null => {
    const match = url.match(/\/floor-plans\/(.+?)(\?|$)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  // Download via SDK (auth token included automatically) and set display state.
  // PDFs: stored as ArrayBuffer and passed directly to <Document> — no browser fetch needed.
  // Images: stored as a blob URL for <img src>.
  const loadFileForDisplay = async (storedUrl: string, fileType: string) => {
    const filePath = extractFilePath(storedUrl);
    if (!filePath) { setDisplayUrl(storedUrl); return; }

    const { data: blob, error } = await supabase.storage
      .from("floor-plans")
      .download(filePath);

    if (error || !blob) {
      // Fallback: try a signed URL
      const { data: signData } = await supabase.storage
        .from("floor-plans")
        .createSignedUrl(filePath, 3600);
      setDisplayUrl(signData?.signedUrl ?? storedUrl);
      return;
    }

    if (fileType === "application/pdf") {
      const buffer = await blob.arrayBuffer();
      setPdfData(buffer);
      setDisplayUrl(null);
    } else {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setPdfData(null);
      setDisplayUrl(url);
    }
  };

  useEffect(() => {
    loadFloorPlan();
  }, [projectId]);

  // Revoke blob URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); };
  }, []);

  const loadFloorPlan = async () => {
    try {
      const { data: floorPlanData, error: floorPlanError } = await supabase
        .from("project_floor_plans")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (floorPlanError) throw floorPlanError;

      if (floorPlanData) {
        const plan = floorPlanData as FloorPlan;
        setFloorPlan(plan);
        await loadFileForDisplay(plan.file_url, plan.file_type);

        const { data: devicesData, error: devicesError } = await supabase
          .from("floor_plan_devices")
          .select("*, device:devices(*)")
          .eq("floor_plan_id", plan.id);

        if (devicesError) throw devicesError;
        setPlacedDevices(devicesData as PlacedDevice[]);
      }
    } catch (error) {
      console.error("Error loading floor plan:", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG ou PDF.");
      return;
    }

    setLoading(true);
    try {
      const fileName = `${projectId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("floor-plans")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("floor-plans")
        .getPublicUrl(fileName);

      const { data: newFloorPlan, error: insertError } = await supabase
        .from("project_floor_plans")
        .insert({
          project_id: projectId,
          name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const plan = newFloorPlan as FloorPlan;
      setFloorPlan(plan);
      setPlacedDevices([]);
      await loadFileForDisplay(plan.file_url, plan.file_type);
      toast.success("Planta baixa importada com sucesso!");
    } catch (error) {
      console.error("Error uploading floor plan:", error);
      toast.error("Erro ao importar planta baixa");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFloorPlan = async () => {
    if (!floorPlan) return;

    setLoading(true);
    try {
      // Extract file path from URL to delete from storage
      const urlParts = floorPlan.file_url.split("/floor-plans/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("floor-plans").remove([filePath]);
      }

      // Delete floor plan record (devices will cascade delete)
      const { error } = await supabase
        .from("project_floor_plans")
        .delete()
        .eq("id", floorPlan.id);

      if (error) throw error;

      setFloorPlan(null);
      setDisplayUrl(null);
      setPdfData(null);
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
      setPlacedDevices([]);
      setCurrentPage(1);
      setNumPages(1);
      toast.success("Planta baixa excluída com sucesso!");
    } catch (error) {
      console.error("Error deleting floor plan:", error);
      toast.error("Erro ao excluir planta baixa");
    } finally {
      setLoading(false);
    }
  };

  const handleCanvasClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedDevice || !floorPlan || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / zoom);
    const y = ((event.clientY - rect.top) / zoom);

    try {
      const { data, error } = await supabase
        .from("floor_plan_devices")
        .insert({
          floor_plan_id: floorPlan.id,
          device_id: selectedDevice.id,
          x_position: x,
          y_position: y,
          rotation: 0,
        })
        .select("*, device:devices(*)")
        .single();

      if (error) throw error;

      setPlacedDevices([...placedDevices, data as PlacedDevice]);
      toast.success(`${selectedDevice.name} posicionado!`);
    } catch (error) {
      console.error("Error placing device:", error);
      toast.error("Erro ao posicionar dispositivo");
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from("floor_plan_devices")
        .delete()
        .eq("id", deviceId);

      if (error) throw error;

      setPlacedDevices(placedDevices.filter((d) => d.id !== deviceId));
      toast.success("Dispositivo removido!");
    } catch (error) {
      console.error("Error deleting device:", error);
      toast.error("Erro ao remover dispositivo");
    }
  };

  const handleRotateDevice = async (deviceId: string) => {
    const device = placedDevices.find((d) => d.id === deviceId);
    if (!device) return;

    const newRotation = (device.rotation + 45) % 360;

    try {
      const { error } = await supabase
        .from("floor_plan_devices")
        .update({ rotation: newRotation })
        .eq("id", deviceId);

      if (error) throw error;

      setPlacedDevices(
        placedDevices.map((d) =>
          d.id === deviceId ? { ...d, rotation: newRotation } : d
        )
      );
    } catch (error) {
      console.error("Error rotating device:", error);
    }
  };

  const handleDragDevice = async (deviceId: string, x: number, y: number) => {
    try {
      const { error } = await supabase
        .from("floor_plan_devices")
        .update({ x_position: x, y_position: y })
        .eq("id", deviceId);

      if (error) throw error;

      setPlacedDevices(
        placedDevices.map((d) =>
          d.id === deviceId ? { ...d, x_position: x, y_position: y } : d
        )
      );
    } catch (error) {
      console.error("Error moving device:", error);
    }
  };

  const handleScaleDevice = async (deviceId: string, scale: number) => {
    try {
      const { error } = await supabase
        .from("floor_plan_devices")
        .update({ scale })
        .eq("id", deviceId);

      if (error) throw error;

      setPlacedDevices(
        placedDevices.map((d) =>
          d.id === deviceId ? { ...d, scale } : d
        )
      );
    } catch (error) {
      console.error("Error scaling device:", error);
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* Catálogo de Dispositivos */}
      <DeviceCatalog
        selectedDevice={selectedDevice}
        onSelectDevice={setSelectedDevice}
      />

      {/* Editor da Planta */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".png,.jpg,.jpeg,.pdf"
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {loading ? "Importando..." : "Importar Planta"}
            </Button>
            {floorPlan && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={loading}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Planta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir planta baixa?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. A planta baixa e todos os {placedDevices.length} dispositivos posicionados serão removidos permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteFloorPlan}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="flex items-center text-sm text-muted-foreground px-2">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => onGenerateProposal(placedDevices)}
              className="bg-gradient-primary"
            >
              <FileText className="w-4 h-4 mr-2" />
              Gerar Proposta
            </Button>
          </div>
        </div>

        {/* Canvas da Planta */}
        <Card className="flex-1 overflow-auto relative bg-muted/30">
          {floorPlan && (displayUrl !== null || pdfData !== null) ? (
            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="relative min-h-full cursor-crosshair"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
              {floorPlan.file_type === "application/pdf" ? (
                <div className="relative">
                  <Document
                    file={pdfData ? { data: pdfData } : (displayUrl ?? '')}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                      <div className="flex items-center justify-center h-[600px]">
                        <p className="text-muted-foreground">Carregando PDF...</p>
                      </div>
                    }
                    error={
                      <div className="flex items-center justify-center h-[600px]">
                        <p className="text-destructive">Erro ao carregar PDF</p>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={currentPage}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      width={800}
                    />
                  </Document>
                  {numPages > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/90 backdrop-blur px-3 py-1.5 rounded-full shadow-lg border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPage((p) => Math.max(1, p - 1));
                        }}
                        disabled={currentPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium min-w-[60px] text-center">
                        {currentPage} / {numPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPage((p) => Math.min(numPages, p + 1));
                        }}
                        disabled={currentPage >= numPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <img
                  src={displayUrl}
                  alt="Planta Baixa"
                  className="max-w-none"
                  draggable={false}
                />
              )}

              {/* Dispositivos posicionados */}
              {placedDevices.map((placed) => (
                <PlacedDeviceMarker
                  key={placed.id}
                  placedDevice={placed}
                  onDelete={() => handleDeleteDevice(placed.id)}
                  onRotate={() => handleRotateDevice(placed.id)}
                  onDrag={(x, y) => handleDragDevice(placed.id, x, y)}
                  onScaleChange={(scale) => handleScaleDevice(placed.id, scale)}
                  zoom={zoom}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
              <Upload className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">Nenhuma planta importada</p>
              <p className="text-sm text-center mb-4">
                Importe uma planta baixa em PNG, JPG ou PDF, ou gere a proposta diretamente sem planta
              </p>
              <div className="flex gap-2">
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Planta
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onGenerateProposal([])}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar Proposta sem Planta
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Resumo de dispositivos */}
        {placedDevices.length > 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">
              Dispositivos posicionados: {placedDevices.length}
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(
                placedDevices.reduce((acc, d) => {
                  const name = d.device?.name || "Dispositivo";
                  acc[name] = (acc[name] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([name, count]) => (
                <span
                  key={name}
                  className="px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                >
                  {count}x {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloorPlanEditor;
