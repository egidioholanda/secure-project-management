import { forwardRef } from "react";
import type { Device, ProposalItem } from "@/types/project";
import type { CompanySettings } from "@/hooks/useCompanySettings";

interface ProposalPDFPreviewProps {
  formData: {
    title: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    client_address: string;
    introduction: string;
    scope: string;
    validity_days: number;
    payment_terms: string;
    warranty_terms: string;
    notes: string;
    discount_percentage: number;
  };
  items: ProposalItem[];
  totals: {
    totalDevices: number;
    totalInstallation: number;
    discountAmount: number;
    grandTotal: number;
  };
  companySettings?: CompanySettings | null;
  catalogDevices?: Device[];
}

export const ProposalPDFPreview = forwardRef<HTMLDivElement, ProposalPDFPreviewProps>(
  ({ formData, items, totals, companySettings, catalogDevices }, ref) => {
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);

    const galleryItems = items
      .filter((item) => item.featured_in_gallery && item.device_id)
      .map((item) => ({
        item,
        device: catalogDevices?.find((d) => d.id === item.device_id),
      }))
      .filter((entry): entry is { item: ProposalItem; device: Device } => !!entry.device?.image_url);

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 w-[210mm]"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Header with Logo and Company Info */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-gray-300">
          <div className="flex items-center gap-4">
            {companySettings?.header_logo_url && (
              <img
                src={companySettings.header_logo_url}
                alt="Logo da Empresa"
                className="h-16 w-auto object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{formData.title}</h1>
              <p className="text-gray-600">Proposta Comercial</p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Data: {new Date().toLocaleDateString("pt-BR")}</p>
            <p>Validade: {formData.validity_days} dias</p>
          </div>
        </div>

        {/* Company Info Section */}
        {companySettings && (companySettings.company_name || companySettings.cnpj) && (
          <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {companySettings.company_name && (
                <p className="text-gray-700"><strong>Empresa:</strong> {companySettings.company_name}</p>
              )}
              {companySettings.cnpj && (
                <p className="text-gray-700"><strong>CNPJ:</strong> {companySettings.cnpj}</p>
              )}
              {companySettings.responsible_name && (
                <p className="text-gray-700"><strong>Responsável:</strong> {companySettings.responsible_name}</p>
              )}
              {companySettings.contact && (
                <p className="text-gray-700"><strong>Contato:</strong> {companySettings.contact}</p>
              )}
              {companySettings.email && (
                <p className="text-gray-700"><strong>E-mail:</strong> {companySettings.email}</p>
              )}
            </div>
          </div>
        )}

        {/* Client Info */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
            Dados do Cliente
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Nome/Empresa:</p>
              <p className="font-medium text-gray-800">{formData.client_name}</p>
            </div>
            {formData.client_address && (
              <div>
                <p className="text-gray-600">Endereço:</p>
                <p className="font-medium text-gray-800">{formData.client_address}</p>
              </div>
            )}
            {formData.client_email && (
              <div>
                <p className="text-gray-600">E-mail:</p>
                <p className="font-medium text-gray-800">{formData.client_email}</p>
              </div>
            )}
            {formData.client_phone && (
              <div>
                <p className="text-gray-600">Telefone:</p>
                <p className="font-medium text-gray-800">{formData.client_phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Introduction */}
        {formData.introduction && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
              Apresentação
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {formData.introduction}
            </p>
          </div>
        )}

        {/* Scope */}
        {formData.scope && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
              Escopo do Projeto
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {formData.scope}
            </p>
          </div>
        )}

        {/* Equipment Gallery */}
        {galleryItems.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 border-b border-gray-200 pb-1">
              Equipamentos em Destaque
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {galleryItems.map(({ item, device }) => (
                <div key={item.id} className="text-center">
                  <img
                    src={device.image_url!}
                    alt={item.device_name}
                    className="w-full aspect-square object-cover rounded border border-gray-200"
                  />
                  <p className="text-xs text-gray-700 mt-1">{item.device_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
            Itens da Proposta
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 border border-gray-300">Item</th>
                <th className="text-center p-2 border border-gray-300">Qtd</th>
                <th className="text-right p-2 border border-gray-300">Valor Unit.</th>
                <th className="text-right p-2 border border-gray-300">Instalação</th>
                <th className="text-right p-2 border border-gray-300">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="p-2 border border-gray-300">{item.device_name}</td>
                  <td className="p-2 border border-gray-300 text-center">{item.quantity}</td>
                  <td className="p-2 border border-gray-300 text-right">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="p-2 border border-gray-300 text-right">
                    {formatCurrency(item.installation_price)}
                  </td>
                  <td className="p-2 border border-gray-300 text-right font-medium">
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mb-6 bg-gray-50 p-4 rounded border border-gray-200">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Equipamentos:</span>
              <span className="text-gray-800">{formatCurrency(totals.totalDevices)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Instalação:</span>
              <span className="text-gray-800">{formatCurrency(totals.totalInstallation)}</span>
            </div>
            {formData.discount_percentage > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Desconto ({formData.discount_percentage}%):</span>
                <span>-{formatCurrency(totals.discountAmount)}</span>
              </div>
            )}
            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-800">VALOR TOTAL:</span>
                <span className="text-gray-900">{formatCurrency(totals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms Section */}
        <div className="mb-6 grid grid-cols-2 gap-6">
          {formData.payment_terms && (
            <div>
              <h3 className="font-bold text-gray-800 mb-1 text-sm">Condições de Pagamento</h3>
              <p className="text-xs text-gray-700 leading-relaxed">{formData.payment_terms}</p>
            </div>
          )}
          {formData.warranty_terms && (
            <div>
              <h3 className="font-bold text-gray-800 mb-1 text-sm">Garantia</h3>
              <p className="text-xs text-gray-700 leading-relaxed">{formData.warranty_terms}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {formData.notes && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
              Observações
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {formData.notes}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          <p>
            Proposta válida por {formData.validity_days} dias • Gerado automaticamente pelo SecureProject
          </p>
          {companySettings?.footer_logo_url && (
            <img
              src={companySettings.footer_logo_url}
              alt="Logo rodapé"
              className="h-8 w-auto object-contain mx-auto mt-2"
            />
          )}
        </div>
      </div>
    );
  }
);

ProposalPDFPreview.displayName = "ProposalPDFPreview";
