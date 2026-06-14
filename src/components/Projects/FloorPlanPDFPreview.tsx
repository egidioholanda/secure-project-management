import { forwardRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PlacedDevice, FloorPlan, Project } from "@/types/project";
import type { CompanySettings } from "@/hooks/useCompanySettings";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FloorPlanPDFPreviewProps {
  floorPlan: FloorPlan;
  floorPlanDevices: PlacedDevice[];
  project: Project;
  companySettings?: CompanySettings | null;
  currentPage?: number;
  onPdfLoaded?: () => void;
}

export const FloorPlanPDFPreview = forwardRef<HTMLDivElement, FloorPlanPDFPreviewProps>(
  ({ floorPlan, floorPlanDevices, project, companySettings, currentPage = 1, onPdfLoaded }, ref) => {
    const [pdfLoaded, setPdfLoaded] = useState(false);

    const handlePdfLoadSuccess = () => {
      setPdfLoaded(true);
      onPdfLoaded?.();
    };

    const isPDF = floorPlan.file_type === "application/pdf";

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8"
        style={{ 
          fontFamily: "Arial, sans-serif",
          width: "210mm",
          minHeight: "297mm",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-300">
          <div className="flex items-center gap-4">
            {companySettings?.header_logo_url && (
              <img
                src={companySettings.header_logo_url}
                alt="Logo da Empresa"
                className="h-14 w-auto object-contain"
                crossOrigin="anonymous"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Planta Baixa - {project.name}</h1>
              <p className="text-gray-600">Layout dos Dispositivos</p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p><strong>Cliente:</strong> {project.client}</p>
            <p><strong>Data:</strong> {new Date().toLocaleDateString("pt-BR")}</p>
          </div>
        </div>

        {/* Floor Plan Image with Devices */}
        <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden mb-6 bg-gray-50">
          {isPDF ? (
            <div className="relative" style={{ minHeight: "600px" }}>
              <Document
                file={floorPlan.file_url}
                onLoadSuccess={handlePdfLoadSuccess}
                loading={
                  <div className="flex items-center justify-center h-[600px]">
                    <p className="text-gray-500">Carregando planta...</p>
                  </div>
                }
                error={
                  <div className="flex items-center justify-center h-[600px]">
                    <p className="text-red-500">Erro ao carregar planta</p>
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  width={700}
                />
              </Document>
              {/* Device markers for PDF */}
              {pdfLoaded && floorPlanDevices.map((device, index) => (
                <div
                  key={device.id}
                  className="absolute w-8 h-8 bg-blue-600 rounded-full border-3 border-white shadow-xl flex items-center justify-center"
                  style={{
                    left: `${(device.x_position / 800) * 100}%`,
                    top: `${(device.y_position / 600) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <span className="text-white text-sm font-bold">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              <img
                src={floorPlan.file_url}
                alt="Planta Baixa"
                className="w-full h-auto"
                style={{ maxHeight: "600px", objectFit: "contain" }}
                crossOrigin="anonymous"
              />
              {/* Device markers for images */}
              {floorPlanDevices.map((device, index) => (
                <div
                  key={device.id}
                  className="absolute w-8 h-8 bg-blue-600 rounded-full border-3 border-white shadow-xl flex items-center justify-center"
                  style={{
                    left: `${(device.x_position / 800) * 100}%`,
                    top: `${(device.y_position / 600) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <span className="text-white text-sm font-bold">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Legend + Summary — only when there are placed devices */}
        {floorPlanDevices.length > 0 && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
                Legenda dos Dispositivos
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {floorPlanDevices.map((device, index) => (
                  <div key={device.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-gray-800 font-medium text-sm">{device.device?.name || "Dispositivo"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-gray-100 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-3 text-lg">Resumo dos Equipamentos</h3>
              <p className="text-gray-700 mb-3">
                Total de dispositivos posicionados: <strong className="text-blue-600">{floorPlanDevices.length}</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  floorPlanDevices.reduce((acc, d) => {
                    const name = d.device?.name || "Dispositivo";
                    acc[name] = (acc[name] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([name, count]) => (
                  <span
                    key={name}
                    className="px-3 py-1.5 bg-white text-gray-700 rounded-full text-sm border border-gray-300 font-medium"
                  >
                    {count}x {name}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="pt-6 mt-8 border-t-2 border-gray-300 text-sm text-gray-500 text-center">
          <p>Documento gerado automaticamente pelo SecureProject</p>
          {companySettings?.footer_logo_url && (
            <img
              src={companySettings.footer_logo_url}
              alt="Logo rodapé"
              className="h-8 w-auto object-contain mx-auto mt-3"
              crossOrigin="anonymous"
            />
          )}
        </div>
      </div>
    );
  }
);

FloorPlanPDFPreview.displayName = "FloorPlanPDFPreview";
