export interface Project {
  id: string;
  name: string;
  client: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  manager: string;
  /** total do projeto; quando há split, é produto + serviço */
  value: number;
  address?: string;
  opportunityId?: string;
  clientId?: string | null;
  clientGroupId?: string | null;
  /** ISO — data de cadastro no sistema */
  createdAt?: string;
  /**
   * Produto e serviço são dois pedidos do mesmo projeto, faturados em
   * momentos diferentes: o material na fase 5 e a NF de serviço na fase 10
   * do pipeline de faturamento.
   */
  productValue?: number | null;
  serviceValue?: number | null;
}

export interface DeviceCategory {
  id: string;
  name: string;
  icon: string | null;
}

export interface Device {
  id: string;
  category_id: string | null;
  name: string;
  model: string | null;
  brand: string | null;
  description: string | null;
  unit_price: number;
  installation_price: number;
  icon: string | null;
  specifications: Record<string, unknown> | null;
  image_url: string | null;
}

export interface FloorPlan {
  id: string;
  project_id: string;
  name: string;
  file_url: string;
  file_type: string;
  width: number | null;
  height: number | null;
}

export interface PlacedDevice {
  id: string;
  floor_plan_id: string;
  device_id: string;
  x_position: number;
  y_position: number;
  rotation: number;
  notes: string | null;
  scale: number;
  device?: Device;
}

export interface Proposal {
  id: string;
  project_id: string;
  title: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  introduction: string | null;
  scope: string | null;
  validity_days: number;
  payment_terms: string | null;
  warranty_terms: string | null;
  notes: string | null;
  discount_percentage: number;
  total_devices: number;
  total_installation: number;
  total_discount: number;
  grand_total: number;
  status: string;
}

export interface ProposalItem {
  id: string;
  proposal_id: string;
  device_id: string | null;
  service_id: string | null;
  device_name: string;
  quantity: number;
  unit_price: number;
  installation_price: number;
  subtotal: number;
  featured_in_gallery: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  unit_price: number;
}

export interface PresentationPage {
  id: string;
  title: string;
  source_type: "image" | "docx" | "pdf";
  image_url: string | null;
  file_url: string | null;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}
