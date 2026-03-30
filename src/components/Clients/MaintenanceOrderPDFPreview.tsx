import { forwardRef } from "react";
import { MaintenanceOrder, Client } from "@/hooks/useClients";
import { CompanySettings } from "@/hooks/useCompanySettings";
import { format } from "date-fns";

interface Props {
  order: MaintenanceOrder;
  client: Client;
  companySettings: CompanySettings | null;
}

const typeLabel: Record<string, string> = { preventive: "Preventiva", corrective: "Corretiva" };
const statusLabel: Record<string, string> = { scheduled: "Agendada", in_progress: "Em Andamento", completed: "Concluída", cancelled: "Cancelada" };

export const MaintenanceOrderPDFPreview = forwardRef<HTMLDivElement, Props>(
  ({ order, client, companySettings }, ref) => {
    const fmtDate = (d: string | null) => d ? format(new Date(d + "T00:00"), "dd/MM/yyyy") : "—";

    return (
      <div
        ref={ref}
        style={{
          width: "794px",
          minHeight: "1123px",
          padding: "40px",
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#1e293b",
          backgroundColor: "#ffffff",
          position: "absolute",
          left: "-9999px",
          top: 0,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid #1e40af", paddingBottom: "16px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {companySettings?.header_logo_url && (
              <img src={companySettings.header_logo_url} alt="Logo" style={{ maxHeight: "50px", maxWidth: "120px", objectFit: "contain" }} crossOrigin="anonymous" />
            )}
            <div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1e40af" }}>
                {companySettings?.company_name || "Empresa"}
              </div>
              {companySettings?.cnpj && <div style={{ fontSize: "10px", color: "#64748b" }}>CNPJ: {companySettings.cnpj}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#1e40af" }}>ORDEM DE SERVIÇO</div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Emitido em {format(new Date(), "dd/MM/yyyy")}</div>
          </div>
        </div>

        {/* Title & status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>{order.title}</div>
          <div style={{
            padding: "4px 12px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "bold",
            backgroundColor: order.status === "completed" ? "#dcfce7" : order.status === "in_progress" ? "#fef9c3" : order.status === "cancelled" ? "#fee2e2" : "#dbeafe",
            color: order.status === "completed" ? "#166534" : order.status === "in_progress" ? "#854d0e" : order.status === "cancelled" ? "#991b1b" : "#1e40af",
          }}>
            {statusLabel[order.status] || order.status}
          </div>
        </div>

        {/* Info grid */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
          <tbody>
            <tr>
              <td style={cellStyle}>
                <div style={labelStyle}>Tipo</div>
                <div style={valueStyle}>{typeLabel[order.type] || order.type}</div>
              </td>
              <td style={cellStyle}>
                <div style={labelStyle}>Técnico Responsável</div>
                <div style={valueStyle}>{order.technician || "—"}</div>
              </td>
            </tr>
            <tr>
              <td style={cellStyle}>
                <div style={labelStyle}>Data Agendada</div>
                <div style={valueStyle}>{fmtDate(order.scheduled_date)}</div>
              </td>
              <td style={cellStyle}>
                <div style={labelStyle}>Data de Conclusão</div>
                <div style={valueStyle}>{fmtDate(order.completed_date)}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Client section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>DADOS DO CLIENTE</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={cellStyle}>
                  <div style={labelStyle}>Nome</div>
                  <div style={valueStyle}>{client.name}</div>
                </td>
                <td style={cellStyle}>
                  <div style={labelStyle}>CNPJ</div>
                  <div style={valueStyle}>{client.cnpj || "—"}</div>
                </td>
              </tr>
              <tr>
                <td style={cellStyle}>
                  <div style={labelStyle}>Contato</div>
                  <div style={valueStyle}>{client.contact_name || "—"}</div>
                </td>
                <td style={cellStyle}>
                  <div style={labelStyle}>Telefone</div>
                  <div style={valueStyle}>{client.phone || "—"}</div>
                </td>
              </tr>
              <tr>
                <td style={cellStyle} colSpan={2}>
                  <div style={labelStyle}>Endereço</div>
                  <div style={valueStyle}>{client.address || "—"}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Description */}
        {order.description && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>DESCRIÇÃO DO SERVIÇO</div>
            <div style={{ padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "4px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
              {order.description}
            </div>
          </div>
        )}

        {/* Equipment */}
        {order.equipment_attended && order.equipment_attended.length > 0 && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>EQUIPAMENTOS ATENDIDOS</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: "40px" }}>#</th>
                  <th style={thStyle}>Equipamento</th>
                </tr>
              </thead>
              <tbody>
                {order.equipment_attended.map((eq, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{eq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Observations */}
        {order.observations && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>OBSERVAÇÕES</div>
            <div style={{ padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "4px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
              {order.observations}
            </div>
          </div>
        )}

        {/* Photos */}
        {order.photos && order.photos.length > 0 && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>REGISTRO FOTOGRÁFICO</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {order.photos.map((photo) => (
                <img
                  key={photo.id}
                  src={photo.url}
                  alt={photo.caption || "Foto"}
                  style={{ width: "160px", height: "120px", objectFit: "cover", borderRadius: "4px", border: "1px solid #e2e8f0" }}
                  crossOrigin="anonymous"
                />
              ))}
            </div>
          </div>
        )}

        {/* Signature */}
        <div style={{ ...sectionStyle, marginTop: "32px" }}>
          <div style={sectionTitleStyle}>ASSINATURA DO CLIENTE</div>
          {order.signature_url ? (
            <div style={{ textAlign: "center" }}>
              <img
                src={order.signature_url}
                alt="Assinatura"
                style={{ maxHeight: "80px", margin: "0 auto", display: "block" }}
                crossOrigin="anonymous"
              />
              <div style={{ borderTop: "1px solid #94a3b8", width: "300px", margin: "8px auto 0", paddingTop: "4px", fontSize: "10px", color: "#64748b" }}>
                {client.contact_name || client.name}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <div style={{ borderBottom: "1px solid #94a3b8", width: "300px", margin: "40px auto 4px" }} />
              <div style={{ fontSize: "10px", color: "#64748b" }}>
                {client.contact_name || client.name}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ position: "absolute", bottom: "30px", left: "40px", right: "40px", borderTop: "1px solid #e2e8f0", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94a3b8" }}>
          <span>{companySettings?.company_name} {companySettings?.contact ? `• ${companySettings.contact}` : ""} {companySettings?.email ? `• ${companySettings.email}` : ""}</span>
          <span>Gerado em {format(new Date(), "dd/MM/yyyy HH:mm")}</span>
        </div>
      </div>
    );
  }
);

MaintenanceOrderPDFPreview.displayName = "MaintenanceOrderPDFPreview";

const labelStyle: React.CSSProperties = { fontSize: "9px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold", marginBottom: "2px" };
const valueStyle: React.CSSProperties = { fontSize: "12px", fontWeight: 500 };
const cellStyle: React.CSSProperties = { padding: "8px 12px", verticalAlign: "top", border: "1px solid #e2e8f0" };
const sectionStyle: React.CSSProperties = { marginBottom: "20px" };
const sectionTitleStyle: React.CSSProperties = { fontSize: "11px", fontWeight: "bold", color: "#1e40af", borderBottom: "2px solid #1e40af", paddingBottom: "4px", marginBottom: "10px", textTransform: "uppercase" };
const thStyle: React.CSSProperties = { padding: "6px 12px", backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0", fontSize: "10px", fontWeight: "bold", textAlign: "left", textTransform: "uppercase", color: "#475569" };
const tdStyle: React.CSSProperties = { padding: "6px 12px", border: "1px solid #e2e8f0", fontSize: "11px" };
